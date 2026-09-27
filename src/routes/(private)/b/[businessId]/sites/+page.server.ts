import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { site } from '#lib/server/db/schema';
import { requireManager } from '#lib/server/qms/guards';
import { slugify } from '#lib/server/qms/ids';
import { writeAudit } from '#lib/server/qms/audit';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { business } = await requireManager(locals.user, params.businessId);
	const sites = await db.query.site.findMany({ where: eq(site.businessId, business.id) });
	return { sites };
};

export const actions: Actions = {
	create: async ({ request, locals, params }) => {
		const { user, business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { message: 'Name required' });
		let slug = slugify(name);
		const [row] = await db
			.insert(site)
			.values({ businessId: business.id, name, slug, address: String(form.get('address') ?? '') })
			.returning();
		await writeAudit({
			actorUserId: user.id,
			businessId: business.id,
			action: 'site.create',
			entityType: 'site',
			entityId: row.id
		});
		return { success: true, message: 'Site created' };
	},
	toggle: async ({ request, locals, params }) => {
		const { user, business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const isOpen = String(form.get('isOpen') ?? '') === 'true';
		await db.update(site).set({ isOpen: !isOpen }).where(eq(site.id, id));
		await writeAudit({
			actorUserId: user.id,
			businessId: business.id,
			action: 'site.toggle',
			entityType: 'site',
			entityId: id
		});
		return { success: true, message: 'Site updated' };
	}
};
