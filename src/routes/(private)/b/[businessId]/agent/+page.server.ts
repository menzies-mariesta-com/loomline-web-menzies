import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import {
	counter,
	department,
	destination,
	displayDevice,
	queue,
	ticket
} from '#lib/server/db/schema';
import { requireStaff } from '#lib/server/qms/guards';
import {
	callNext,
	callTicket,
	completeTicket,
	getTicketTimeline,
	holdTicket,
	issueTicket,
	markNoShow,
	recallTicket,
	redirectTicket,
	startServing,
	transferTicket
} from '#lib/server/qms/ticket-machine';

function actionFail(error: unknown, fallback: string) {
	const message = error instanceof Error ? error.message : fallback;
	return fail(400, { message, success: false as const });
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { business, user } = await requireStaff(locals.user, params.businessId);
	const prefillFromUrl = url.searchParams.get('counterId') ?? '';

	const stationDevice = await db.query.displayDevice.findFirst({
		where: and(
			eq(displayDevice.businessId, business.id),
			eq(displayDevice.agentUserId, user.id),
			eq(displayDevice.type, 'agent'),
			eq(displayDevice.isActive, true)
		)
	});
	const prefillCounterId =
		prefillFromUrl || stationDevice?.boundCounterIds?.[0] || '';

	const queues = await db.query.queue.findMany({
		where: eq(queue.businessId, business.id),
		with: { service: true }
	});
	const [counters, departments, destinations, tickets] = await Promise.all([
		db.select().from(counter).where(eq(counter.businessId, business.id)),
		db.select().from(department).where(eq(department.businessId, business.id)),
		db.select().from(destination).where(eq(destination.businessId, business.id)),
		db
			.select()
			.from(ticket)
			.where(eq(ticket.businessId, business.id))
			.orderBy(desc(ticket.createdAt))
			.limit(100)
	]);
	const deptById = Object.fromEntries(departments.map((d) => [d.id, d]));
	const countersEnriched = counters.map((c) => ({
		...c,
		department: c.departmentId ? (deptById[c.departmentId] ?? null) : null
	}));

	const activeDestinations = destinations.filter((d) => d.active);

	return {
		queues,
		counters: countersEnriched,
		destinations: activeDestinations,
		tickets,
		userId: user.id,
		prefillCounterId,
		stationDeviceName: stationDevice?.name ?? null
	};
};

export const actions: Actions = {
	issue: async ({ request, locals, params }) => {
		const { business, user } = await requireStaff(locals.user, params.businessId);
		const form = await request.formData();
		const queueId = String(form.get('queueId') ?? '');
		const q = await db.query.queue.findFirst({ where: eq(queue.id, queueId) });
		if (!q) return fail(400, { message: 'Queue not found', success: false as const });
		try {
			const t = await issueTicket({
				businessId: business.id,
				siteId: q.siteId,
				queueId,
				source: 'agent',
				phone: String(form.get('phone') ?? '') || null,
				priority: Number(form.get('priority') ?? 0),
				actorUserId: user.id
			});
			return { success: true as const, message: `Issued ${t.number}` };
		} catch (e) {
			return actionFail(e, 'Issue failed');
		}
	},
	callNext: async ({ request, locals, params }) => {
		const { business, user } = await requireStaff(locals.user, params.businessId);
		const form = await request.formData();
		try {
			const t = await callNext({
				queueId: String(form.get('queueId') ?? ''),
				counterId: String(form.get('counterId') ?? ''),
				actorUserId: user.id,
				businessId: business.id
			});
			return {
				success: true as const,
				message: t ? `Called ${t.number}` : 'Queue empty — issue a ticket first'
			};
		} catch (e) {
			return actionFail(e, 'Call failed');
		}
	},
	callTicket: async ({ request, locals, params }) => {
		const { business, user } = await requireStaff(locals.user, params.businessId);
		const form = await request.formData();
		try {
			const t = await callTicket({
				ticketId: String(form.get('ticketId') ?? ''),
				counterId: String(form.get('counterId') ?? ''),
				actorUserId: user.id,
				businessId: business.id
			});
			return { success: true as const, message: `Called ${t.number}` };
		} catch (e) {
			return actionFail(e, 'Call failed');
		}
	},
	recall: async ({ request, locals, params }) => {
		const { user } = await requireStaff(locals.user, params.businessId);
		const form = await request.formData();
		try {
			await recallTicket(String(form.get('ticketId') ?? ''), user.id);
			return { success: true as const, message: 'Recalled' };
		} catch (e) {
			return actionFail(e, 'Recall failed');
		}
	},
	serve: async ({ request, locals, params }) => {
		const { user } = await requireStaff(locals.user, params.businessId);
		const form = await request.formData();
		try {
			await startServing(String(form.get('ticketId') ?? ''), user.id);
			return { success: true as const, message: 'Serving' };
		} catch (e) {
			return actionFail(e, 'Serve failed');
		}
	},
	complete: async ({ request, locals, params }) => {
		const { user } = await requireStaff(locals.user, params.businessId);
		const form = await request.formData();
		try {
			await completeTicket(String(form.get('ticketId') ?? ''), user.id);
			return { success: true as const, message: 'Completed' };
		} catch (e) {
			return actionFail(e, 'Complete failed');
		}
	},
	noShow: async ({ request, locals, params }) => {
		const { user } = await requireStaff(locals.user, params.businessId);
		const form = await request.formData();
		try {
			await markNoShow(String(form.get('ticketId') ?? ''), user.id);
			return { success: true as const, message: 'No-show' };
		} catch (e) {
			return actionFail(e, 'No-show failed');
		}
	},
	hold: async ({ request, locals, params }) => {
		const { user } = await requireStaff(locals.user, params.businessId);
		const form = await request.formData();
		try {
			await holdTicket(String(form.get('ticketId') ?? ''), user.id);
			return { success: true as const, message: 'Held' };
		} catch (e) {
			return actionFail(e, 'Hold failed');
		}
	},
	transfer: async ({ request, locals, params }) => {
		const { user } = await requireStaff(locals.user, params.businessId);
		const form = await request.formData();
		try {
			const t = await transferTicket({
				ticketId: String(form.get('ticketId') ?? ''),
				toQueueId: String(form.get('toQueueId') ?? ''),
				reason: String(form.get('reason') ?? ''),
				actorUserId: user.id
			});
			return { success: true as const, message: `Transferred to ${t?.number}` };
		} catch (e) {
			return actionFail(e, 'Transfer failed');
		}
	},
	redirect: async ({ request, locals, params }) => {
		const { user } = await requireStaff(locals.user, params.businessId);
		const form = await request.formData();
		try {
			const t = await redirectTicket({
				ticketId: String(form.get('ticketId') ?? ''),
				destinationId: String(form.get('destinationId') ?? ''),
				toQueueId: String(form.get('toQueueId') ?? '') || null,
				timelineStepId: String(form.get('timelineStepId') ?? '') || null,
				reason: String(form.get('reason') ?? ''),
				actorUserId: user.id
			});
			return { success: true as const, message: `Redirected ${t?.number ?? ''}` };
		} catch (e) {
			return actionFail(e, 'Redirect failed');
		}
	},
	timeline: async ({ request, locals, params }) => {
		await requireStaff(locals.user, params.businessId);
		const form = await request.formData();
		const ticketId = String(form.get('ticketId') ?? '');
		if (!ticketId) return fail(400, { message: 'Ticket required', success: false as const });
		const events = await getTicketTimeline(ticketId);
		return { success: true as const, events, ticketId, message: `Timeline (${events.length})` };
	}
};
