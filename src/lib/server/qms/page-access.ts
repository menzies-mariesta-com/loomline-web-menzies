import { and, eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import {
	businessConsolePage,
	businessUserGroupPage,
	membership,
	membershipUserGroup
} from '#lib/server/db/schema';
import type { MembershipRole } from '#lib/server/qms/guards';
import { isPlatformAdmin } from '#lib/server/qms/guards';
import { businessConsolePath } from '#lib/tool/business-console-pages';
import {
	buildRbacPathsCacheKey,
	cacheAside,
	getBusinessRbacVersion
} from '#lib/server/cache/redis';

export const FULL_CONSOLE_ROLES: MembershipRole[] = ['business_owner', 'business_admin'];

/** Paths every business member may open regardless of user groups. */
export function universalBusinessPaths(businessId: string): string[] {
	const base = `/b/${businessId}`;
	return [`${base}/account`];
}

export function isBusinessOverviewPath(pathname: string, businessId: string): boolean {
	const base = `/b/${businessId}`;
	return pathname === base || pathname === `${base}/`;
}

export function pathnameAllowedForConsole(
	pathname: string,
	businessId: string,
	allowedPaths: Set<string>
): boolean {
	const base = `/b/${businessId}`;
	if (!pathname.startsWith(base)) return true;

	if (isBusinessOverviewPath(pathname, businessId)) return true;

	for (const p of universalBusinessPaths(businessId)) {
		if (pathname === p || pathname.startsWith(`${p}/`)) return true;
	}

	let best: string | null = null;
	for (const allowed of allowedPaths) {
		if (pathname === allowed || pathname.startsWith(`${allowed}/`)) {
			if (!best || allowed.length > best.length) best = allowed;
		}
	}
	return best != null;
}

export async function resolveAllowedConsolePaths(opts: {
	userId: string;
	businessId: string;
	membershipRole: MembershipRole | 'platform_admin' | 'guest';
	membershipId?: string | null;
}): Promise<Set<string>> {
	const version = await getBusinessRbacVersion(opts.businessId);
	const cacheKey = buildRbacPathsCacheKey({
		businessId: opts.businessId,
		userId: opts.userId,
		membershipRole: opts.membershipRole,
		membershipId: opts.membershipId ?? null,
		version
	});
	const paths = await cacheAside<string[]>(cacheKey, 90, async () => [
		...(await resolveAllowedConsolePathsUncached(opts))
	]);
	return new Set(paths);
}

async function resolveAllowedConsolePathsUncached(opts: {
	userId: string;
	businessId: string;
	membershipRole: MembershipRole | 'platform_admin' | 'guest';
	membershipId?: string | null;
}): Promise<Set<string>> {
	const { businessId, membershipRole, membershipId, userId } = opts;
	const base = `/b/${businessId}`;
	const universal = new Set(universalBusinessPaths(businessId));
	universal.add(base);

	if (membershipRole === 'platform_admin' || (await isPlatformAdmin(userId))) {
		const pages = await db.query.businessConsolePage.findMany({
			where: eq(businessConsolePage.businessId, businessId)
		});
		for (const p of pages) universal.add(p.path);
		universal.add(businessConsolePath(businessId, '/agent'));
		universal.add(businessConsolePath(businessId, '/tickets'));
		universal.add(businessConsolePath(businessId, '/appointments'));
		universal.add(businessConsolePath(businessId, '/guest'));
		return universal;
	}

	if (FULL_CONSOLE_ROLES.includes(membershipRole as MembershipRole)) {
		const pages = await db.query.businessConsolePage.findMany({
			where: eq(businessConsolePage.businessId, businessId)
		});
		for (const p of pages) universal.add(p.path);
		universal.add(businessConsolePath(businessId, '/agent'));
		universal.add(businessConsolePath(businessId, '/tickets'));
		universal.add(businessConsolePath(businessId, '/appointments'));
		return universal;
	}

	if (membershipRole === 'guest') {
		universal.add(businessConsolePath(businessId, '/guest'));
		return universal;
	}

	if (membershipRole === 'counter_agent') {
		universal.add(businessConsolePath(businessId, '/agent'));
	}

	if (!membershipId) return universal;

	const groupLinks = await db
		.select({ path: businessConsolePage.path })
		.from(membershipUserGroup)
		.innerJoin(
			businessUserGroupPage,
			eq(membershipUserGroup.userGroupId, businessUserGroupPage.userGroupId)
		)
		.innerJoin(businessConsolePage, eq(businessUserGroupPage.pageId, businessConsolePage.id))
		.where(eq(membershipUserGroup.membershipId, membershipId));

	for (const row of groupLinks) {
		universal.add(row.path);
	}

	return universal;
}

export async function loadMembershipForPageAccess(
	userId: string,
	businessId: string
): Promise<{ role: MembershipRole | 'platform_admin' | 'guest'; membershipId: string | null }> {
	if (await isPlatformAdmin(userId)) {
		return { role: 'platform_admin', membershipId: null };
	}
	const mem = await db.query.membership.findFirst({
		where: and(
			eq(membership.userId, userId),
			eq(membership.businessId, businessId),
			eq(membership.status, 'active')
		)
	});
	if (!mem) return { role: 'guest', membershipId: null };
	return { role: mem.role, membershipId: mem.id };
}
