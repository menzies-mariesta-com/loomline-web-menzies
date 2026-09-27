import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { platformConfigProfile } from '#lib/server/db/schema';
import { requirePlatformAdmin } from '#lib/server/qms/guards';
import { ensureConfigProfilesSeeded } from '#lib/server/qms/config-profiles';
import { writeAudit } from '#lib/server/qms/audit';

export const load: PageServerLoad = async ({ locals }) => {
	await requirePlatformAdmin(locals.user);
	await ensureConfigProfilesSeeded();
	const configs = await db.query.platformConfigProfile.findMany({
		orderBy: [desc(platformConfigProfile.updatedAt)]
	});
	return { configs };
};

export const actions: Actions = {
	createConfig: async ({ request, locals }) => {
		const admin = await requirePlatformAdmin(locals.user);
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const timezone = String(form.get('timezone') ?? '').trim() || 'Asia/Yangon';
		const locale = String(form.get('locale') ?? '').trim() || 'en';
		const dateFormat = String(form.get('dateFormat') ?? '').trim() || 'MMM d, yyyy';
		const timeFormat = String(form.get('timeFormat') ?? '').trim() || 'HH:mm';
		const currency = String(form.get('currency') ?? '').trim() || 'MMK';

		if (!name) return fail(400, { message: 'Name is required.', success: false });

		const [row] = await db
			.insert(platformConfigProfile)
			.values({ name, timezone, locale, dateFormat, timeFormat, currency })
			.returning();

		await writeAudit({
			actorUserId: admin.id,
			action: 'config.create',
			entityType: 'platform_config_profile',
			entityId: row.id,
			payload: { name }
		});

		return { success: true, message: `Config "${row.name}" created.` };
	},

	updateConfig: async ({ request, locals }) => {
		const admin = await requirePlatformAdmin(locals.user);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const name = String(form.get('name') ?? '').trim();
		const timezone = String(form.get('timezone') ?? '').trim() || 'Asia/Yangon';
		const locale = String(form.get('locale') ?? '').trim() || 'en';
		const dateFormat = String(form.get('dateFormat') ?? '').trim() || 'MMM d, yyyy';
		const timeFormat = String(form.get('timeFormat') ?? '').trim() || 'HH:mm';
		const currency = String(form.get('currency') ?? '').trim() || 'MMK';

		if (!id || !name) return fail(400, { message: 'Id and name are required.', success: false });

		const [row] = await db
			.update(platformConfigProfile)
			.set({ name, timezone, locale, dateFormat, timeFormat, currency })
			.where(eq(platformConfigProfile.id, id))
			.returning();

		if (!row) return fail(404, { message: 'Config not found.', success: false });

		await writeAudit({
			actorUserId: admin.id,
			action: 'config.update',
			entityType: 'platform_config_profile',
			entityId: row.id,
			payload: { name }
		});

		return { success: true, message: `Config "${row.name}" updated.` };
	},

	deleteConfig: async ({ request, locals }) => {
		const admin = await requirePlatformAdmin(locals.user);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { message: 'Id is required.', success: false });

		const [row] = await db
			.delete(platformConfigProfile)
			.where(eq(platformConfigProfile.id, id))
			.returning();

		if (!row) return fail(404, { message: 'Config not found.', success: false });

		await writeAudit({
			actorUserId: admin.id,
			action: 'config.delete',
			entityType: 'platform_config_profile',
			entityId: id,
			payload: { name: row.name }
		});

		return { success: true, message: `Config "${row.name}" deleted.` };
	}
};
