import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { auditLog } from '#lib/server/db/schema';

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

export async function listAuditForBusiness(businessId: string, limit = 50) {
	return db.query.auditLog.findMany({
		where: eq(auditLog.businessId, businessId),
		orderBy: (t, { desc }) => [desc(t.createdAt)],
		limit
	});
}
