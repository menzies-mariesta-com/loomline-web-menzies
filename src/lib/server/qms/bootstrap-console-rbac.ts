import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import {
	businessConsolePage,
	businessUserGroup,
	businessUserGroupPage
} from '#lib/server/db/schema';
import {
	administrationPageTemplates,
	businessConsolePath,
	CONSOLE_PAGE_TEMPLATES,
	DEFAULT_USER_GROUP_NAMES
} from '#lib/tool/business-console-pages';

/**
 * Idempotent: seed console pages + default user groups for a business.
 * Safe to call from layout load for legacy businesses.
 */
export async function ensureBusinessConsoleRbac(businessId: string): Promise<void> {
	const existingPages = await db.query.businessConsolePage.findMany({
		where: eq(businessConsolePage.businessId, businessId)
	});
	const pathToPageId = new Map(existingPages.map((p) => [p.path, p.id]));
	let catalogMutated = false;

	for (const tpl of CONSOLE_PAGE_TEMPLATES) {
		const path = businessConsolePath(businessId, tpl.pathSuffix);
		if (pathToPageId.has(path)) continue;
		const [row] = await db
			.insert(businessConsolePage)
			.values({
				businessId,
				path,
				label: tpl.pageLabel(),
				groupLabel: tpl.groupLabel(),
				sortOrder: tpl.sortOrder
			})
			.returning();
		pathToPageId.set(path, row.id);
		catalogMutated = true;
	}

	const existingGroups = await db.query.businessUserGroup.findMany({
		where: eq(businessUserGroup.businessId, businessId)
	});
	if (existingGroups.length > 0) {
		if (catalogMutated) {
			const { bumpBusinessRbacVersion } = await import('#lib/server/cache/redis');
			await bumpBusinessRbacVersion(businessId);
		}
		return;
	}

	const adminPaths = administrationPageTemplates().map((t) =>
		businessConsolePath(businessId, t.pathSuffix)
	);
	const floorPaths = [
		businessConsolePath(businessId, '/agent'),
		businessConsolePath(businessId, '/tickets'),
		businessConsolePath(businessId, '/appointments')
	];
	const guestPaths = [businessConsolePath(businessId, '/guest')];

	const [fullAdminGroup] = await db
		.insert(businessUserGroup)
		.values({
			businessId,
			name: DEFAULT_USER_GROUP_NAMES.fullAdmin,
			isSystem: true
		})
		.returning();
	const [floorGroup] = await db
		.insert(businessUserGroup)
		.values({
			businessId,
			name: DEFAULT_USER_GROUP_NAMES.floorOps,
			isSystem: true
		})
		.returning();
	const [guestGroup] = await db
		.insert(businessUserGroup)
		.values({
			businessId,
			name: DEFAULT_USER_GROUP_NAMES.guestAccess,
			isSystem: true
		})
		.returning();

	const linkPages = async (groupId: string, paths: string[]) => {
		const rows = paths
			.map((path) => pathToPageId.get(path))
			.filter((id): id is string => Boolean(id))
			.map((pageId) => ({ userGroupId: groupId, pageId }));
		if (rows.length > 0) {
			await db.insert(businessUserGroupPage).values(rows);
		}
	};

	await linkPages(fullAdminGroup.id, adminPaths);
	await linkPages(floorGroup.id, floorPaths);
	await linkPages(guestGroup.id, guestPaths);

	const { bumpBusinessRbacVersion } = await import('#lib/server/cache/redis');
	await bumpBusinessRbacVersion(businessId);
}
