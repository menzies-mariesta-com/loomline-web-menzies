import { error } from '@sveltejs/kit';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { randomUUID } from 'node:crypto';
import { db } from '#lib/server/db';
import {
	account,
	businessUserGroup,
	membership,
	membershipSite,
	membershipUserGroup,
	site,
	user
} from '#lib/server/db/schema';
import { writeAudit } from '#lib/server/qms/audit';
import { bumpBusinessRbacVersion } from '#lib/server/cache/redis';
import type { AppUser, MembershipRole } from '#lib/server/qms/guards';
import {
	isPlatformAdmin,
	requireOwner,
	requireStaffRegistrar
} from '#lib/server/qms/guards';
import { createCredentialUser } from '#lib/server/qms/provision-user';

const STAFF_ROLES = new Set<MembershipRole>([
	'business_admin',
	'manager',
	'counter_agent',
	'guest'
]);

/** Roles that must never be created or reassigned through staff registration. */
export function isStaffRegistrationBlockedRole(role: string): boolean {
	return role === 'business_owner' || role === 'platform_admin';
}

export type StaffRegistrationCreateInput = {
	name: string;
	email: string;
	password: string;
	role: MembershipRole;
	userGroupIds: string[];
	siteIds: string[];
	active: boolean;
};

export type StaffRegistrationUpdateInput = {
	membershipId: string;
	name?: string;
	email?: string;
	password?: string;
	role?: MembershipRole;
	userGroupIds?: string[];
	siteIds?: string[];
	active?: boolean;
};

async function canAssignRole(
	actor: AppUser,
	businessId: string,
	role: MembershipRole
): Promise<boolean> {
	if (role === 'business_owner' || role === 'platform_admin') return false;
	if (role === 'business_admin') {
		if (await isPlatformAdmin(actor.id)) return true;
		try {
			await requireOwner(actor, businessId);
			return true;
		} catch {
			return false;
		}
	}
	return STAFF_ROLES.has(role);
}

export async function createStaffRegistration(
	actor: AppUser,
	businessId: string,
	input: StaffRegistrationCreateInput
) {
	await requireStaffRegistrar(actor, businessId);
	const role = input.role;
	if (isStaffRegistrationBlockedRole(role) || !STAFF_ROLES.has(role)) {
		throw error(400, 'Invalid role');
	}
	if (!(await canAssignRole(actor, businessId, role))) {
		throw error(403, 'You cannot assign this role');
	}

	const email = input.email.trim().toLowerCase();
	const name = input.name.trim() || email.split('@')[0] || 'User';
	if (!email) throw error(400, 'Email is required');

	const groups = await db.query.businessUserGroup.findMany({
		where: and(
			eq(businessUserGroup.businessId, businessId),
			inArray(businessUserGroup.id, input.userGroupIds)
		)
	});
	if (input.userGroupIds.length > 0 && groups.length !== input.userGroupIds.length) {
		throw error(400, 'Invalid user group selection');
	}

	let provisioned;
	try {
		provisioned = await createCredentialUser({
			email,
			password: input.password,
			name
		});
	} catch (e) {
		throw error(400, e instanceof Error ? e.message : 'Could not create user');
	}

	const [mem] = await db
		.insert(membership)
		.values({
			userId: provisioned.id,
			businessId,
			role,
			status: input.active ? 'active' : 'suspended'
		})
		.returning();

	if (input.userGroupIds.length > 0) {
		await db.insert(membershipUserGroup).values(
			input.userGroupIds.map((userGroupId) => ({
				membershipId: mem.id,
				userGroupId
			}))
		);
	}

	if (input.siteIds.length > 0) {
		const sites = await db.query.site.findMany({
			where: and(eq(site.businessId, businessId), inArray(site.id, input.siteIds))
		});
		if (sites.length !== input.siteIds.length) {
			throw error(400, 'Invalid site selection');
		}
		await db.insert(membershipSite).values(
			input.siteIds.map((siteId) => ({
				membershipId: mem.id,
				siteId
			}))
		);
	}

	await writeAudit({
		actorUserId: actor.id,
		businessId,
		action: 'staff.create',
		entityType: 'membership',
		entityId: mem.id,
		payload: { email, role }
	});

	await bumpBusinessRbacVersion(businessId);

	return { membershipId: mem.id, userId: provisioned.id };
}

