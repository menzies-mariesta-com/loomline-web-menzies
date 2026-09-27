import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { counter, department, site, ticket } from '#lib/server/db/schema';
import { deepBusinessAnalytics } from '#lib/server/qms/analytics';
import { requireBusinessRole, requireGuestOrStaff } from '#lib/server/qms/guards';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { business, membership } = await requireGuestOrStaff(locals.user, params.businessId);
	const role =
		membership?.role ?? (membership === null ? 'platform_admin' : 'guest');
	const isStaff = ['platform_admin', 'business_owner', 'manager', 'counter_agent'].includes(role);
	const canSetup = ['platform_admin', 'business_owner', 'manager'].includes(role);
	const canAnalytics = canSetup;
	const isCounterAgent = role === 'counter_agent';

	const daysRaw = Number(url.searchParams.get('days') ?? 7);
	const days = [1, 7, 30].includes(daysRaw) ? daysRaw : 7;

	const [departments, counters, sites] = await Promise.all([
		db
			.select()
			.from(department)
			.where(eq(department.businessId, business.id))
			.orderBy(asc(department.sortOrder), asc(department.name)),
		db.select().from(counter).where(eq(counter.businessId, business.id)),
		db.select().from(site).where(eq(site.businessId, business.id))
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

	const activeTickets = await db
		.select()
		.from(ticket)
		.where(
			and(
				eq(ticket.businessId, business.id),
				inArray(ticket.status, ['waiting', 'called', 'serving', 'held'])
			)
		)
		.orderBy(desc(ticket.createdAt))
		.limit(30);

	const analytics = canAnalytics
		? await deepBusinessAnalytics(business.id, days)
		: null;

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
		activeTickets,
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
