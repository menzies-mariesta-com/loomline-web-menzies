import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { service } from '#lib/server/db/schema';
import { requireManager } from '#lib/server/qms/guards';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { business } = await requireManager(locals.user, params.businessId);
	const services = await db.query.service.findMany({ where: eq(service.businessId, business.id) });
	return { services };
};

export const actions: Actions = {
	create: async ({ request, locals, params }) => {
		const { business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const codePrefix = String(form.get('codePrefix') ?? 'A').trim() || 'A';
		if (!name) return fail(400, { message: 'Name required' });
		await db.insert(service).values({
			businessId: business.id,
			name,
			codePrefix,
			estimatedMinutes: Number(form.get('estimatedMinutes') ?? 10),
			priorityWeight: Number(form.get('priorityWeight') ?? 0)
		});
		return { success: true, message: 'Service created' };
	},
	toggle: async ({ request, locals, params }) => {
		await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const isActive = String(form.get('isActive') ?? '') === 'true';
		await db.update(service).set({ isActive: !isActive }).where(eq(service.id, id));
		return { success: true, message: 'Service updated' };
	}
};
