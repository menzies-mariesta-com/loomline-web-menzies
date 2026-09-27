import { and, eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { randomUUID } from 'node:crypto';
import { db } from '#lib/server/db';
import { account, membership, user } from '#lib/server/db/schema';
import type { MembershipRole } from '#lib/server/qms/guards';

export type ProvisionedUser = {
	id: string;
	email: string;
	created: boolean;
};

/**
 * Create a credential user, or return an existing one.
 * When `password` is set and the user already exists, refresh the credential password.
 */
export async function ensureCredentialUser(opts: {
	email: string;
	password: string;
	name?: string;
}): Promise<ProvisionedUser> {
	const email = opts.email.trim().toLowerCase();
	const password = opts.password;
	if (!email || !password) {
		throw new Error('Email and password required');
	}
	if (password.length < 8) {
		throw new Error('Password must be at least 8 characters');
	}

	let existing = await db.query.user.findFirst({ where: eq(user.email, email) });
	const hashed = await hashPassword(password);

	if (!existing) {
		const userId = randomUUID();
		await db.insert(user).values({
			id: userId,
			name: opts.name?.trim() || email.split('@')[0] || 'User',
			email,
			emailVerified: true
		});
		await db.insert(account).values({
			id: randomUUID(),
			accountId: userId,
			providerId: 'credential',
			userId,
			password: hashed
		});
		existing = await db.query.user.findFirst({ where: eq(user.email, email) });
		if (!existing) throw new Error('User create failed');
		return { id: existing.id, email: existing.email, created: true };
	}

	const cred = await db.query.account.findFirst({
		where: and(eq(account.userId, existing.id), eq(account.providerId, 'credential'))
	});
	if (cred) {
		await db.update(account).set({ password: hashed }).where(eq(account.id, cred.id));
	} else {
		await db.insert(account).values({
			id: randomUUID(),
			accountId: existing.id,
			providerId: 'credential',
			userId: existing.id,
			password: hashed
		});
	}

	return { id: existing.id, email: existing.email, created: false };
}

/** Ensure an active membership for the given role (no-op if already present). */
export async function ensureMembership(opts: {
	userId: string;
	businessId: string;
	role: MembershipRole;
}) {
	const existing = await db.query.membership.findFirst({
		where: and(
			eq(membership.userId, opts.userId),
			eq(membership.businessId, opts.businessId),
			eq(membership.role, opts.role)
		)
	});
	if (existing) {
		if (existing.status !== 'active') {
			await db
				.update(membership)
				.set({ status: 'active' })
				.where(eq(membership.id, existing.id));
		}
		return existing;
	}
	const [row] = await db
		.insert(membership)
		.values({
			userId: opts.userId,
			businessId: opts.businessId,
			role: opts.role,
			status: 'active'
		})
		.returning();
	return row;
}
