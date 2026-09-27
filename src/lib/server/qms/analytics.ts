import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { displayDevice, queue, service, site, ticket } from '#lib/server/db/schema';

function startOfUtcDay(d = new Date()) {
	return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function msToMin(ms: number) {
	return Math.round(ms / 60_000);
}

/** Legacy summary used by CSV export. */
export async function businessAnalytics(businessId: string, days = 7) {
	const deep = await deepBusinessAnalytics(businessId, days);
	return {
		days: deep.days,
		total: deep.ticketsPeriod,
		byStatus: Object.fromEntries(deep.byStatus.map((r) => [r.status, r.count])),
		avgWaitMs: deep.avgWaitMs,
		avgServeMs: deep.avgServeMs,
		completed: deep.completed,
		peakHours: deep.peakHours,
		agentProductivity: deep.agentProductivity
	};
}

export async function multiBranchRollup(businessId: string) {
	const rows = await db
		.select({
			siteId: ticket.siteId,
			count: sql<number>`count(*)::int`,
			completed: sql<number>`count(*) filter (where ${ticket.status} = 'completed')::int`
		})
		.from(ticket)
		.where(eq(ticket.businessId, businessId))
		.groupBy(ticket.siteId);
	return rows;
}

export type DeepBusinessAnalytics = Awaited<ReturnType<typeof deepBusinessAnalytics>>;

/** Full Soft Wash home dashboard aggregates from QMS tables. */
export async function deepBusinessAnalytics(businessId: string, days = 7) {
	const clampedDays = Math.min(Math.max(Number(days) || 7, 1), 90);
	const since = new Date(Date.now() - clampedDays * 24 * 60 * 60_000);
	const todayStart = startOfUtcDay();
	const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60_000);

	const biz = eq(ticket.businessId, businessId);
	const inPeriod = and(biz, gte(ticket.createdAt, since));

	const [
		todayRow,
		weekRow,
		periodTotals,
		byStatusRows,
		bySourceRows,
		byQueueRows,
		byServiceRows,
		dailyRows,
		waitServeRows,
		hourRows,
		productivityRows,
		siteRows,
		deviceRows,
		sites,
		queues,
		services
	] = await Promise.all([
		db
			.select({ total: sql<number>`count(*)::int` })
			.from(ticket)
			.where(and(biz, gte(ticket.createdAt, todayStart))),
		db
			.select({ total: sql<number>`count(*)::int` })
			.from(ticket)
			.where(and(biz, gte(ticket.createdAt, weekStart))),
		db
			.select({
				total: sql<number>`count(*)::int`,
				completed: sql<number>`count(*) filter (where ${ticket.status} = 'completed')::int`,
				noShow: sql<number>`count(*) filter (where ${ticket.status} = 'no_show')::int`,
				avgWaitMs: sql<number>`coalesce(avg(extract(epoch from (${ticket.calledAt} - ${ticket.createdAt})) * 1000) filter (where ${ticket.calledAt} is not null), 0)::float`,
				avgServeMs: sql<number>`coalesce(avg(extract(epoch from (${ticket.completedAt} - coalesce(${ticket.servedAt}, ${ticket.calledAt}))) * 1000) filter (where ${ticket.completedAt} is not null and coalesce(${ticket.servedAt}, ${ticket.calledAt}) is not null), 0)::float`
			})
			.from(ticket)
			.where(inPeriod),
		db
			.select({
				status: ticket.status,
				count: sql<number>`count(*)::int`
			})
			.from(ticket)
			.where(inPeriod)
			.groupBy(ticket.status),
		db
			.select({
				source: ticket.source,
				count: sql<number>`count(*)::int`
			})
			.from(ticket)
			.where(inPeriod)
			.groupBy(ticket.source),
		db
			.select({
				queueId: ticket.queueId,
				count: sql<number>`count(*)::int`
			})
			.from(ticket)
			.where(inPeriod)
			.groupBy(ticket.queueId),
		db
			.select({
				serviceId: queue.serviceId,
				count: sql<number>`count(*)::int`
			})
			.from(ticket)
			.innerJoin(queue, eq(ticket.queueId, queue.id))
			.where(inPeriod)
			.groupBy(queue.serviceId),
		db
			.select({
				day: sql<string>`to_char(date_trunc('day', ${ticket.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`,
				count: sql<number>`count(*)::int`
			})
			.from(ticket)
			.where(inPeriod)
			.groupBy(sql`date_trunc('day', ${ticket.createdAt} at time zone 'UTC')`)
			.orderBy(sql`date_trunc('day', ${ticket.createdAt} at time zone 'UTC')`),
		db
			.select({
				day: sql<string>`to_char(date_trunc('day', ${ticket.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`,
				avgWaitMs: sql<number>`coalesce(avg(extract(epoch from (${ticket.calledAt} - ${ticket.createdAt})) * 1000) filter (where ${ticket.calledAt} is not null), 0)::float`,
				avgServeMs: sql<number>`coalesce(avg(extract(epoch from (${ticket.completedAt} - coalesce(${ticket.servedAt}, ${ticket.calledAt}))) * 1000) filter (where ${ticket.completedAt} is not null and coalesce(${ticket.servedAt}, ${ticket.calledAt}) is not null), 0)::float`
			})
			.from(ticket)
			.where(inPeriod)
			.groupBy(sql`date_trunc('day', ${ticket.createdAt} at time zone 'UTC')`)
			.orderBy(sql`date_trunc('day', ${ticket.createdAt} at time zone 'UTC')`),
		db
			.select({
				hour: sql<number>`extract(hour from ${ticket.createdAt} at time zone 'UTC')::int`,
				count: sql<number>`count(*)::int`
			})
			.from(ticket)
			.where(inPeriod)
			.groupBy(sql`extract(hour from ${ticket.createdAt} at time zone 'UTC')`),
		db
			.select({
				counterId: ticket.counterId,
				count: sql<number>`count(*)::int`
			})
			.from(ticket)
			.where(and(inPeriod, inArray(ticket.status, ['completed'])))
			.groupBy(ticket.counterId),
		db
			.select({
				siteId: ticket.siteId,
				count: sql<number>`count(*)::int`,
				completed: sql<number>`count(*) filter (where ${ticket.status} = 'completed')::int`
			})
			.from(ticket)
			.where(inPeriod)
			.groupBy(ticket.siteId),
		db
			.select({
				type: displayDevice.type,
				active: sql<number>`count(*) filter (where ${displayDevice.isActive} = true)::int`,
				inactive: sql<number>`count(*) filter (where ${displayDevice.isActive} = false)::int`
			})
			.from(displayDevice)
			.where(eq(displayDevice.businessId, businessId))
			.groupBy(displayDevice.type),
		db.select({ id: site.id, name: site.name }).from(site).where(eq(site.businessId, businessId)),
		db.select({ id: queue.id, name: queue.name }).from(queue).where(eq(queue.businessId, businessId)),
		db
			.select({ id: service.id, name: service.name })
			.from(service)
			.where(eq(service.businessId, businessId))
	]);

	const siteMap = Object.fromEntries(sites.map((s) => [s.id, s.name]));
	const queueMap = Object.fromEntries(queues.map((q) => [q.id, q.name]));
	const serviceMap = Object.fromEntries(services.map((s) => [s.id, s.name]));

	const totals = periodTotals[0] ?? {
		total: 0,
		completed: 0,
		noShow: 0,
		avgWaitMs: 0,
		avgServeMs: 0
	};

	const dayKeys: string[] = [];
	for (let i = clampedDays - 1; i >= 0; i--) {
		const d = new Date(Date.now() - i * 24 * 60 * 60_000);
		dayKeys.push(d.toISOString().slice(0, 10));
	}
	const volumeByDay = Object.fromEntries(dailyRows.map((r) => [r.day, Number(r.count)]));
	const waitByDayMap = Object.fromEntries(
		waitServeRows.map((r) => [
			r.day,
			{ avgWaitMs: Number(r.avgWaitMs), avgServeMs: Number(r.avgServeMs) }
		])
	);

	const dailyVolume = dayKeys.map((date) => ({
		date,
		label: date.slice(5),
		count: volumeByDay[date] ?? 0
	}));

	const waitTrend = dayKeys.map((date) => ({
		date,
		label: date.slice(5),
		avgWaitMin: msToMin(waitByDayMap[date]?.avgWaitMs ?? 0),
		avgServeMin: msToMin(waitByDayMap[date]?.avgServeMs ?? 0)
	}));

	const byStatus = byStatusRows
		.map((r) => ({ status: r.status, count: Number(r.count) }))
		.sort((a, b) => b.count - a.count);

	const bySource = bySourceRows
		.map((r) => ({ source: r.source, count: Number(r.count) }))
		.sort((a, b) => b.count - a.count);

	const byQueue = byQueueRows
		.map((r) => ({
			queueId: r.queueId,
			name: queueMap[r.queueId] ?? r.queueId.slice(0, 8),
			count: Number(r.count)
		}))
		.sort((a, b) => b.count - a.count)
		.slice(0, 12);

	const byService = byServiceRows
		.map((r) => ({
			serviceId: r.serviceId,
			name: serviceMap[r.serviceId] ?? r.serviceId.slice(0, 8),
			count: Number(r.count)
		}))
		.sort((a, b) => b.count - a.count)
		.slice(0, 12);

	const peakHours = hourRows
		.map((r) => ({ hour: Number(r.hour), count: Number(r.count) }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 8);

	const siteRollup = siteRows
		.map((r) => ({
			siteId: r.siteId,
			name: siteMap[r.siteId] ?? r.siteId.slice(0, 8),
			count: Number(r.count),
			completed: Number(r.completed)
		}))
		.sort((a, b) => b.count - a.count);

	const devices = deviceRows.map((r) => ({
		type: r.type,
		active: Number(r.active),
		inactive: Number(r.inactive)
	}));
	const deviceActive = devices.reduce((n, d) => n + d.active, 0);
	const deviceInactive = devices.reduce((n, d) => n + d.inactive, 0);

	return {
		days: clampedDays,
		ticketsToday: Number(todayRow[0]?.total ?? 0),
		ticketsWeek: Number(weekRow[0]?.total ?? 0),
		ticketsPeriod: Number(totals.total),
		completed: Number(totals.completed),
		noShow: Number(totals.noShow),
		avgWaitMs: Math.round(Number(totals.avgWaitMs) || 0),
		avgServeMs: Math.round(Number(totals.avgServeMs) || 0),
		byStatus,
		bySource,
		byQueue,
		byService,
		dailyVolume,
		waitTrend,
		peakHours,
		siteRollup,
		devices,
		deviceActive,
		deviceInactive,
		agentProductivity: productivityRows.map((r) => ({
			counterId: r.counterId,
			count: Number(r.count)
		}))
	};
}
