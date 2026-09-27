import type { InferSelectModel } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { business, membership, platformAdmin } from '#lib/server/db/schema';

export type MembershipRole =
	| 'platform_admin'
	| 'business_owner'
	| 'manager'
	| 'counter_agent'
	| 'guest';

export type AppUser = { id: string; email: string; name: string };
export type MembershipRow = InferSelectModel<typeof membership>;

const STAFF_ROLES: MembershipRole[] = ['business_owner', 'manager', 'counter_agent'];
/** Setup / console CRUD: not counter_agent. */
const MANAGER_ROLES: MembershipRole[] = ['business_owner', 'manager'];

/** UUID v1-v5 shape used for `/b/[businessId]` routing identity. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isBusinessUuid(value: string): boolean {
	return UUID_RE.test(value);
}

export async function isPlatformAdmin(userId: string): Promise<boolean> {
	const row = await db.query.platformAdmin.findFirst({
		where: eq(platformAdmin.userId, userId)
	});
	return Boolean(row);
}

export async function requireUser(user: AppUser | undefined | null): Promise<AppUser> {
	if (!user) throw redirect(303, '/auth/login');
	return user;
}

export async function requirePlatformAdmin(user: AppUser | undefined | null) {
	const u = await requireUser(user);
	if (!(await isPlatformAdmin(u.id))) {
		throw error(403, 'Platform admin required');
	}
	return u;
}

/** Safe post-login destination: platform admins → /admin, others → /workspaces. Honors deep links. */
export async function resolvePostLoginPath(
	userId: string,
	requested?: string | null
): Promise<string> {
	const safe =
		requested && requested.startsWith('/') && !requested.startsWith('//') ? requested : null;
	const defaultHomes = new Set(['/workspaces', '/app', '/admin', '/platform']);
	if (safe && !defaultHomes.has(safe)) return safe;
	if (await isPlatformAdmin(userId)) return '/admin';
	return '/workspaces';
}

export async function getMembershipsForUser(userId: string) {
	return db.query.membership.findMany({
		where: and(eq(membership.userId, userId), eq(membership.status, 'active')),
		with: { business: true }
	});
}

/** Kept for legacy `/b/[slug]` → UUID redirects; routing identity is UUID. */
export async function getBusinessBySlug(slug: string) {
	return db.query.business.findFirst({
		where: eq(business.slug, slug),
		with: { industryPack: true }
	});
}

export async function getBusinessById(id: string) {
	return db.query.business.findFirst({
		where: eq(business.id, id),
		with: { industryPack: true }
	});
}

export async function requireBusinessRole(
	user: AppUser | undefined | null,
	businessId: string,
	roles: MembershipRole[]
) {
	const u = await requireUser(user);
	const biz = await getBusinessById(businessId);
	if (!biz) throw error(404, 'Business not found');

	if (await isPlatformAdmin(u.id)) {
		return { user: u, business: biz, membership: null as MembershipRow | null };
	}

	const mem = await db.query.membership.findFirst({
		where: and(
			eq(membership.userId, u.id),
			eq(membership.businessId, biz.id),
			eq(membership.status, 'active'),
			inArray(membership.role, roles)
		)
	});

	if (!mem) throw error(403, 'Insufficient business role');
	return { user: u, business: biz, membership: mem };
}

export async function requireStaff(user: AppUser | undefined | null, businessId: string) {
	return requireBusinessRole(user, businessId, STAFF_ROLES);
}

/** Owner/manager (and platform admin) for business setup CRUD. */
export async function requireManager(user: AppUser | undefined | null, businessId: string) {
	return requireBusinessRole(user, businessId, MANAGER_ROLES);
}

export async function requireGuestOrStaff(user: AppUser | undefined | null, businessId: string) {
	return requireBusinessRole(user, businessId, [...STAFF_ROLES, 'guest']);
}
