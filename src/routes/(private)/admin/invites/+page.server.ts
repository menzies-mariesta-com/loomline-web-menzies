import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { randomUUID } from 'node:crypto';
import { db } from '#lib/server/db';
import { account, business, invite, membership, user } from '#lib/server/db/schema';
import { requirePlatformAdmin } from '#lib/server/qms/guards';
import { writeAudit } from '#lib/server/qms/audit';
import {
	inviteMailToast,
	inviteSetPasswordUrl,
	normalizeInviteToken,
	sendManagerInviteEmail
} from '#lib/server/qms/email';
import { randomToken } from '#lib/server/qms/ids';
import { ORIGIN } from '$app/env/private';

const INVITE_ROLES = new Set(['business_owner', 'manager', 'counter_agent', 'guest']);

export const load: PageServerLoad = async ({ locals }) => {
	await requirePlatformAdmin(locals.user);

	const invites = await db.query.invite.findMany({
		orderBy: [desc(invite.createdAt)],
		limit: 200
	});
	const businesses = await db.query.business.findMany({
		orderBy: [desc(business.name)]
	});
	const byId = Object.fromEntries(businesses.map((b) => [b.id, b]));

	return {
		invites: invites.map((inv) => ({
			...inv,
			business: byId[inv.businessId] ?? null
		})),
		businesses: businesses.map((b) => ({ id: b.id, name: b.name, slug: b.slug }))
	};
};

