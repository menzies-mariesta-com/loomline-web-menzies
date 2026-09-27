import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { queue, service, site } from '#lib/server/db/schema';
import { requireManager } from '#lib/server/qms/guards';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { business } = await requireManager(locals.user, params.businessId);
	const queues = await db.query.queue.findMany({
		where: eq(queue.businessId, business.id),
		with: { service: true, site: true }
	});
	const sites = await db.query.site.findMany({ where: eq(site.businessId, business.id) });
	const services = await db.query.service.findMany({ where: eq(service.businessId, business.id) });
	return { queues, sites, services };
};

export const actions: Actions = {
	create: async ({ request, locals, params }) => {
		const { business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const siteId = String(form.get('siteId') ?? '');
		const serviceId = String(form.get('serviceId') ?? '');
		const strategy = String(form.get('strategy') ?? 'fifo') as
			| 'fifo'
			| 'priority'
			| 'appointment_first';
		if (!name || !siteId || !serviceId) return fail(400, { message: 'Missing fields' });
		await db.insert(queue).values({
			businessId: business.id,
			siteId,
			serviceId,
			name,
			strategy,
			slaMinutes: Number(form.get('slaMinutes') ?? 30),
			almostYourTurnThreshold: Number(form.get('almostYourTurnThreshold') ?? 3),
			transferAllowed: true
		});
		return { success: true, message: 'Queue created' };
	}
};
