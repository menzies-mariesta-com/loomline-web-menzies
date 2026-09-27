import type { IndustryPackConfig } from '#lib/server/qms/industry-packs';
import { db } from '#lib/server/db';
import {
	business,
	counter,
	industryPack,
	queue,
	service,
	site,
	voiceProfile
} from '#lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { slugify } from '#lib/server/qms/ids';

export async function applyIndustryPackToBusiness(businessId: string, packId: string) {
	const pack = await db.query.industryPack.findFirst({ where: eq(industryPack.id, packId) });
	if (!pack) throw new Error('Industry pack not found');

	const raw = (pack.config ?? {}) as Partial<IndustryPackConfig>;
	const config: IndustryPackConfig = {
		services: Array.isArray(raw.services) ? raw.services : [],
		ticketNumberFormat: raw.ticketNumberFormat ?? '{PREFIX}{NNN}',
		voiceScripts: raw.voiceScripts && typeof raw.voiceScripts === 'object' ? raw.voiceScripts : {},
		appointmentTypes: Array.isArray(raw.appointmentTypes) ? raw.appointmentTypes : [],
		uiLabels: raw.uiLabels && typeof raw.uiLabels === 'object' ? raw.uiLabels : {},
		queueStrategyDefault:
			raw.queueStrategyDefault === 'priority' || raw.queueStrategyDefault === 'appointment_first'
				? raw.queueStrategyDefault
				: 'fifo'
	};
	const biz = await db.query.business.findFirst({ where: eq(business.id, businessId) });
	if (!biz) throw new Error('Business not found');

	await db
		.update(business)
		.set({ industryPackId: pack.id })
		.where(eq(business.id, businessId));

	const existingSites = await db.query.site.findMany({ where: eq(site.businessId, businessId) });
	let mainSite = existingSites[0];
	if (!mainSite) {
		const [created] = await db
			.insert(site)
			.values({
				businessId,
				name: 'Main',
				slug: 'main',
				isOpen: true
			})
			.returning();
		mainSite = created;
	}

	const createdServices = [];
	for (const svc of config.services) {
		const [row] = await db
			.insert(service)
			.values({
				businessId,
				name: svc.name,
				codePrefix: svc.codePrefix,
				estimatedMinutes: svc.estimatedMinutes,
				priorityWeight: svc.priorityWeight,
				industryTags: svc.industryTags
			})
			.returning();
		createdServices.push(row);
	}

	for (const svc of createdServices) {
		await db.insert(queue).values({
			businessId,
			siteId: mainSite.id,
			serviceId: svc.id,
			name: `${svc.name} queue`,
			strategy: config.queueStrategyDefault,
			slaMinutes: 30,
			almostYourTurnThreshold: 3
		});
	}

	const existingCounters = await db.query.counter.findMany({
		where: eq(counter.siteId, mainSite.id)
	});
	if (existingCounters.length === 0) {
		await db.insert(counter).values({
			businessId,
			siteId: mainSite.id,
			label: `${config.uiLabels.counter ?? 'Counter'} 1`,
			status: 'open'
		});
		await db.insert(counter).values({
			businessId,
			siteId: mainSite.id,
			label: `${config.uiLabels.counter ?? 'Counter'} 2`,
			status: 'closed'
		});
	}

	const existingVoice = await db.query.voiceProfile.findFirst({
		where: eq(voiceProfile.businessId, businessId)
	});
	if (!existingVoice) {
		await db.insert(voiceProfile).values({
			businessId,
			locale: biz.localeDefault,
			announceLocales: [biz.localeDefault || 'en'],
			announceRepeat: 1,
			templates: config.voiceScripts,
			isDefault: true
		});
	}

	return { site: mainSite, services: createdServices };
}

export function businessSlugFromName(name: string) {
	return slugify(name) || `biz-${Date.now()}`;
}
