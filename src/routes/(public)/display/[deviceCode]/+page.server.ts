import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '#lib/server/db';
import {
	business,
	counter,
	counterService,
	department,
	displayDevice,
	queue,
	site,
	voiceProfile
} from '#lib/server/db/schema';
import { getSiteSnapshot } from '#lib/server/qms/ticket-machine';
import { DEFAULT_VOICE_TEMPLATE } from '#lib/util/voice';

async function resolveDepartmentName(opts: {
	siteId: string;
	siteName: string;
	boundQueueIds: string[];
	boundCounterIds: string[];
}): Promise<string> {
	const { siteId, siteName, boundQueueIds, boundCounterIds } = opts;

	if (boundCounterIds.length > 0) {
		const counters = await db.query.counter.findMany({
			where: and(eq(counter.siteId, siteId), inArray(counter.id, boundCounterIds)),
			with: { department: true }
		});
		const names = [
			...new Set(counters.map((c) => c.department?.name).filter((n): n is string => !!n))
		];
		if (names.length) return names.join(', ');
	}

	if (boundQueueIds.length > 0) {
		const queues = await db.query.queue.findMany({
			where: and(eq(queue.siteId, siteId), inArray(queue.id, boundQueueIds))
		});
		const serviceIds = [...new Set(queues.map((q) => q.serviceId))];
		if (serviceIds.length) {
			const links = await db.query.counterService.findMany({
				where: inArray(counterService.serviceId, serviceIds),
				with: { counter: { with: { department: true } } }
			});
			const names = [
				...new Set(
					links
						.filter((l) => l.counter.siteId === siteId)
						.map((l) => l.counter.department?.name)
						.filter((n): n is string => !!n)
				)
			];
			if (names.length === 1) return names[0]!;
			if (names.length > 1 && names.length <= 3) return names.join(', ');
		}
	}

	const departments = await db.query.department.findMany({
		where: and(eq(department.siteId, siteId), eq(department.status, 'active')),
		orderBy: [asc(department.sortOrder), asc(department.name)]
	});
	if (departments.length === 1) return departments[0]!.name;

	return siteName;
}

export const load: PageServerLoad = async ({ params }) => {
	const device = await db.query.displayDevice.findFirst({
		where: eq(displayDevice.pairingCode, params.deviceCode)
	});
	if (!device || !device.isActive || device.type !== 'tv') {
		throw error(404, 'Display not found');
	}

	const snapshot = await getSiteSnapshot(device.siteId);
	const [biz, siteRow, voice, counters] = await Promise.all([
		db.query.business.findFirst({ where: eq(business.id, device.businessId) }),
		db.query.site.findFirst({ where: eq(site.id, device.siteId) }),
		db.query.voiceProfile.findFirst({
			where: eq(voiceProfile.businessId, device.businessId)
		}),
		db.query.counter.findMany({
			where: eq(counter.siteId, device.siteId)
		})
	]);

	const counterMap = Object.fromEntries(counters.map((c) => [c.id, c.label]));
	const templates = (voice?.templates ?? {}) as Record<string, string>;
	const boundQueueIds = device.boundQueueIds ?? [];
	const boundCounterIds = device.boundCounterIds ?? [];

	const departmentName = await resolveDepartmentName({
		siteId: device.siteId,
		siteName: siteRow?.name ?? device.name,
		boundQueueIds,
		boundCounterIds
	});

	const announceLocales =
		Array.isArray(voice?.announceLocales) && voice.announceLocales.length
			? voice.announceLocales.map(String)
			: [voice?.locale ?? 'en'];

	return {
		device,
		businessName: biz?.name ?? 'Loomline',
		businessImageUrl: biz?.imageUrl ?? null,
		departmentName,
		boundQueueIds,
		snapshot,
		counterMap,
		voiceTemplate: templates.now_serving ?? DEFAULT_VOICE_TEMPLATE,
		announceLocales,
		announceRepeat: voice?.announceRepeat ?? 1,
		siteId: device.siteId
	};
};
