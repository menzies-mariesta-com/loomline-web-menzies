import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { appointment, queue, service, site, ticket } from '#lib/server/db/schema';
import { requireGuestOrStaff } from '#lib/server/qms/guards';
import { issueTicket } from '#lib/server/qms/ticket-machine';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { business, user } = await requireGuestOrStaff(locals.user, params.businessId);
	const myTickets = await db.query.ticket.findMany({
		where: and(eq(ticket.businessId, business.id), eq(ticket.guestUserId, user.id)),
		orderBy: [desc(ticket.createdAt)],
		limit: 50
	});
	const myAppts = await db.query.appointment.findMany({
		where: and(eq(appointment.businessId, business.id), eq(appointment.guestUserId, user.id)),
		orderBy: [desc(appointment.startsAt)],
		limit: 50
	});
	const sites = await db.query.site.findMany({ where: eq(site.businessId, business.id) });
	const services = await db.query.service.findMany({ where: eq(service.businessId, business.id) });
	const queues = await db.query.queue.findMany({ where: eq(queue.businessId, business.id) });
	return { myTickets, myAppts, sites, services, queues };
};

export const actions: Actions = {
	takeNumber: async ({ request, locals, params }) => {
		const { business, user } = await requireGuestOrStaff(locals.user, params.businessId);
		const form = await request.formData();
		const queueId = String(form.get('queueId') ?? '');
		const q = await db.query.queue.findFirst({ where: eq(queue.id, queueId) });
		if (!q || q.businessId !== business.id) return fail(400, { message: 'Invalid queue' });
		const t = await issueTicket({
			businessId: business.id,
			siteId: q.siteId,
			queueId,
			source: 'web',
			guestUserId: user.id,
			phone: String(form.get('phone') ?? '') || null,
			actorUserId: user.id
		});
		return { success: true, message: `Your ticket is ${t.number}`, token: t.publicToken };
	},
	book: async ({ request, locals, params }) => {
		const { business, user } = await requireGuestOrStaff(locals.user, params.businessId);
		const form = await request.formData();
		const startsAt = new Date(String(form.get('startsAt') ?? ''));
		const siteId = String(form.get('siteId') ?? '');
		const serviceId = String(form.get('serviceId') ?? '');
		if (!siteId || !serviceId || Number.isNaN(startsAt.getTime())) {
			return fail(400, { message: 'Invalid booking' });
		}
		await db.insert(appointment).values({
			businessId: business.id,
			siteId,
			serviceId,
			guestUserId: user.id,
			guestName: user.name,
			phone: String(form.get('phone') ?? '') || null,
			startsAt,
			endsAt: new Date(startsAt.getTime() + 30 * 60_000),
			status: 'scheduled'
		});
		return { success: true, message: 'Appointment booked' };
	}
};