export const actions: Actions = {
	createInvite: async ({ request, locals }) => {
		const admin = await requirePlatformAdmin(locals.user);
		const form = await request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const businessId = String(form.get('businessId') ?? '').trim();
		const role = String(form.get('role') ?? 'manager').trim();

		if (!email || !businessId) {
			return fail(400, { message: 'Email and business are required.', success: false });
		}
		if (!INVITE_ROLES.has(role)) {
			return fail(400, { message: 'Invalid role.', success: false });
		}

		const biz = await db.query.business.findFirst({ where: eq(business.id, businessId) });
		if (!biz) return fail(404, { message: 'Business not found.', success: false });

		const pending = await db.query.invite.findFirst({
			where: and(
				eq(invite.email, email),
				eq(invite.businessId, businessId),
				eq(invite.status, 'pending')
			)
		});
		if (pending) {
			return fail(400, {
				message: `A pending invite already exists for ${email} on this business.`,
				success: false
			});
		}

		const token = normalizeInviteToken(randomToken(24));
		const inviteUrl = inviteSetPasswordUrl(ORIGIN, token);
		const [row] = await db
			.insert(invite)
			.values({
				businessId,
				email,
				role: role as 'business_owner' | 'manager' | 'counter_agent' | 'guest',
				token,
				status: 'pending',
				invitedByUserId: admin.id,
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000)
			})
			.returning();

		const mailResult = await sendManagerInviteEmail({
			to: email,
			businessName: biz.name,
			inviteUrl,
			roleLabel: role.replaceAll('_', ' ')
		});

		await writeAudit({
			actorUserId: admin.id,
			businessId,
			action: 'invite.create',
			entityType: 'invite',
			entityId: row.id,
			payload: { email, role, inviteDelivered: mailResult.ok }
		});

		return inviteMailToast(email, mailResult, 'sent');
	},

	resendInvite: async ({ request, locals }) => {
		const admin = await requirePlatformAdmin(locals.user);
		const form = await request.formData();
		const inviteId = String(form.get('inviteId') ?? '').trim();
		if (!inviteId) return fail(400, { message: 'Invite id is required.', success: false });

		const inv = await db.query.invite.findFirst({ where: eq(invite.id, inviteId) });
		if (!inv) return fail(404, { message: 'Invite not found.', success: false });
		if (inv.status !== 'pending') {
			return fail(400, { message: 'Only pending invites can be resent.', success: false });
		}

		const biz = await db.query.business.findFirst({ where: eq(business.id, inv.businessId) });
		if (!biz) return fail(404, { message: 'Business not found.', success: false });

		const token = normalizeInviteToken(randomToken(24));
		const inviteUrl = inviteSetPasswordUrl(ORIGIN, token);
		await db
			.update(invite)
			.set({
				token,
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000)
			})
			.where(eq(invite.id, inv.id));

		const mailResult = await sendManagerInviteEmail({
			to: inv.email,
			businessName: biz.name,
			inviteUrl,
			roleLabel: inv.role.replaceAll('_', ' ')
		});

		await writeAudit({
			actorUserId: admin.id,
			businessId: inv.businessId,
			action: 'invite.resend',
			entityType: 'invite',
			entityId: inv.id,
			payload: { email: inv.email, inviteDelivered: mailResult.ok }
		});

		return inviteMailToast(inv.email, mailResult, 'resent');
	},

	cancelInvite: async ({ request, locals }) => {
		const admin = await requirePlatformAdmin(locals.user);
		const form = await request.formData();
		const inviteId = String(form.get('inviteId') ?? '').trim();
		if (!inviteId) return fail(400, { message: 'Invite id is required.', success: false });

		const inv = await db.query.invite.findFirst({ where: eq(invite.id, inviteId) });
		if (!inv) return fail(404, { message: 'Invite not found.', success: false });
		if (inv.status !== 'pending') {
			return fail(400, { message: 'Only pending invites can be cancelled.', success: false });
		}

		await db.update(invite).set({ status: 'revoked' }).where(eq(invite.id, inv.id));

		await writeAudit({
			actorUserId: admin.id,
			businessId: inv.businessId,
			action: 'invite.cancel',
			entityType: 'invite',
			entityId: inv.id,
			payload: { email: inv.email }
		});

		return { success: true, message: `Invite for ${inv.email} cancelled.` };
	},

	deleteInvite: async ({ request, locals }) => {
		const admin = await requirePlatformAdmin(locals.user);
		const form = await request.formData();
		const inviteId = String(form.get('inviteId') ?? '').trim();
		if (!inviteId) return fail(400, { message: 'Invite id is required.', success: false });

		const [row] = await db.delete(invite).where(eq(invite.id, inviteId)).returning();
		if (!row) return fail(404, { message: 'Invite not found.', success: false });

		await writeAudit({
			actorUserId: admin.id,
			businessId: row.businessId,
			action: 'invite.delete',
			entityType: 'invite',
			entityId: inviteId,
			payload: { email: row.email, status: row.status }
		});

		return { success: true, message: `Invite for ${row.email} deleted.` };
	},

	provisionOwnerNow: async ({ request, locals }) => {
		const admin = await requirePlatformAdmin(locals.user);
		const form = await request.formData();
		const inviteId = String(form.get('inviteId') ?? '');
		const password = String(form.get('password') ?? 'OwnerPass1!');

		const inv = await db.query.invite.findFirst({ where: eq(invite.id, inviteId) });
		if (!inv || inv.status !== 'pending') {
			return fail(400, { message: 'Invite not found.', success: false });
		}

		let existingUser = await db.query.user.findFirst({ where: eq(user.email, inv.email) });
		if (!existingUser) {
			const userId = randomUUID();
			const hashed = await hashPassword(password);
			await db.insert(user).values({
				id: userId,
				name: inv.email.split('@')[0] ?? 'Owner',
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
			existingUser = await db.query.user.findFirst({ where: eq(user.email, inv.email) });
		}
		if (!existingUser) return fail(500, { message: 'Could not create user.', success: false });

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
			actorUserId: admin.id,
			businessId: inv.businessId,
			action: 'invite.provision',
			entityType: 'invite',
			entityId: inv.id
		});

		return {
			success: true,
			message: `Owner ${inv.email} provisioned. Password set (use the one you entered).`
		};
	}
};
