import { error } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '#lib/server/db';
import {
	businessConsolePage,
	businessUserGroup,
	businessUserGroupPage
} from '#lib/server/db/schema';
import type { AppUser } from '#lib/server/qms/guards';
import { requireStaffRegistrar } from '#lib/server/qms/guards';
import { writeAudit } from '#lib/server/qms/audit';
import { bumpBusinessRbacVersion } from '#lib/server/cache/redis';

export async function listUserGroupsWithPages(businessId: string) {
	const groups = await db.query.businessUserGroup.findMany({
		where: eq(businessUserGroup.businessId, businessId),
		with: {
			pageLinks: { with: { page: true } }
		}
	});
	const pages = await db.query.businessConsolePage.findMany({
		where: eq(businessConsolePage.businessId, businessId),
		orderBy: (p, { asc }) => [asc(p.sortOrder), asc(p.label)]
	});
	return { groups, pages };
}

export async function createUserGroup(actor: AppUser, businessId: string, name: string) {
	await requireStaffRegistrar(actor, businessId);
	const trimmed = name.trim();
	if (!trimmed) throw error(400, 'Name is required');
	const [row] = await db
		.insert(businessUserGroup)
		.values({ businessId, name: trimmed, isSystem: false })
		.returning();
	await writeAudit({
		actorUserId: actor.id,
		businessId,
		action: 'user_group.create',
		entityType: 'business_user_group',
		entityId: row.id
	});
	await bumpBusinessRbacVersion(businessId);
	return row;
}

export async function setPagesForUserGroup(
	actor: AppUser,
	businessId: string,
	userGroupId: string,
	pageIds: string[]
) {
	await requireStaffRegistrar(actor, businessId);
	const group = await db.query.businessUserGroup.findFirst({
		where: and(eq(businessUserGroup.id, userGroupId), eq(businessUserGroup.businessId, businessId))
	});
	if (!group) throw error(404, 'User group not found');

	const pages = await db.query.businessConsolePage.findMany({
		where: and(
			eq(businessConsolePage.businessId, businessId),
			inArray(businessConsolePage.id, pageIds)
		)
	});
	if (pageIds.length > 0 && pages.length !== pageIds.length) {
		throw error(400, 'Invalid page selection');
	}

	await db.delete(businessUserGroupPage).where(eq(businessUserGroupPage.userGroupId, userGroupId));
	if (pageIds.length > 0) {
		await db.insert(businessUserGroupPage).values(
			pageIds.map((pageId) => ({ userGroupId, pageId }))
		);
	}

	await writeAudit({
		actorUserId: actor.id,
		businessId,
		action: 'user_group.set_pages',
		entityType: 'business_user_group',
		entityId: userGroupId,
		payload: { pageCount: pageIds.length }
	});
	await bumpBusinessRbacVersion(businessId);
}

export async function renameUserGroup(
	actor: AppUser,
	businessId: string,
	userGroupId: string,
	name: string
) {
	await requireStaffRegistrar(actor, businessId);
	const group = await db.query.businessUserGroup.findFirst({
		where: and(eq(businessUserGroup.id, userGroupId), eq(businessUserGroup.businessId, businessId))
	});
	if (!group) throw error(404, 'User group not found');
	if (group.isSystem) throw error(403, 'System groups cannot be renamed');
	const trimmed = name.trim();
	if (!trimmed) throw error(400, 'Name is required');
	await db
		.update(businessUserGroup)
		.set({ name: trimmed })
		.where(eq(businessUserGroup.id, userGroupId));
	return { ok: true };
}

export async function deleteUserGroup(actor: AppUser, businessId: string, userGroupId: string) {
	await requireStaffRegistrar(actor, businessId);
	const group = await db.query.businessUserGroup.findFirst({
		where: and(eq(businessUserGroup.id, userGroupId), eq(businessUserGroup.businessId, businessId))
	});
	if (!group) throw error(404, 'User group not found');
	if (group.isSystem) throw error(403, 'System groups cannot be deleted');
	await db.delete(businessUserGroup).where(eq(businessUserGroup.id, userGroupId));
	await writeAudit({
		actorUserId: actor.id,
		businessId,
		action: 'user_group.delete',
		entityType: 'business_user_group',
		entityId: userGroupId
	});
	await bumpBusinessRbacVersion(businessId);
	return { ok: true };
}
