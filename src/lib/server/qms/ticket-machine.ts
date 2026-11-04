import { and, asc, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '#lib/server/db';
import {
	counter,
	counterService,
	destination,
	queue,
	serviceTimeline,
	serviceTimelineStep,
	site,
	ticket,
	ticketEvent,
	transfer,
	voiceProfile
} from '#lib/server/db/schema';
import { buildAnnounceVoiceConfig } from '#lib/util/voice';
import { enqueueNotification } from '#lib/server/qms/notify';
import { formatTicketNumber, randomToken } from '#lib/server/qms/ids';
import { withQueueIssueLock } from '#lib/server/cache/redis';

export type TicketRow = typeof ticket.$inferSelect;

export type IssueTicketInput = {
	businessId: string;
	siteId: string;
	queueId: string;
	source: 'kiosk' | 'web' | 'qr' | 'appointment' | 'agent' | 'api';
	guestUserId?: string | null;
	phone?: string | null;
	email?: string | null;
	priority?: number;
	appointmentId?: string | null;
	actorUserId?: string | null;
};

async function nextSequence(queueId: string): Promise<number> {
	const latest = await db.query.ticket.findFirst({
		where: eq(ticket.queueId, queueId),
		orderBy: [desc(ticket.sequence)]
	});
	return (latest?.sequence ?? 0) + 1;
}

export function isUniqueViolation(err: unknown): boolean {
	if (!(err instanceof Error)) return false;
	const msg = err.message.toLowerCase();
	return msg.includes('unique') || msg.includes('duplicate') || msg.includes('23505');
}

async function issueTicketInner(input: IssueTicketInput) {
	const q = await db.query.queue.findFirst({
		where: eq(queue.id, input.queueId),
		with: { service: true }
	});
	if (!q || !q.isActive) throw new Error('Queue not available');

	const waitingCount = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(ticket)
		.where(and(eq(ticket.queueId, q.id), inArray(ticket.status, ['waiting', 'called', 'held'])));

	if ((waitingCount[0]?.count ?? 0) >= q.maxWaiting) {
		throw new Error('Queue is full');
	}

	const sequence = await nextSequence(q.id);
	const prefix = q.service?.codePrefix ?? 'A';
	const priority =
		input.priority ??
		(q.strategy === 'priority' ? (q.service?.priorityWeight ?? 0) : input.priority ?? 0);

	const [created] = await db
		.insert(ticket)
		.values({
			businessId: input.businessId,
			siteId: input.siteId,
			queueId: input.queueId,
			guestUserId: input.guestUserId ?? null,
			number: formatTicketNumber(prefix, sequence),
			sequence,
			status: 'waiting',
			source: input.source,
			priority,
			phone: input.phone ?? null,
			email: input.email ?? null,
			publicToken: randomToken(18),
			appointmentId: input.appointmentId ?? null
		})
		.returning();

	await db.insert(ticketEvent).values({
		ticketId: created.id,
		businessId: created.businessId,
		type: 'created',
		actorUserId: input.actorUserId ?? null,
		payload: { source: input.source, number: created.number }
	});

	await db.insert(ticketEvent).values({
		ticketId: created.id,
		businessId: created.businessId,
		type: 'waiting',
		actorUserId: input.actorUserId ?? null,
		payload: {}
	});

	if (created.phone) {
		await enqueueNotification({
			businessId: created.businessId,
			channel: 'sms',
			toAddress: created.phone,
			templateKey: 'ticket_issued',
			payload: {
				body: `Your NextUp ticket is ${created.number}. Track: /t/${created.publicToken}`
			}
		});
	}

	return created;
}

export async function issueTicket(input: IssueTicketInput) {
	return withQueueIssueLock(input.queueId, async () => {
		for (let attempt = 0; attempt < 3; attempt++) {
			try {
				return await issueTicketInner(input);
			} catch (err) {
				if (attempt < 2 && isUniqueViolation(err)) continue;
				throw err;
			}
		}
		throw new Error('Could not issue ticket');
	});
}

async function writeEvent(
	ticketId: string,
	businessId: string,
	type: typeof ticketEvent.$inferInsert.type,
	actorUserId: string | null | undefined,
	payload: Record<string, unknown> = {}
) {
	await db.insert(ticketEvent).values({
		ticketId,
		businessId,
		type,
		actorUserId: actorUserId ?? null,
		payload
	});
}

export async function callNext(opts: {
	queueId: string;
	counterId: string;
	actorUserId: string;
	businessId: string;
}) {
	const q = await assertCounterCanServeQueue({
		counterId: opts.counterId,
		queueId: opts.queueId,
		businessId: opts.businessId
	});

	const orderBy =
		q.strategy === 'priority' || q.strategy === 'appointment_first'
			? [desc(ticket.priority), asc(ticket.sequence)]
			: [asc(ticket.sequence)];

	const next = await db.query.ticket.findFirst({
		where: and(eq(ticket.queueId, opts.queueId), eq(ticket.status, 'waiting')),
		orderBy
	});

	if (!next) return null;

	return markTicketCalled({
		ticketRow: next,
		counterId: opts.counterId,
		actorUserId: opts.actorUserId,
		queueId: opts.queueId,
		almostYourTurnThreshold: q.almostYourTurnThreshold,
		slaMinutes: q.slaMinutes
	});
}

async function assertCounterCanServeQueue(opts: {
	counterId: string;
	queueId: string;
	businessId: string;
}) {
	const q = await db.query.queue.findFirst({ where: eq(queue.id, opts.queueId) });
	if (!q) throw new Error('Queue not found');

	const c = await db.query.counter.findFirst({ where: eq(counter.id, opts.counterId) });
	if (!c || c.businessId !== opts.businessId) throw new Error('Counter not found');

	const bindings = await db.query.counterService.findMany({
		where: eq(counterService.counterId, opts.counterId)
	});
	if (bindings.length > 0) {
		const allowed = bindings.some((b) => b.serviceId === q.serviceId);
		if (!allowed) throw new Error('This counter cannot serve this queue service');
	}
	return q;
}

async function markTicketCalled(opts: {
	ticketRow: TicketRow;
	counterId: string;
	actorUserId: string;
	queueId: string;
	almostYourTurnThreshold: number;
	slaMinutes: number;
}) {
	const [updated] = await db
		.update(ticket)
		.set({
			status: 'called',
			counterId: opts.counterId,
			calledAt: new Date()
		})
		.where(and(eq(ticket.id, opts.ticketRow.id), eq(ticket.status, 'waiting')))
		.returning();

	if (!updated) throw new Error('Ticket was already updated — refresh and try again');

	await writeEvent(updated.id, updated.businessId, 'called', opts.actorUserId, {
		counterId: opts.counterId
	});

	if (updated.phone) {
		await enqueueNotification({
			businessId: updated.businessId,
			channel: 'sms',
			toAddress: updated.phone,
			templateKey: 'ticket_called',
			payload: { body: `Ticket ${updated.number} is now being called.` }
		});
	}

	await maybeFlagAlmostYourTurn(opts.queueId, opts.almostYourTurnThreshold);
	await maybeFlagSlaBreaches(opts.queueId, opts.slaMinutes);

	return updated;
}

/** Call a specific waiting ticket (row action on agent desk). */
export async function callTicket(opts: {
	ticketId: string;
	counterId: string;
	actorUserId: string;
	businessId: string;
}) {
	const existing = await db.query.ticket.findFirst({ where: eq(ticket.id, opts.ticketId) });
	if (!existing || existing.businessId !== opts.businessId) throw new Error('Ticket not found');
	if (existing.status !== 'waiting') throw new Error('Only waiting tickets can be called');

	const q = await assertCounterCanServeQueue({
		counterId: opts.counterId,
		queueId: existing.queueId,
		businessId: opts.businessId
	});

	return markTicketCalled({
		ticketRow: existing,
		counterId: opts.counterId,
		actorUserId: opts.actorUserId,
		queueId: existing.queueId,
		almostYourTurnThreshold: q.almostYourTurnThreshold,
		slaMinutes: q.slaMinutes
	});
}

async function maybeFlagAlmostYourTurn(queueId: string, threshold: number) {
	const waiting = await db.query.ticket.findMany({
		where: and(eq(ticket.queueId, queueId), eq(ticket.status, 'waiting')),
		orderBy: [desc(ticket.priority), asc(ticket.sequence)],
		limit: threshold
	});
	for (const t of waiting) {
		await writeEvent(t.id, t.businessId, 'almost_your_turn', null, { threshold });
		if (t.phone) {
			await enqueueNotification({
				businessId: t.businessId,
				channel: 'sms',
				toAddress: t.phone,
				templateKey: 'almost_your_turn',
				payload: { body: `Ticket ${t.number}: you are almost next.` }
			});
		}
	}
}

async function maybeFlagSlaBreaches(queueId: string, slaMinutes: number) {
	const waiting = await db.query.ticket.findMany({
		where: and(eq(ticket.queueId, queueId), eq(ticket.status, 'waiting'))
	});
	const cutoff = Date.now() - slaMinutes * 60_000;
	for (const t of waiting) {
		if (t.createdAt.getTime() < cutoff) {
			await writeEvent(t.id, t.businessId, 'sla_breach', null, { slaMinutes });
		}
	}
}

export async function recallTicket(ticketId: string, actorUserId: string) {
	const existing = await db.query.ticket.findFirst({ where: eq(ticket.id, ticketId) });
	if (!existing || existing.status !== 'called') throw new Error('Ticket not in called state');
	const [updated] = await db
		.update(ticket)
		.set({ calledAt: new Date() })
		.where(and(eq(ticket.id, ticketId), eq(ticket.status, 'called')))
		.returning();
	if (!updated) throw new Error('Ticket not in called state');
	await writeEvent(updated.id, updated.businessId, 'recalled', actorUserId, {});
	return updated;
}

export async function startServing(ticketId: string, actorUserId: string) {
	const [updated] = await db
		.update(ticket)
		.set({ status: 'serving', servedAt: new Date() })
		.where(and(eq(ticket.id, ticketId), inArray(ticket.status, ['called', 'held'])))
		.returning();
	if (!updated) throw new Error('Cannot start serving');
	await writeEvent(updated.id, updated.businessId, 'serving', actorUserId, {});
	return updated;
}

export async function completeTicket(ticketId: string, actorUserId: string) {
	const [updated] = await db
		.update(ticket)
		.set({ status: 'completed', completedAt: new Date() })
		.where(and(eq(ticket.id, ticketId), inArray(ticket.status, ['serving', 'called'])))
		.returning();
	if (!updated) throw new Error('Cannot complete ticket');
	await writeEvent(updated.id, updated.businessId, 'completed', actorUserId, {});
	return updated;
}

export async function markNoShow(ticketId: string, actorUserId: string) {
	const [updated] = await db
		.update(ticket)
		.set({ status: 'no_show', completedAt: new Date() })
		.where(and(eq(ticket.id, ticketId), inArray(ticket.status, ['called', 'waiting', 'held'])))
		.returning();
	if (!updated) throw new Error('Cannot mark no-show');
	await writeEvent(updated.id, updated.businessId, 'no_show', actorUserId, {});
	return updated;
}

export async function holdTicket(ticketId: string, actorUserId: string, holdMinutes = 10) {
	const holdUntil = new Date(Date.now() + holdMinutes * 60_000);
	const [updated] = await db
		.update(ticket)
		.set({ status: 'held', holdUntil })
		.where(and(eq(ticket.id, ticketId), inArray(ticket.status, ['called', 'serving', 'waiting'])))
		.returning();
	if (!updated) throw new Error('Cannot hold ticket');
	await writeEvent(updated.id, updated.businessId, 'held', actorUserId, { holdUntil });
	return updated;
}

export async function transferTicket(opts: {
	ticketId: string;
	toQueueId: string;
	toCounterId?: string | null;
	reason?: string;
	actorUserId: string;
}) {
	const existing = await db.query.ticket.findFirst({ where: eq(ticket.id, opts.ticketId) });
	if (!existing) throw new Error('Ticket not found');

	const target = await db.query.queue.findFirst({
		where: eq(queue.id, opts.toQueueId),
		with: { service: true }
	});
	if (!target || !target.transferAllowed) throw new Error('Transfer not allowed');

	return withQueueIssueLock(target.id, async () => {
		const sequence = await nextSequence(target.id);
		const prefix = target.service?.codePrefix ?? 'A';

		await db.insert(transfer).values({
			ticketId: existing.id,
			businessId: existing.businessId,
			fromQueueId: existing.queueId,
			toQueueId: opts.toQueueId,
			fromCounterId: existing.counterId,
			toCounterId: opts.toCounterId ?? null,
			reason: opts.reason ?? null,
			actorUserId: opts.actorUserId
		});

		const [updated] = await db
			.update(ticket)
			.set({
				status: 'waiting',
				queueId: opts.toQueueId,
				counterId: opts.toCounterId ?? null,
				number: formatTicketNumber(prefix, sequence),
				sequence,
				calledAt: null,
				servedAt: null
			})
			.where(and(eq(ticket.id, existing.id), inArray(ticket.status, ['waiting', 'called', 'held', 'serving'])))
			.returning();

		if (!updated) throw new Error('Ticket was already updated — refresh and try again');

		await writeEvent(existing.id, existing.businessId, 'transferred', opts.actorUserId, {
			fromQueueId: existing.queueId,
			toQueueId: opts.toQueueId,
			reason: opts.reason
		});
		await writeEvent(existing.id, existing.businessId, 'waiting', opts.actorUserId, {});

		return updated;
	});
}

/** Redirect ticket to a destination (department/counter/external) and optional next timeline step. */
export async function redirectTicket(opts: {
	ticketId: string;
	destinationId: string;
	toQueueId?: string | null;
	timelineStepId?: string | null;
	reason?: string;
	actorUserId: string;
}) {
	const existing = await db.query.ticket.findFirst({ where: eq(ticket.id, opts.ticketId) });
	if (!existing) throw new Error('Ticket not found');

	const dest = await db.query.destination.findFirst({
		where: eq(destination.id, opts.destinationId)
	});
	if (!dest || !dest.active || dest.businessId !== existing.businessId) {
		throw new Error('Destination not available');
	}

	let toQueueId = opts.toQueueId ?? null;
	let toCounterId: string | null = dest.type === 'counter' ? dest.targetCounterId : null;

	if (!toQueueId && dest.type === 'counter' && dest.targetCounterId) {
		const c = await db.query.counter.findFirst({ where: eq(counter.id, dest.targetCounterId) });
		if (c) {
			const siteQueues = await db.query.queue.findMany({
				where: and(eq(queue.siteId, c.siteId), eq(queue.isActive, true))
			});
			const bound = await db.query.counterService.findMany({
				where: eq(counterService.counterId, c.id)
			});
			const allowedServiceIds = new Set(bound.map((b) => b.serviceId));
			const match =
				bound.length === 0
					? siteQueues[0]
					: siteQueues.find((q) => allowedServiceIds.has(q.serviceId));
			toQueueId = match?.id ?? null;
		}
	}

	if (!toQueueId && dest.type === 'department' && dest.targetDepartmentId) {
		const deptQueues = await db.query.queue.findMany({
			where: and(eq(queue.businessId, existing.businessId), eq(queue.isActive, true)),
			limit: 50
		});
		toQueueId = deptQueues[0]?.id ?? existing.queueId;
	}

	if (!toQueueId) toQueueId = existing.queueId;

	const target = await db.query.queue.findFirst({
		where: eq(queue.id, toQueueId),
		with: { service: true }
	});
	if (!target) throw new Error('Target queue not found');

	return withQueueIssueLock(target.id, async () => {
		const sequence = await nextSequence(target.id);
		const prefix = target.service?.codePrefix ?? 'A';

		await db.insert(transfer).values({
			ticketId: existing.id,
			businessId: existing.businessId,
			fromQueueId: existing.queueId,
			toQueueId,
			fromCounterId: existing.counterId,
			toCounterId,
			reason: opts.reason ?? `Redirect to ${dest.name}`,
			actorUserId: opts.actorUserId
		});

		const [updated] = await db
			.update(ticket)
			.set({
				status: 'waiting',
				queueId: toQueueId,
				counterId: toCounterId,
				destinationId: dest.id,
				timelineStepId: opts.timelineStepId ?? null,
				number: formatTicketNumber(prefix, sequence),
				sequence,
				calledAt: null,
				servedAt: null
			})
			.where(and(eq(ticket.id, existing.id), inArray(ticket.status, ['waiting', 'called', 'held', 'serving'])))
			.returning();

		if (!updated) throw new Error('Ticket was already updated — refresh and try again');

		await writeEvent(existing.id, existing.businessId, 'redirected', opts.actorUserId, {
			destinationId: dest.id,
			destinationName: dest.name,
			toQueueId,
			timelineStepId: opts.timelineStepId,
			reason: opts.reason
		});
		await writeEvent(existing.id, existing.businessId, 'waiting', opts.actorUserId, {});

		return updated;
	});
}

export async function getTicketTimeline(ticketId: string) {
	return db.query.ticketEvent.findMany({
		where: eq(ticketEvent.ticketId, ticketId),
		orderBy: [asc(ticketEvent.createdAt)]
	});
}

export async function getServiceTimelineSteps(serviceId: string) {
	const tl = await db.query.serviceTimeline.findFirst({
		where: and(eq(serviceTimeline.serviceId, serviceId), eq(serviceTimeline.isActive, true)),
		with: { steps: { with: { destination: true } } }
	});
	if (!tl) return null;
	return {
		...tl,
		steps: [...tl.steps].sort((a, b) => a.stepOrder - b.stepOrder)
	};
}

export async function getQueueWaiting(queueId: string) {
	return db.query.ticket.findMany({
		where: and(eq(ticket.queueId, queueId), inArray(ticket.status, ['waiting', 'held'])),
		orderBy: [desc(ticket.priority), asc(ticket.sequence)]
	});
}

export async function getSiteSnapshot(siteId: string) {
	const siteRow = await db.query.site.findFirst({
		where: eq(site.id, siteId),
		columns: { businessId: true }
	});
	const voice = siteRow
		? await db.query.voiceProfile.findFirst({
				where: eq(voiceProfile.businessId, siteRow.businessId)
			})
		: null;

	const queues = await db.query.queue.findMany({
		where: and(eq(queue.siteId, siteId), eq(queue.isActive, true)),
		with: { service: true }
	});

	const nowServing = await db.query.ticket.findMany({
		where: and(
			eq(ticket.siteId, siteId),
			inArray(ticket.status, ['called', 'serving'])
		),
		orderBy: [desc(ticket.calledAt)]
	});

	const waiting: TicketRow[] = [];
	const waitingByQueue: Record<string, number> = {};
	for (const q of queues) {
		const rows = await getQueueWaiting(q.id);
		waitingByQueue[q.id] = rows.length;
		waiting.push(...rows);
	}
	waiting.sort((a, b) => b.priority - a.priority || a.sequence - b.sequence);

	const dayStart = new Date();
	dayStart.setHours(0, 0, 0, 0);
	const missed = await db.query.ticket.findMany({
		where: and(
			eq(ticket.siteId, siteId),
			eq(ticket.status, 'no_show'),
			gte(ticket.completedAt, dayStart)
		),
		orderBy: [desc(ticket.completedAt)],
		limit: 24
	});

	return {
		queues,
		nowServing,
		waiting,
		waitingByQueue,
		missed,
		voice: buildAnnounceVoiceConfig(voice),
		updatedAt: new Date().toISOString()
	};
}
