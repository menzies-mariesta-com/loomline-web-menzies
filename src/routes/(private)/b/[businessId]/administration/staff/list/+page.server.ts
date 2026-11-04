import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { invite, user } from '#lib/server/db/schema';
import { requireStaffRegistrar } from '#lib/server/qms/guards';
import { inviteMailToast, inviteSetPasswordUrl, normalizeInviteToken } from '#lib/server/qms/email';
import { randomToken } from '#lib/server/qms/ids';
import { deliverInviteEmail } from '#lib/server/qms/invite-delivery';
import { assertEmailAvailable, createCredentialUser, ensureMembership } from '#lib/server/qms/provision-user';
import { listStaffMembers } from '#lib/server/qms/staff-registration';
import { ORIGIN } from '$app/env/private';

const INVITE_ROLES = new Set(['business_admin', 'manager', 'counter_agent', 'guest']);

export const load: PageServerLoad = async ({ locals, params }) => {
	const { business } = await requireStaffRegistrar(locals.user, params.businessId);
	const members = await listStaffMembers(business.id);
	const invites = await db.query.invite.findMany({
		where: eq(invite.businessId, business.id)
	});
	return { members, invites, businessId: business.id };
};

export const actions: Actions = {
	invite: async ({ request, locals, params }) => {
		const { business, user } = await requireStaffRegistrar(locals.user, params.businessId);
		const form = await request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const role = String(form.get('role') ?? 'counter_agent').trim();
		if (!email) return fail(400, { message: 'Email required', success: false });
		if (!INVITE_ROLES.has(role)) {
			return fail(400, { message: 'Invalid role.', success: false });
		}
		if (role === 'business_admin') {
			try {
				const { requireOwner } = await import('#lib/server/qms/guards');
				await requireOwner(locals.user, params.businessId);
			} catch {
				return fail(403, { message: 'Only the owner can invite an admin.', success: false });
			}
		}

		try {
			await assertEmailAvailable(email);
		} catch (e) {
			return fail(400, {
				message: e instanceof Error ? e.message : 'Email not available',
				success: false
			});
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
				message: `A pending invite already exists for ${email}.`,
				success: false
			});
		}

		const token = normalizeInviteToken(randomToken(24));
		const inviteUrl = inviteSetPasswordUrl(ORIGIN, token);
		await db.insert(invite).values({
			businessId: business.id,
			email,
			role: role as 'business_admin' | 'manager' | 'counter_agent' | 'guest',
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
		return inviteMailToast(email, mailResult, 'sent');
	},

	provision: async ({ request, locals, params }) => {
		const { business } = await requireStaffRegistrar(locals.user, params.businessId);
		const form = await request.formData();
		const inviteId = String(form.get('inviteId') ?? '');
		const password = String(form.get('password') ?? 'TempPass1!');
		const inv = await db.query.invite.findFirst({ where: eq(invite.id, inviteId) });
		if (!inv || inv.businessId !== business.id) {
			return fail(404, { message: 'Invite not found', success: false });
		}

		const existing = await db.query.user.findFirst({ where: eq(user.email, inv.email) });
		if (existing) {
			return fail(400, {
				message: 'An account with this email already exists',
				success: false
			});
		}

		try {
			const provisioned = await createCredentialUser({
				email: inv.email,
				password,
				name: inv.email.split('@')[0]
			});
			await ensureMembership({
				userId: provisioned.id,
				businessId: business.id,
				role: inv.role as 'business_admin' | 'manager' | 'counter_agent' | 'guest'
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
