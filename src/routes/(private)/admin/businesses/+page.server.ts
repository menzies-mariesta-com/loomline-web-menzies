import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import {
	appointment,
	business,
	industryPack,
	platformConfigProfile,
	ticket,
	transfer
} from '#lib/server/db/schema';
import { requirePlatformAdmin } from '#lib/server/qms/guards';
import { ensureConfigProfilesSeeded, getConfigProfile } from '#lib/server/qms/config-profiles';
import { writeAudit } from '#lib/server/qms/audit';
import { provisionOwnerBusiness } from '#lib/server/qms/provision-owner-business';
import { saveOrgImage } from '#lib/server/upload/org-image';
import {
	isPaidPlanKey,
	isTrialDuration,
	parsePlanKey,
	trialEndsAtFrom,
	type TrialDuration
} from '#lib/tool/plans';

const BUSINESS_STATUSES = new Set(['active', 'suspended', 'pending', 'inactive', 'trial_expired']);

export const load: PageServerLoad = async ({ locals }) => {
	await requirePlatformAdmin(locals.user);
	await ensureConfigProfilesSeeded();

	const businesses = await db.query.business.findMany({
		orderBy: [desc(business.createdAt)],
		with: { industryPack: true, config: true }
	});
	const templates = await db.query.industryPack.findMany({
		orderBy: [desc(industryPack.name)]
	});
	const configs = await db.query.platformConfigProfile.findMany({
		orderBy: [desc(platformConfigProfile.name)]
	});

	return { businesses, templates, configs };
};

