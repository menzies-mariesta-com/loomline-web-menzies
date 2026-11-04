import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { randomUUID } from 'node:crypto';
import { db } from '#lib/server/db';
import { account, business, invite, membership, user } from '#lib/server/db/schema';
import { writeAudit } from '#lib/server/qms/audit';
import { normalizeInviteToken } from '#lib/server/qms/email';

export const load: PageServerLoad = async ({ url }) => {
	const token = normalizeInviteToken(url.searchParams.get('token'));
	if (!token) return { invite: null, error: 'Missing invite token.', businessName: null };

	const inv = await db.query.invite.findFirst({
		where: and(eq(invite.token, token), eq(invite.status, 'pending'))
	});
	if (!inv) return { invite: null, error: 'Invite not found or already used.', businessName: null };
	if (inv.expiresAt.getTime() < Date.now()) {
		return { invite: null, error: 'Invite expired.', businessName: null };
	}

	const biz = await db.query.business.findFirst({ where: eq(business.id, inv.businessId) });
	return {
		invite: { id: inv.id, email: inv.email, role: inv.role, token: inv.token },
		businessName: biz?.name ?? 'Business',
		error: null
	};
};

function nameFromEmail(email: string): string {
	const local = email.split('@')[0]?.trim() ?? '';
	return local || email;
}

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const token = normalizeInviteToken(String(form.get('token') ?? ''));
		const password = String(form.get('password') ?? '');

		if (!token || password.length < 8) {
			return fail(400, { message: 'Password (8+ chars) is required.' });
		}

		const inv = await db.query.invite.findFirst({
			where: and(eq(invite.token, token), eq(invite.status, 'pending'))
		});
		if (!inv || inv.expiresAt.getTime() < Date.now()) {
			return fail(400, { message: 'Invite invalid or expired.' });
		}

		const existingUserCheck = await db.query.user.findFirst({ where: eq(user.email, inv.email) });
		if (existingUserCheck) {
			return fail(400, {
				message: 'An account with this email already exists. Use staff registration instead.'
			});
		}

		const userId = randomUUID();
		const hashed = await hashPassword(password);
		await db.insert(user).values({
			id: userId,
			name: nameFromEmail(inv.email),
			email: inv.email,
			emailVerified: true
		});
		await db.insert(account).values({
			id: randomUUID(),
			accountId: userId,
			providerId: 'credential',
			userId,
			password: hashed
		});
		const existingUser = await db.query.user.findFirst({ where: eq(user.email, inv.email) });

		if (!existingUser) return fail(500, { message: 'Could not create account.' });

		const existingMem = await db.query.membership.findFirst({
			where: and(
				eq(membership.userId, existingUser.id),
				eq(membership.businessId, inv.businessId),
				eq(membership.role, inv.role)
			)
		});
		if (!existingMem) {
			await db.insert(membership).values({
				userId: existingUser.id,
				businessId: inv.businessId,
				role: inv.role,
				status: 'active'
			});
		}

		await db
			.update(invite)
			.set({ status: 'accepted', acceptedAt: new Date() })
			.where(eq(invite.id, inv.id));

		await writeAudit({
			actorUserId: existingUser.id,
			businessId: inv.businessId,
			action: 'invite.accept',
			entityType: 'invite',
			entityId: inv.id
		});

		const biz = await db.query.business.findFirst({
			where: eq(business.id, inv.businessId)
		});
		throw redirect(
			303,
			`/auth/login?redirectTo=${encodeURIComponent(biz ? `/b/${biz.id}` : '/workspaces')}`
		);
	}
};
