import { desc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { auditLog, notificationOutbox, ticket, ticketEvent } from '#lib/server/db/schema';

export async function writeAudit(opts: {
	actorUserId?: string | null;
	businessId?: string | null;
	action: string;
	entityType?: string;
	entityId?: string;
	payload?: Record<string, unknown>;
}) {
	await db.insert(auditLog).values({
		actorUserId: opts.actorUserId ?? null,
		businessId: opts.businessId ?? null,
		action: opts.action,
		entityType: opts.entityType,
		entityId: opts.entityId,
		payload: opts.payload ?? {}
	});
}

export async function listAuditForBusiness(businessId: string, limit = 200) {
	return db.query.auditLog.findMany({
		where: eq(auditLog.businessId, businessId),
		orderBy: (t, { desc: d }) => [d(t.createdAt)],
		limit
	});
}

/** Unified business activity for admin / manager log viewer. */
export async function listBusinessLogs(businessId: string, limit = 300) {
	const capped = Math.min(Math.max(limit, 1), 500);
	const perSource = Math.ceil(capped / 2);

	const [audits, events, outbox] = await Promise.all([
		db
			.select({
				id: auditLog.id,
				createdAt: auditLog.createdAt,
				action: auditLog.action,
				entityType: auditLog.entityType,
				entityId: auditLog.entityId,
				actorUserId: auditLog.actorUserId,
				payload: auditLog.payload
			})
			.from(auditLog)
			.where(eq(auditLog.businessId, businessId))
			.orderBy(desc(auditLog.createdAt))
			.limit(perSource),
		db
			.select({
				id: ticketEvent.id,
				createdAt: ticketEvent.createdAt,
				type: ticketEvent.type,
				ticketNumber: ticket.number,
				ticketId: ticket.id,
				actorUserId: ticketEvent.actorUserId,
				payload: ticketEvent.payload
			})
			.from(ticketEvent)
			.innerJoin(ticket, eq(ticketEvent.ticketId, ticket.id))
			.where(eq(ticketEvent.businessId, businessId))
			.orderBy(desc(ticketEvent.createdAt))
			.limit(perSource),
		db
			.select({
				id: notificationOutbox.id,
				createdAt: notificationOutbox.createdAt,
				channel: notificationOutbox.channel,
				toAddress: notificationOutbox.toAddress,
				templateKey: notificationOutbox.templateKey,
				status: notificationOutbox.status,
				errorMessage: notificationOutbox.errorMessage,
				sentAt: notificationOutbox.sentAt
			})
			.from(notificationOutbox)
			.where(eq(notificationOutbox.businessId, businessId))
			.orderBy(desc(notificationOutbox.createdAt))
			.limit(perSource)
	]);

	type LogRow = {
		id: string;
		kind: 'audit' | 'ticket' | 'notification';
		createdAt: Date;
		summary: string;
		detail: string;
		status: string;
	};

	const rows: LogRow[] = [
		...audits.map((a) => ({
			id: `audit:${a.id}`,
			kind: 'audit' as const,
			createdAt: a.createdAt,
			summary: a.action,
			detail: [a.entityType, a.entityId].filter(Boolean).join(' · ') || a.actorUserId || '-',
			status: 'recorded'
		})),
		...events.map((e) => ({
			id: `ticket:${e.id}`,
			kind: 'ticket' as const,
			createdAt: e.createdAt,
			summary: e.type,
			detail: e.ticketNumber ? `Ticket ${e.ticketNumber}` : e.ticketId,
			status: 'event'
		})),
		...outbox.map((o) => ({
			id: `notify:${o.id}`,
			kind: 'notification' as const,
			createdAt: o.createdAt,
			summary: `${o.channel}: ${o.templateKey}`,
			detail: o.errorMessage ? `${o.toAddress} (${o.errorMessage})` : o.toAddress,
			status: o.status
		}))
	];

	rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
	return rows.slice(0, capped);
}
