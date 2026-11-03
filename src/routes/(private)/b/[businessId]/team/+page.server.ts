import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { invite, membership } from '#lib/server/db/schema';
import { requireBusinessRole } from '#lib/server/qms/guards';
import { inviteMailToast, inviteSetPasswordUrl, normalizeInviteToken } from '#lib/server/qms/email';
import { randomToken } from '#lib/server/qms/ids';
import { deliverInviteEmail } from '#lib/server/qms/invite-delivery';
import { ensureCredentialUser, ensureMembership } from '#lib/server/qms/provision-user';
import { ORIGIN } from '$app/env/private';

const INVITE_ROLES = new Set(['manager', 'counter_agent', 'guest', 'business_owner']);

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
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const role = String(form.get('role') ?? 'counter_agent').trim();
		if (!email) return fail(400, { message: 'Email required', success: false });
		if (!INVITE_ROLES.has(role)) {
			return fail(400, { message: 'Invalid role.', success: false });
		}

		const pending = await db.query.invite.findFirst({
			where: and(
				eq(invite.email, email),
				eq(invite.businessId, business.id),
				eq(invite.status, 'pending')
			)
		});
		if (pending) {
			return fail(400, {
				message: `A pending invite already exists for ${email}. Resend it from the Invites tab.`,
				success: false
			});
		}

		const token = normalizeInviteToken(randomToken(24));
		const inviteUrl = inviteSetPasswordUrl(ORIGIN, token);
		await db.insert(invite).values({
			businessId: business.id,
			email,
			role: role as 'manager' | 'counter_agent' | 'guest' | 'business_owner',
			token,
			invitedByUserId: user.id,
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
			status: 'pending'
		});
		const roleLabel = role.replaceAll('_', ' ');
		const mailResult = await deliverInviteEmail({
			businessId: business.id,
			to: email,
			templateKey: 'team_invite',
			businessName: business.name,
			inviteUrl,
			roleLabel
		});
		const toast = inviteMailToast(email, mailResult, 'sent');
		return toast;
	},

	resendInvite: async ({ request, locals, params }) => {
		const { business } = await requireBusinessRole(locals.user, params.businessId, [
			'business_owner',
			'manager',
			'platform_admin'
		]);
		const form = await request.formData();
		const inviteId = String(form.get('inviteId') ?? '').trim();
		if (!inviteId) return fail(400, { message: 'Invite id is required.', success: false });

		const inv = await db.query.invite.findFirst({ where: eq(invite.id, inviteId) });
		if (!inv || inv.businessId !== business.id) {
			return fail(404, { message: 'Invite not found.', success: false });
		}
		if (inv.status !== 'pending') {
			return fail(400, { message: 'Only pending invites can be resent.', success: false });
		}

		const token = normalizeInviteToken(randomToken(24));
		const inviteUrl = inviteSetPasswordUrl(ORIGIN, token);
		await db
			.update(invite)
			.set({
				token,
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000)
			})
			.where(eq(invite.id, inv.id));

		const roleLabel = inv.role.replaceAll('_', ' ');
		const mailResult = await deliverInviteEmail({
			businessId: business.id,
			to: inv.email,
			templateKey: 'team_invite',
			businessName: business.name,
			inviteUrl,
			roleLabel
		});
		return inviteMailToast(inv.email, mailResult, 'resent');
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
