import type { PageServerLoad } from './$types';
import { count, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { business, invite, membership, ticket } from '#lib/server/db/schema';
import { requirePlatformAdmin } from '#lib/server/qms/guards';

const ACTIVE_TICKET_STATUSES = ['waiting', 'called', 'serving', 'held'] as const;

export const load: PageServerLoad = async ({ locals }) => {
	await requirePlatformAdmin(locals.user);

	const [bizCount] = await db.select({ n: count() }).from(business);
	const [memCount] = await db
		.select({ n: count() })
		.from(membership)
		.where(eq(membership.status, 'active'));
	const [ticketCount] = await db
		.select({ n: count() })
		.from(ticket)
		.where(inArray(ticket.status, [...ACTIVE_TICKET_STATUSES]));
	const [inviteCount] = await db
		.select({ n: count() })
		.from(invite)
		.where(eq(invite.status, 'pending'));

	const recentBusinesses = await db.query.business.findMany({
		orderBy: [desc(business.createdAt)],
		limit: 8,
		with: { industryPack: true }
	});

	const statusBreakdown = await db
		.select({
			status: business.status,
			n: sql<number>`cast(count(*) as int)`
		})
		.from(business)
		.groupBy(business.status);

	return {
		kpis: {
			businesses: bizCount?.n ?? 0,
			memberships: memCount?.n ?? 0,
			activeTickets: ticketCount?.n ?? 0,
			pendingInvites: inviteCount?.n ?? 0
		},
		recentBusinesses,
		statusBreakdown
	};
};
