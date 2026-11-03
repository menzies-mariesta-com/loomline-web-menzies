import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { industryPack, platformConfigProfile, trialRequest } from '#lib/server/db/schema';
import { requirePlatformAdmin } from '#lib/server/qms/guards';
import { provisionOwnerBusiness } from '#lib/server/qms/provision-owner-business';
import { writeAudit } from '#lib/server/qms/audit';
import { ensureConfigProfilesSeeded } from '#lib/server/qms/config-profiles';

export const load: PageServerLoad = async ({ locals }) => {
	await requirePlatformAdmin(locals.user);
	await ensureConfigProfilesSeeded();

	const requests = await db.query.trialRequest.findMany({
		orderBy: [desc(trialRequest.createdAt)],
		limit: 200,
		with: { business: true }
	});
	const templates = await db.query.industryPack.findMany({
		orderBy: [desc(industryPack.name)]
	});
	const configs = await db.query.platformConfigProfile.findMany({
		orderBy: [desc(platformConfigProfile.name)]
	});

	return { requests, templates, configs };
};

export const actions: Actions = {
	approveTrial: async ({ request, locals }) => {
		const admin = await requirePlatformAdmin(locals.user);
		const form = await request.formData();
		const requestId = String(form.get('requestId') ?? '').trim();
		const packId = String(form.get('industryPackId') ?? '').trim();
		const configId = String(form.get('configId') ?? '').trim();

		if (!requestId) {
			return fail(400, { success: false, message: 'Trial request id is required.' });
		}

		const row = await db.query.trialRequest.findFirst({
			where: eq(trialRequest.id, requestId)
		});
		if (!row) return fail(404, { success: false, message: 'Trial request not found.' });
		if (row.status !== 'pending') {
			return fail(400, { success: false, message: 'Only pending requests can be approved.' });
		}

		const provisioned = await provisionOwnerBusiness({
			actorUserId: admin.id,
			businessName: row.businessName,
			ownerEmail: row.email,
			industryPackId: packId || null,
			configId: configId || null,
			accessKind: 'trial',
			trialDuration: row.duration
		});

		if (!provisioned.ok) {
			return fail(400, { success: false, message: provisioned.message });
		}

		await db
			.update(trialRequest)
			.set({
				status: 'approved',
				businessId: provisioned.business.id,
				reviewedByUserId: admin.id,
				reviewedAt: new Date()
			})
			.where(eq(trialRequest.id, row.id));

		await writeAudit({
			actorUserId: admin.id,
			businessId: provisioned.business.id,
			action: 'trial_request.approve',
			entityType: 'trial_request',
			entityId: row.id,
			payload: { email: row.email, duration: row.duration }
		});

		const inviteNote = provisioned.inviteDelivered
			? provisioned.loggedOnly
				? `Owner invite logged on server for ${row.email}.`
				: `Owner invite sent to ${row.email}.`
			: `Business created; invite email failed for ${row.email}.`;

		return {
			success: true,
			message: `Trial approved for ${row.businessName}. ${inviteNote}`
		};
	},

	rejectTrial: async ({ request, locals }) => {
		const admin = await requirePlatformAdmin(locals.user);
		const form = await request.formData();
		const requestId = String(form.get('requestId') ?? '').trim();
		const reviewNote = String(form.get('reviewNote') ?? '').trim();

		if (!requestId) {
			return fail(400, { success: false, message: 'Trial request id is required.' });
		}

		const row = await db.query.trialRequest.findFirst({
			where: eq(trialRequest.id, requestId)
		});
		if (!row) return fail(404, { success: false, message: 'Trial request not found.' });
		if (row.status !== 'pending') {
			return fail(400, { success: false, message: 'Only pending requests can be rejected.' });
		}

		await db
			.update(trialRequest)
			.set({
				status: 'rejected',
				reviewedByUserId: admin.id,
				reviewedAt: new Date(),
				reviewNote: reviewNote || null
			})
			.where(eq(trialRequest.id, row.id));

		await writeAudit({
			actorUserId: admin.id,
			businessId: null,
			action: 'trial_request.reject',
			entityType: 'trial_request',
			entityId: row.id,
			payload: { email: row.email, reviewNote }
		});

		return { success: true, message: `Trial request from ${row.email} rejected.` };
	},

	deleteTrial: async ({ request, locals }) => {
		const admin = await requirePlatformAdmin(locals.user);
		const form = await request.formData();
		const requestId = String(form.get('requestId') ?? '').trim();
		if (!requestId) {
			return fail(400, { success: false, message: 'Trial request id is required.' });
		}

		const [row] = await db
			.delete(trialRequest)
			.where(eq(trialRequest.id, requestId))
			.returning();
		if (!row) return fail(404, { success: false, message: 'Trial request not found.' });

		await writeAudit({
			actorUserId: admin.id,
			businessId: row.businessId,
			action: 'trial_request.delete',
			entityType: 'trial_request',
			entityId: requestId,
			payload: { email: row.email, status: row.status }
		});

		return { success: true, message: `Trial request for ${row.email} deleted.` };
	}
};
