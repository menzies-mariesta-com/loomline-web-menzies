import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { and, asc, count, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { db } from '#lib/server/db';
import {
	appointment,
	counter,
	department,
	displayDevice,
	membership,
	queue,
	site,
	ticket,
	ticketEvent
} from '#lib/server/db/schema';
import { deepBusinessAnalytics } from '#lib/server/qms/analytics';
import { requireBusinessRole, requireGuestOrStaff } from '#lib/server/qms/guards';

function startOfUtcDay(d = new Date()) {
	return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { business, membership: member } = await requireGuestOrStaff(
		locals.user,
		params.businessId
	);
	const role = member?.role ?? (member === null ? 'platform_admin' : 'guest');
	const isStaff = ['platform_admin', 'business_owner', 'business_admin', 'manager', 'counter_agent'].includes(role);
	const canSetup = ['platform_admin', 'business_owner', 'business_admin', 'manager'].includes(role);
	const canAnalytics = canSetup;
	const isCounterAgent = role === 'counter_agent';

	const daysRaw = Number(url.searchParams.get('days') ?? 7);
	const days = [1, 7, 30].includes(daysRaw) ? daysRaw : 7;

	const todayStart = startOfUtcDay();
	const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60_000);

	const emptyInventory = {
		sites: 0,
		sitesOpen: 0,
		queues: 0,
		queuesActive: 0,
		devices: 0,
		devicesActive: 0,
		devicesInactive: 0,
		team: 0,
		appointmentsToday: 0,
		counters: 0,
		openCounters: 0
	};

	const [departments, counters, sites, queueRows, deviceRows, teamRow, appointmentsTodayRow] =
		await Promise.all([
			db
				.select()
				.from(department)
				.where(eq(department.businessId, business.id))
				.orderBy(asc(department.sortOrder), asc(department.name)),
			db.select().from(counter).where(eq(counter.businessId, business.id)),
			db.select().from(site).where(eq(site.businessId, business.id)),
			isStaff
				? db
						.select({
							total: count(),
							active: sql<number>`count(*) filter (where ${queue.isActive} = true)::int`
						})
						.from(queue)
						.where(eq(queue.businessId, business.id))
				: Promise.resolve([{ total: 0, active: 0 }]),
			isStaff
				? db
						.select({
							total: count(),
							active: sql<number>`count(*) filter (where ${displayDevice.isActive} = true)::int`,
							inactive: sql<number>`count(*) filter (where ${displayDevice.isActive} = false)::int`
						})
						.from(displayDevice)
						.where(eq(displayDevice.businessId, business.id))
				: Promise.resolve([{ total: 0, active: 0, inactive: 0 }]),
			canSetup
				? db
						.select({ total: count() })
						.from(membership)
						.where(and(eq(membership.businessId, business.id), eq(membership.status, 'active')))
				: Promise.resolve([{ total: 0 }]),
			canSetup
				? db
						.select({ total: count() })
						.from(appointment)
						.where(
							and(
								eq(appointment.businessId, business.id),
								gte(appointment.startsAt, todayStart),
								lt(appointment.startsAt, tomorrowStart),
								inArray(appointment.status, ['scheduled', 'checked_in'])
							)
						)
				: Promise.resolve([{ total: 0 }])
		]);

	const siteById = Object.fromEntries(sites.map((s) => [s.id, s]));
	const departmentsWithCounters = departments.map((d) => ({
		...d,
		site: siteById[d.siteId] ?? null,
		counters: counters
			.filter((c) => c.departmentId === d.id)
			.sort((a, b) => a.label.localeCompare(b.label))
	}));

	const openCounterCount = counters.filter((c) => c.status === 'open').length;
	const sitesOpen = sites.filter((s) => s.isOpen).length;

	const statusRows = await db
		.select({ status: ticket.status, total: count() })
		.from(ticket)
		.where(
			and(
				eq(ticket.businessId, business.id),
				inArray(ticket.status, ['waiting', 'called', 'serving', 'held'])
			)
		)
		.groupBy(ticket.status);

	const kpi = {
		waiting: 0,
		called: 0,
		serving: 0,
		held: 0
	};
	for (const row of statusRows) {
		if (row.status in kpi) {
			kpi[row.status as keyof typeof kpi] = Number(row.total);
		}
	}

	const [activeTickets, recentEvents, analytics] = await Promise.all([
		db
			.select()
			.from(ticket)
			.where(
				and(
					eq(ticket.businessId, business.id),
					inArray(ticket.status, ['waiting', 'called', 'serving', 'held'])
				)
			)
			.orderBy(desc(ticket.createdAt))
			.limit(30),
		isStaff
			? db
					.select({
						id: ticketEvent.id,
						type: ticketEvent.type,
						createdAt: ticketEvent.createdAt,
						ticketNumber: ticket.number,
						ticketId: ticket.id
					})
					.from(ticketEvent)
					.innerJoin(ticket, eq(ticketEvent.ticketId, ticket.id))
					.where(eq(ticketEvent.businessId, business.id))
					.orderBy(desc(ticketEvent.createdAt))
					.limit(12)
			: Promise.resolve([]),
		canAnalytics ? deepBusinessAnalytics(business.id, days) : Promise.resolve(null)
	]);

	const inventory = isStaff
		? {
				sites: sites.length,
				sitesOpen,
				queues: Number(queueRows[0]?.total ?? 0),
				queuesActive: Number(queueRows[0]?.active ?? 0),
				devices: Number(deviceRows[0]?.total ?? 0),
				devicesActive: Number(deviceRows[0]?.active ?? 0),
				devicesInactive: Number(deviceRows[0]?.inactive ?? 0),
				team: Number(teamRow[0]?.total ?? 0),
				appointmentsToday: Number(appointmentsTodayRow[0]?.total ?? 0),
				counters: counters.length,
				openCounters: openCounterCount
			}
		: emptyInventory;

	return {
		brand: {
			name: business.name,
			imageUrl: business.imageUrl
		},
		role,
		isStaff,
		canSetup,
		canAnalytics,
		isCounterAgent,
		departments: departmentsWithCounters,
		openCounterCount,
		kpi,
		inventory,
		activeTickets,
		recentEvents,
		needsSetup: departmentsWithCounters.length === 0,
		sites,
		days,
		analytics
	};
};

export const actions: Actions = {
	createDefaultDepartment: async ({ locals, params }) => {
		const { business } = await requireBusinessRole(locals.user, params.businessId, [
			'business_owner',
			'manager'
		]);
		const existing = await db.query.department.findFirst({
			where: eq(department.businessId, business.id)
		});
		if (existing) {
			return { success: true, message: 'Departments already exist' };
		}
		const firstSite = await db.select().from(site).where(eq(site.businessId, business.id)).limit(1);
		if (!firstSite[0]) {
			return fail(400, { message: 'Create a site first, then add a department.' });
		}
		await db.insert(department).values({
			businessId: business.id,
			siteId: firstSite[0].id,
			name: 'General',
			code: 'GEN',
			sortOrder: 0,
			status: 'active'
		});
		return { success: true, message: 'Created General department' };
	}
};