export async function updateStaffRegistration(
	actor: AppUser,
	businessId: string,
	input: StaffRegistrationUpdateInput
) {
	await requireStaffRegistrar(actor, businessId);

	const mem = await db.query.membership.findFirst({
		where: and(eq(membership.id, input.membershipId), eq(membership.businessId, businessId)),
		with: { user: true }
	});
	if (!mem || !mem.user) throw error(404, 'Staff member not found');
	if (mem.role === 'business_owner') {
		throw error(403, 'Owner account cannot be edited here');
	}

	if (input.role && input.role !== mem.role) {
		if (!(await canAssignRole(actor, businessId, input.role))) {
			throw error(403, 'You cannot assign this role');
		}
	}

	if (input.email) {
		const nextEmail = input.email.trim().toLowerCase();
		if (nextEmail !== mem.user.email) {
			const taken = await db.query.user.findFirst({ where: eq(user.email, nextEmail) });
			if (taken) throw error(400, 'An account with this email already exists');
			await db.update(user).set({ email: nextEmail }).where(eq(user.id, mem.userId));
		}
	}

	if (input.name?.trim()) {
		await db.update(user).set({ name: input.name.trim() }).where(eq(user.id, mem.userId));
	}

	if (input.password && input.password.length >= 8) {
		const hashed = await hashPassword(input.password);
		const cred = await db.query.account.findFirst({
			where: and(eq(account.userId, mem.userId), eq(account.providerId, 'credential'))
		});
		if (cred) {
			await db.update(account).set({ password: hashed }).where(eq(account.id, cred.id));
		} else {
			await db.insert(account).values({
				id: randomUUID(),
				accountId: mem.userId,
				providerId: 'credential',
				userId: mem.userId,
				password: hashed
			});
		}
	}

	const patch: Partial<typeof membership.$inferInsert> = {};
	if (input.role) patch.role = input.role;
	if (input.active != null) patch.status = input.active ? 'active' : 'suspended';
	if (Object.keys(patch).length > 0) {
		await db.update(membership).set(patch).where(eq(membership.id, mem.id));
	}

	if (input.userGroupIds) {
		await db.delete(membershipUserGroup).where(eq(membershipUserGroup.membershipId, mem.id));
		if (input.userGroupIds.length > 0) {
			await db.insert(membershipUserGroup).values(
				input.userGroupIds.map((userGroupId) => ({
					membershipId: mem.id,
					userGroupId
				}))
			);
		}
	}

	if (input.siteIds) {
		await db.delete(membershipSite).where(eq(membershipSite.membershipId, mem.id));
		if (input.siteIds.length > 0) {
			await db.insert(membershipSite).values(
				input.siteIds.map((siteId) => ({
					membershipId: mem.id,
					siteId
				}))
			);
		}
	}

	await writeAudit({
		actorUserId: actor.id,
		businessId,
		action: 'staff.update',
		entityType: 'membership',
		entityId: mem.id
	});

	await bumpBusinessRbacVersion(businessId);

	return { ok: true };
}

export async function getStaffRegistrationContext(businessId: string, membershipId?: string | null) {
	const groups = await db.query.businessUserGroup.findMany({
		where: eq(businessUserGroup.businessId, businessId),
		orderBy: (g, { asc }) => [asc(g.name)]
	});
	const sites = await db.query.site.findMany({
		where: eq(site.businessId, businessId),
		orderBy: (s, { asc }) => [asc(s.name)]
	});

	let member: {
		membershipId: string;
		name: string;
		email: string;
		role: MembershipRole;
		status: string;
		userGroupIds: string[];
		siteIds: string[];
	} | null = null;

	if (membershipId) {
		const mem = await db.query.membership.findFirst({
			where: and(eq(membership.id, membershipId), eq(membership.businessId, businessId)),
			with: {
				user: true,
				userGroups: { with: { userGroup: true } },
				sites: true
			}
		});
		if (mem?.user) {
			member = {
				membershipId: mem.id,
				name: mem.user.name,
				email: mem.user.email,
				role: mem.role as MembershipRole,
				status: mem.status,
				userGroupIds: mem.userGroups.map((g) => g.userGroupId),
				siteIds: mem.sites.map((s) => s.siteId)
			};
		}
	}

	return { groups, sites, member };
}

export async function listStaffMembers(businessId: string) {
	return db.query.membership.findMany({
		where: and(eq(membership.businessId, businessId), ne(membership.role, 'business_owner')),
		with: { user: true, userGroups: { with: { userGroup: true } } }
	});
}
