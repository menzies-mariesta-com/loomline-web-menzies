import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { counter, ticket, ticketEvent } from '#lib/server/db/schema';
import { getQueueWaiting } from '#lib/server/qms/ticket-machine';

export const load: PageServerLoad = async ({ params }) => {
	const t = await db.query.ticket.findFirst({
		where: eq(ticket.publicToken, params.publicToken),
		with: { queue: true, business: true }
	});
	if (!t) throw error(404, 'Ticket not found');

	const waiting = await getQueueWaiting(t.queueId);
	const position = waiting.findIndex((w) => w.id === t.id) + 1;
	const events = await db.query.ticketEvent.findMany({
		where: eq(ticketEvent.ticketId, t.id)
	});
	let counterLabel = '';
	if (t.counterId) {
		const c = await db.query.counter.findFirst({ where: eq(counter.id, t.counterId) });
		counterLabel = c?.label ?? '';
	}

	return {
		ticket: t,
		position: position > 0 ? position : null,
		waitingCount: waiting.length,
		events,
		counterLabel
	};
};
