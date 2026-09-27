import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { invite, membership } from '#lib/server/db/schema';
import { requireBusinessRole } from '#lib/server/qms/guards';
import { inviteSetPasswordUrl } from '#lib/server/qms/email';
import { randomToken } from '#lib/server/qms/ids';
import { enqueueAndDeliverNotification } from '#lib/server/qms/notify';
import { ensureCredentialUser, ensureMembership } from '#lib/server/qms/provision-user';
import { ORIGIN } from '$app/env/private';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { business } = await requireBusinessRole(locals.user, params.businessId, [
		'business_owner',
		'manager',
		'platform_admin'
	]);
	const members = await db.query.membership.findMany({
		where: eq(membership.businessId, business.id),
		with: { user: true }
	});
	const invites = await db.query.invite.findMany({
		where: eq(invite.businessId, business.id)
	});
	return { members, invites };
};

export const actions: Actions = {
	invite: async ({ request, locals, params }) => {
		const { business, user } = await requireBusinessRole(locals.user, params.businessId, [
			'business_owner',
			'manager',
			'platform_admin'
		]);
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		const role = String(form.get('role') ?? 'counter_agent') as
			| 'manager'
			| 'counter_agent'
			| 'guest'
			| 'business_owner';
		if (!email) return fail(400, { message: 'Email required', success: false });
		const token = randomToken(24);
		const inviteUrl = inviteSetPasswordUrl(ORIGIN, token);
		await db.insert(invite).values({
			businessId: business.id,
			email,
			role,
			token,
			invitedByUserId: user.id,
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
			status: 'pending'
		});
		const roleLabel = role.replaceAll('_', ' ');
		const { result: mailResult } = await enqueueAndDeliverNotification({
			businessId: business.id,
			channel: 'email',
			toAddress: email,
			templateKey: 'team_invite',
			payload: {
				businessName: business.name,
				inviteUrl,
				roleLabel
			}
		});
		const inviteNote = mailResult.ok
			? mailResult.loggedOnly
				? `Invite queued for ${email} (link logged on server; set SMTP_* to email it).`
				: `Invite sent to ${email}.`
			: `Invite created for ${email} (email queued for retry).`;
		return { success: true, message: inviteNote };
	},

	provision: async ({ request, locals, params }) => {
		const { business } = await requireBusinessRole(locals.user, params.businessId, [
			'business_owner',
			'manager',
			'platform_admin'
		]);
		const form = await request.formData();
		const inviteId = String(form.get('inviteId') ?? '');
		const password = String(form.get('password') ?? 'TempPass1!');
		const inv = await db.query.invite.findFirst({ where: eq(invite.id, inviteId) });
		if (!inv || inv.businessId !== business.id) {
			return fail(404, { message: 'Invite not found', success: false });
		}

		try {
			const provisioned = await ensureCredentialUser({
				email: inv.email,
				password,
				name: inv.email.split('@')[0]
			});
			await ensureMembership({
				userId: provisioned.id,
				businessId: business.id,
				role: inv.role as 'manager' | 'counter_agent' | 'guest' | 'business_owner'
			});
		} catch (e) {
			return fail(400, {
				message: e instanceof Error ? e.message : 'Provision failed',
				success: false
			});
		}

		await db
			.update(invite)
			.set({ status: 'accepted', acceptedAt: new Date() })
			.where(eq(invite.id, inv.id));
		return { success: true, message: `Provisioned ${inv.email}` };
	}
};
