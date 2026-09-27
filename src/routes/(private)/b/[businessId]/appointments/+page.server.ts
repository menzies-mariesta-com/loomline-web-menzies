import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { appointment, queue, service, site } from '#lib/server/db/schema';
import { requireManager } from '#lib/server/qms/guards';
import { issueTicket } from '#lib/server/qms/ticket-machine';
import { enqueueNotification } from '#lib/server/qms/notify';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { business } = await requireManager(locals.user, params.businessId);
	const [appointments, sites, services] = await Promise.all([
		db
			.select()
			.from(appointment)
			.where(eq(appointment.businessId, business.id))
			.orderBy(desc(appointment.startsAt))
			.limit(100),
		db.query.site.findMany({ where: eq(site.businessId, business.id) }),
		db.query.service.findMany({ where: eq(service.businessId, business.id) })
	]);
	const siteById = Object.fromEntries(sites.map((s) => [s.id, s]));
	const serviceById = Object.fromEntries(services.map((s) => [s.id, s]));
	const appointmentsEnriched = appointments.map((a) => ({
		...a,
		site: siteById[a.siteId] ?? null,
		service: serviceById[a.serviceId] ?? null
	}));
	return { appointments: appointmentsEnriched, sites, services };
};

export const actions: Actions = {
	create: async ({ request, locals, params }) => {
		const { business, user } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const siteId = String(form.get('siteId') ?? '');
		const serviceId = String(form.get('serviceId') ?? '');
		const startsAt = new Date(String(form.get('startsAt') ?? ''));
		const duration = Number(form.get('durationMinutes') ?? 30);
		if (!siteId || !serviceId || Number.isNaN(startsAt.getTime())) {
			return fail(400, { message: 'Invalid appointment fields', success: false });
		}
		const endsAt = new Date(startsAt.getTime() + duration * 60_000);
		const phone = String(form.get('phone') ?? '') || null;
		const [row] = await db
			.insert(appointment)
			.values({
				businessId: business.id,
				siteId,
				serviceId,
				guestName: String(form.get('guestName') ?? '') || null,
				phone,
				email: String(form.get('email') ?? '') || null,
				startsAt,
				endsAt,
				status: 'scheduled',
				guestUserId: null
			})
			.returning();

		if (phone) {
			await enqueueNotification({
				businessId: business.id,
				channel: 'sms',
				toAddress: phone,
				templateKey: 'appointment_reminder',
				payload: {
					body: `Appointment at ${startsAt.toISOString()} for ${business.name}.`
				},
				scheduledAt: new Date(startsAt.getTime() - 60 * 60_000)
			});
		}

		void user;
		return { success: true, message: `Appointment ${row.id.slice(0, 8)} booked` };
	},

	checkIn: async ({ request, locals, params }) => {
		const { business, user } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const appt = await db.query.appointment.findFirst({ where: eq(appointment.id, id) });
		if (!appt || appt.businessId !== business.id) {
			return fail(404, { message: 'Not found', success: false });
		}

		const q = await db.query.queue.findFirst({
			where: eq(queue.serviceId, appt.serviceId)
		});
		if (!q) return fail(400, { message: 'No queue for service', success: false });

		const t = await issueTicket({
			businessId: business.id,
			siteId: appt.siteId,
			queueId: q.id,
			source: 'appointment',
			phone: appt.phone,
			email: appt.email,
			guestUserId: appt.guestUserId,
			priority: 20,
			appointmentId: appt.id,
			actorUserId: user.id
		});

		await db
			.update(appointment)
			.set({ status: 'converted', ticketId: t.id })
			.where(eq(appointment.id, appt.id));

		return { success: true, message: `Checked in as ${t.number}` };
	},

	cancel: async ({ request, locals, params }) => {
		await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		await db
			.update(appointment)
			.set({ status: 'cancelled' })
			.where(eq(appointment.id, String(form.get('id') ?? '')));
		return { success: true, message: 'Cancelled' };
	}
};
