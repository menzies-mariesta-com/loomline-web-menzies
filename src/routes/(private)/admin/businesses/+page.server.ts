import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import {
	appointment,
	business,
	industryPack,
	invite,
	platformConfigProfile,
	ticket,
	transfer
} from '#lib/server/db/schema';
import { requirePlatformAdmin } from '#lib/server/qms/guards';
import {
	applyIndustryPackToBusiness,
	businessSlugFromName
} from '#lib/server/qms/business-bootstrap';
import { ensureConfigProfilesSeeded, getConfigProfile } from '#lib/server/qms/config-profiles';
import { randomToken } from '#lib/server/qms/ids';
import { writeAudit } from '#lib/server/qms/audit';
import { inviteSetPasswordUrl } from '#lib/server/qms/email';
import { enqueueAndDeliverNotification } from '#lib/server/qms/notify';
import { saveOrgImage } from '#lib/server/upload/org-image';
import { ORIGIN } from '$app/env/private';

const BUSINESS_STATUSES = new Set(['active', 'suspended', 'pending']);

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
		const imageFile = form.get('image');

		if (!name || !packId || !managerEmail) {
			return fail(400, {
				message: 'Name, template, and manager email are required.',
				success: false
			});
		}

		let timezone = timezoneOverride || 'Asia/Yangon';
		let localeDefault = 'en';
		let configId: string | null = configIdRaw || null;
		let branding: Record<string, unknown> = {};

		if (configId) {
			const profile = await getConfigProfile(configId);
			if (!profile) {
				return fail(400, { message: 'Selected config was not found.', success: false });
			}
			timezone = timezoneOverride || profile.timezone;
			localeDefault = profile.locale;
			branding = {
				dateFormat: profile.dateFormat,
				timeFormat: profile.timeFormat,
				currency: profile.currency
			};
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

		let slug = businessSlugFromName(name);
		const clash = await db.query.business.findFirst({ where: eq(business.slug, slug) });
		if (clash) slug = `${slug}-${Date.now().toString(36)}`;

		const [biz] = await db
			.insert(business)
			.values({
				name,
				slug,
				timezone,
				localeDefault,
				status: 'active',
				industryPackId: packId,
				configId,
				imageUrl,
				branding,
				inviteCode: randomToken(8)
			})
			.returning();

		await applyIndustryPackToBusiness(biz.id, packId);

		const token = randomToken(24);
		const inviteUrl = inviteSetPasswordUrl(ORIGIN, token);
		await db.insert(invite).values({
			businessId: biz.id,
			email: managerEmail,
			role: 'business_owner',
			token,
			status: 'pending',
			invitedByUserId: admin.id,
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000)
		});

		const { result: mailResult } = await enqueueAndDeliverNotification({
			businessId: biz.id,
			channel: 'email',
			toAddress: managerEmail,
			templateKey: 'owner_invite',
			payload: {
				businessName: biz.name,
				inviteUrl,
				roleLabel: 'business owner'
			}
		});

		await writeAudit({
			actorUserId: admin.id,
			businessId: biz.id,
			action: 'business.create',
			entityType: 'business',
			entityId: biz.id,
			payload: { managerEmail, packId, configId, imageUrl, inviteDelivered: mailResult.ok }
		});

		const inviteNote = mailResult.ok
			? mailResult.loggedOnly
				? `Invite queued for ${managerEmail} (link logged on server; set SMTP_* to email it).`
				: `Invite sent to ${managerEmail}.`
			: `Invite created for ${managerEmail} (email queued for retry).`;

		return {
			success: true,
			message: `Business ${biz.name} created. ${inviteNote}`
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
		const imageFile = form.get('image');

		if (!id || !name) {
			return fail(400, { message: 'Business id and name are required.', success: false });
		}

		const existing = await db.query.business.findFirst({ where: eq(business.id, id) });
		if (!existing) return fail(404, { message: 'Business not found.', success: false });

		if (statusRaw && !BUSINESS_STATUSES.has(statusRaw)) {
			return fail(400, { message: 'Invalid status.', success: false });
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
				status: (statusRaw || existing.status) as 'active' | 'suspended' | 'pending',
				industryPackId: packId || null,
				configId,
				imageUrl,
				branding
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
			payload: { name, packId, configId, status: row.status, imageUrl }
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
