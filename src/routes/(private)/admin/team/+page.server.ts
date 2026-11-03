import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { count, desc, eq, inArray } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { randomUUID } from 'node:crypto';
import { db } from '#lib/server/db';
import { account, platformAdmin, user } from '#lib/server/db/schema';
import { requirePlatformAdmin } from '#lib/server/qms/guards';
import { writeAudit } from '#lib/server/qms/audit';

export const load: PageServerLoad = async ({ locals }) => {
	await requirePlatformAdmin(locals.user);

	const admins = await db.query.platformAdmin.findMany({
		orderBy: [desc(platformAdmin.createdAt)]
	});
	const userIds = admins.map((a) => a.userId);
	const users =
		userIds.length > 0 ? await db.query.user.findMany({ where: inArray(user.id, userIds) }) : [];
	const byId = Object.fromEntries(users.map((u) => [u.id, u]));

	return {
		admins: admins.map((a) => ({
			id: a.id,
			userId: a.userId,
			createdAt: a.createdAt,
			user: byId[a.userId] ?? null
		})),
		currentUserId: locals.user?.id ?? null
	};
};

export const actions: Actions = {
	addAdmin: async ({ request, locals }) => {
		const actor = await requirePlatformAdmin(locals.user);
		const form = await request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const name = String(form.get('name') ?? '').trim();
		const password = String(form.get('password') ?? '').trim() || 'NextUpAdmin1!';

		if (!email) return fail(400, { message: 'Email is required.', success: false });

		let existingUser = await db.query.user.findFirst({ where: eq(user.email, email) });

		if (!existingUser) {
			const userId = randomUUID();
			const hashed = await hashPassword(password);
			await db.insert(user).values({
				id: userId,
				name: name || email.split('@')[0] || 'Admin',
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
			existingUser = await db.query.user.findFirst({ where: eq(user.email, email) });
		}

		if (!existingUser) {
			return fail(500, { message: 'Could not create or find user.', success: false });
		}

		const already = await db.query.platformAdmin.findFirst({
			where: eq(platformAdmin.userId, existingUser.id)
		});
		if (already) {
			return fail(400, { message: `${email} is already a platform admin.`, success: false });
		}

		const [row] = await db
			.insert(platformAdmin)
			.values({ userId: existingUser.id })
			.returning();

		await writeAudit({
			actorUserId: actor.id,
			action: 'platform_admin.add',
			entityType: 'platform_admin',
			entityId: row.id,
			payload: { email, userId: existingUser.id }
		});

		return { success: true, message: `Added ${email} as platform admin.` };
	},

	removeAdmin: async ({ request, locals }) => {
		const actor = await requirePlatformAdmin(locals.user);
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (!id) return fail(400, { message: 'Admin id is required.', success: false });

		const row = await db.query.platformAdmin.findFirst({ where: eq(platformAdmin.id, id) });
		if (!row) return fail(404, { message: 'Platform admin not found.', success: false });

		if (row.userId === actor.id) {
			return fail(400, {
				message: 'You cannot remove your own platform admin access.',
				success: false
			});
		}

		const [{ n }] = await db.select({ n: count() }).from(platformAdmin);
		if (n <= 1) {
			return fail(400, {
				message: 'Cannot remove the last platform admin.',
				success: false
			});
		}

		await db.delete(platformAdmin).where(eq(platformAdmin.id, id));

		const removedUser = await db.query.user.findFirst({ where: eq(user.id, row.userId) });

		await writeAudit({
			actorUserId: actor.id,
			action: 'platform_admin.remove',
			entityType: 'platform_admin',
			entityId: id,
			payload: { userId: row.userId, email: removedUser?.email ?? null }
		});

		return {
			success: true,
			message: `Removed ${removedUser?.email ?? 'admin'} from platform team.`
		};
	}
};
