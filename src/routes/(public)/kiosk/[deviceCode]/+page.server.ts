import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { displayDevice, queue, business } from '#lib/server/db/schema';
import { issueTicket } from '#lib/server/qms/ticket-machine';

export const prerender = false;

export const load: PageServerLoad = async ({ params }) => {
	const device = await db.query.displayDevice.findFirst({
		where: eq(displayDevice.pairingCode, params.deviceCode)
	});
	if (!device || !device.isActive || device.type !== 'kiosk') {
		throw error(404, 'Kiosk not found');
	}
	const queueIds = device.boundQueueIds?.length
		? device.boundQueueIds
		: (
				await db.query.queue.findMany({
					where: eq(queue.siteId, device.siteId)
				})
			).map((q) => q.id);

	const queues = [];
	for (const id of queueIds) {
		const q = await db.query.queue.findFirst({
			where: eq(queue.id, id),
			with: { service: true }
		});
		if (q) queues.push(q);
	}

	const biz = await db.query.business.findFirst({
		where: eq(business.id, device.businessId)
	});

	return { device, queues, businessName: biz?.name ?? 'NextUp' };
};

export const actions: Actions = {
	issue: async ({ request, params }) => {
		const device = await db.query.displayDevice.findFirst({
			where: eq(displayDevice.pairingCode, params.deviceCode)
		});
		if (!device) return fail(404, { message: 'Kiosk not found' });
		const form = await request.formData();
		const queueId = String(form.get('queueId') ?? '');
		const q = await db.query.queue.findFirst({ where: eq(queue.id, queueId) });
		if (!q || q.businessId !== device.businessId) return fail(400, { message: 'Invalid service' });
		try {
			const t = await issueTicket({
				businessId: device.businessId,
				siteId: device.siteId,
				queueId,
				source: 'kiosk',
				phone: String(form.get('phone') ?? '') || null
			});
			return {
				success: true,
				number: t.number,
				token: t.publicToken,
				message: `Ticket ${t.number}`
			};
		} catch (e) {
			return fail(400, { message: e instanceof Error ? e.message : 'Failed' });
		}
	}
};