export const actions: Actions = {
	createBusiness: async ({ request, locals }) => {
		const admin = await requirePlatformAdmin(locals.user);
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const packId = String(form.get('industryPackId') ?? '').trim();
		const configIdRaw = String(form.get('configId') ?? '').trim();
		const managerEmail = String(form.get('managerEmail') ?? form.get('ownerEmail') ?? '')
			.trim()
			.toLowerCase();
		const timezoneOverride = String(form.get('timezone') ?? '').trim();
		const accessKindRaw = String(form.get('accessKind') ?? 'plan').trim();
		const planKey = String(form.get('planKey') ?? '').trim();
		const trialDuration = String(form.get('trialDuration') ?? '').trim();
		const imageFile = form.get('image');

		if (!name || !packId || !managerEmail) {
			return fail(400, {
				message: 'Name, template, and manager email are required.',
				success: false
			});
		}

		const accessKind = accessKindRaw === 'trial' ? 'trial' : 'plan';
		if (accessKind === 'trial') {
			if (!isTrialDuration(trialDuration)) {
				return fail(400, {
					message: 'Trial duration must be 7 days, 2 weeks, or 1 month.',
					success: false
				});
			}
		} else if (!isPaidPlanKey(planKey)) {
			return fail(400, {
				message: 'Select a Cloud or On-premise paying plan.',
				success: false
			});
		}

		let imageUrl: string | null = null;
		if (imageFile instanceof File && imageFile.size > 0) {
			try {
				imageUrl = await saveOrgImage(imageFile);
			} catch (e) {
				const msg = e instanceof Error ? e.message : 'Image upload failed.';
				return fail(400, { message: msg, success: false });
			}
		}

		const provisioned = await provisionOwnerBusiness({
			actorUserId: admin.id,
			businessName: name,
			ownerEmail: managerEmail,
			industryPackId: packId,
			configId: configIdRaw || null,
			timezoneOverride: timezoneOverride || undefined,
			imageUrl,
			accessKind,
			planKey: accessKind === 'plan' ? planKey : null,
			trialDuration: accessKind === 'trial' ? trialDuration : null
		});

		if (!provisioned.ok) {
			return fail(400, { message: provisioned.message, success: false });
		}

		const inviteNote = provisioned.inviteDelivered
			? provisioned.loggedOnly
				? `Invite queued for ${managerEmail} (link logged on server; set SMTP_* to email it).`
				: `Invite sent to ${managerEmail}.`
			: `Invite created for ${managerEmail}, but email failed. Check SMTP_* and resend from Invites.`;

		return {
			success: provisioned.inviteDelivered,
			message: `Business ${provisioned.business.name} created. ${inviteNote}`
		};
	},

	suspendBusiness: async ({ request, locals }) => {
		const admin = await requirePlatformAdmin(locals.user);
		const form = await request.formData();
		const id = String(form.get('businessId') ?? '');
		await db.update(business).set({ status: 'suspended' }).where(eq(business.id, id));
		await writeAudit({
			actorUserId: admin.id,
			businessId: id,
			action: 'business.suspend',
			entityType: 'business',
			entityId: id
		});
		return { success: true, message: 'Business suspended.' };
	},

	activateBusiness: async ({ request, locals }) => {
		const admin = await requirePlatformAdmin(locals.user);
		const form = await request.formData();
		const id = String(form.get('businessId') ?? '');
		await db.update(business).set({ status: 'active' }).where(eq(business.id, id));
		await writeAudit({
			actorUserId: admin.id,
			businessId: id,
			action: 'business.activate',
			entityType: 'business',
			entityId: id
		});
		return { success: true, message: 'Business activated.' };
	},

	updateBusiness: async ({ request, locals }) => {
		const admin = await requirePlatformAdmin(locals.user);
		const form = await request.formData();
		const id = String(form.get('businessId') ?? '').trim();
		const name = String(form.get('name') ?? '').trim();
		const packId = String(form.get('industryPackId') ?? '').trim();
		const configIdRaw = String(form.get('configId') ?? '').trim();
		const timezoneOverride = String(form.get('timezone') ?? '').trim();
		const statusRaw = String(form.get('status') ?? '').trim();
		const accessKindRaw = String(form.get('accessKind') ?? '').trim();
		const planKeyRaw = String(form.get('planKey') ?? '').trim();
		const trialDurationRaw = String(form.get('trialDuration') ?? '').trim();
		const imageFile = form.get('image');

		if (!id || !name) {
			return fail(400, { message: 'Business id and name are required.', success: false });
		}

		const existing = await db.query.business.findFirst({ where: eq(business.id, id) });
		if (!existing) return fail(404, { message: 'Business not found.', success: false });

		if (statusRaw && !BUSINESS_STATUSES.has(statusRaw)) {
			return fail(400, { message: 'Invalid status.', success: false });
		}

		const accessKind =
			accessKindRaw === 'trial'
				? 'trial'
				: accessKindRaw === 'plan'
					? 'plan'
					: existing.planKey === 'trial'
						? 'trial'
						: 'plan';

		let nextPlanKey = existing.planKey;
		let nextServiceMode = existing.serviceMode;
		let nextTrialDuration: TrialDuration | null = existing.trialDuration ?? null;
		let nextTrialEndsAt: Date | null = existing.trialEndsAt ?? null;

		if (accessKind === 'trial') {
			if (!isTrialDuration(trialDurationRaw)) {
				return fail(400, {
					message: 'Trial duration must be 7 days, 2 weeks, or 1 month.',
					success: false
				});
			}
			nextPlanKey = 'trial';
			nextServiceMode = 'cloud';
			if (existing.trialDuration !== trialDurationRaw || !existing.trialEndsAt) {
				nextTrialEndsAt = trialEndsAtFrom(trialDurationRaw);
			}
			nextTrialDuration = trialDurationRaw;
		} else {
			if (!isPaidPlanKey(planKeyRaw)) {
				return fail(400, {
					message: 'Select a Cloud or On-premise paying plan.',
					success: false
				});
			}
			nextPlanKey = planKeyRaw;
			nextServiceMode = parsePlanKey(planKeyRaw)?.mode ?? null;
			nextTrialDuration = null;
			nextTrialEndsAt = null;
		}

		let timezone = timezoneOverride || existing.timezone;
		let localeDefault = existing.localeDefault;
		let configId: string | null = configIdRaw || null;
		let branding = { ...(existing.branding ?? {}) };

		if (configId) {
			const profile = await getConfigProfile(configId);
			if (!profile) {
				return fail(400, { message: 'Selected config was not found.', success: false });
			}
			timezone = timezoneOverride || profile.timezone;
			localeDefault = profile.locale;
			branding = {
				...branding,
				dateFormat: profile.dateFormat,
				timeFormat: profile.timeFormat,
				currency: profile.currency
			};
		} else if (timezoneOverride) {
			timezone = timezoneOverride;
		}

		let imageUrl = existing.imageUrl;
		if (imageFile instanceof File && imageFile.size > 0) {
			try {
				imageUrl = await saveOrgImage(imageFile);
			} catch (e) {
				const msg = e instanceof Error ? e.message : 'Image upload failed.';
				return fail(400, { message: msg, success: false });
			}
		}

		const [row] = await db
			.update(business)
			.set({
				name,
				timezone,
				localeDefault,
				status: (statusRaw || existing.status) as
					| 'active'
					| 'suspended'
					| 'pending'
					| 'inactive'
					| 'trial_expired',
				industryPackId: packId || null,
				configId,
				imageUrl,
				branding,
				planKey: nextPlanKey,
				serviceMode: nextServiceMode,
				trialDuration: nextTrialDuration,
				trialEndsAt: nextTrialEndsAt
			})
			.where(eq(business.id, id))
			.returning();

		if (!row) return fail(404, { message: 'Business not found.', success: false });

		await writeAudit({
			actorUserId: admin.id,
			businessId: id,
			action: 'business.update',
			entityType: 'business',
			entityId: id,
			payload: {
				name,
				packId,
				configId,
				status: row.status,
				imageUrl,
				planKey: row.planKey,
				serviceMode: row.serviceMode,
				trialDuration: row.trialDuration,
				trialEndsAt: row.trialEndsAt?.toISOString() ?? null
			}
		});

		return { success: true, message: `Business "${row.name}" updated.` };
	},

	deleteBusiness: async ({ request, locals }) => {
		const admin = await requirePlatformAdmin(locals.user);
		const form = await request.formData();
		const id = String(form.get('businessId') ?? '').trim();
		if (!id) return fail(400, { message: 'Business id is required.', success: false });

		const existing = await db.query.business.findFirst({ where: eq(business.id, id) });
		if (!existing) return fail(404, { message: 'Business not found.', success: false });

		// Clear restrict-FK children before cascading the business row (Neon HTTP has no tx).
		await db.delete(transfer).where(eq(transfer.businessId, id));
		await db.delete(ticket).where(eq(ticket.businessId, id));
		await db.delete(appointment).where(eq(appointment.businessId, id));

		const [row] = await db.delete(business).where(eq(business.id, id)).returning();
		if (!row) return fail(404, { message: 'Business not found.', success: false });

		await writeAudit({
			actorUserId: admin.id,
			businessId: null,
			action: 'business.delete',
			entityType: 'business',
			entityId: id,
			payload: { name: row.name, slug: row.slug }
		});

		return {
			success: true,
			message: `Business "${row.name}" deleted (memberships, sites, and related rows removed).`
		};
	}
};
