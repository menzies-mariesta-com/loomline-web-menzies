import type { PageServerLoad } from './$types';
import { desc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { ticket } from '#lib/server/db/schema';
import { requireManager } from '#lib/server/qms/guards';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { business } = await requireManager(locals.user, params.businessId);
	const tickets = await db.query.ticket.findMany({
		where: eq(ticket.businessId, business.id),
		orderBy: [desc(ticket.createdAt)],
		limit: 200
	});
	return { tickets };
};
