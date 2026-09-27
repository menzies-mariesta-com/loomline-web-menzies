import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import {
	destination,
	service,
	serviceTimeline,
	serviceTimelineStep
} from '#lib/server/db/schema';
import { requireManager } from '#lib/server/qms/guards';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { business } = await requireManager(locals.user, params.businessId);
	const [timelines, services, destinations, steps] = await Promise.all([
		db
			.select()
			.from(serviceTimeline)
			.where(eq(serviceTimeline.businessId, business.id))
			.orderBy(asc(serviceTimeline.name)),
		db
			.select()
			.from(service)
			.where(eq(service.businessId, business.id))
			.orderBy(asc(service.name)),
		db
			.select()
			.from(destination)
			.where(eq(destination.businessId, business.id))
			.orderBy(asc(destination.name)),
		db.select().from(serviceTimelineStep)
	]);

	const serviceById = Object.fromEntries(services.map((s) => [s.id, s]));
	const destById = Object.fromEntries(destinations.map((d) => [d.id, d]));
	const stepsByTimeline = new Map<string, typeof steps>();
	for (const step of steps) {
		const list = stepsByTimeline.get(step.timelineId) ?? [];
		list.push(step);
		stepsByTimeline.set(step.timelineId, list);
	}

	return {
		timelines: timelines.map((t) => ({
			...t,
			service: serviceById[t.serviceId] ?? null,
			steps: (stepsByTimeline.get(t.id) ?? [])
				.map((s) => ({ ...s, destination: destById[s.destinationId] ?? null }))
				.sort((a, b) => a.stepOrder - b.stepOrder)
		})),
		services,
		destinations
	};
};

export const actions: Actions = {
	create: async ({ request, locals, params }) => {
		const { business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const serviceId = String(form.get('serviceId') ?? '');
		if (!name || !serviceId) return fail(400, { message: 'Name and service required' });
		const [svc] = await db
			.select()
			.from(service)
			.where(and(eq(service.id, serviceId), eq(service.businessId, business.id)))
			.limit(1);
		if (!svc) return fail(400, { message: 'Invalid service' });
		await db.insert(serviceTimeline).values({
			businessId: business.id,
			serviceId,
			name,
			isActive: true
		});
		return { success: true, message: 'Timeline created' };
	},
	update: async ({ request, locals, params }) => {
		const { business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const name = String(form.get('name') ?? '').trim();
		const serviceId = String(form.get('serviceId') ?? '');
		const isActive = String(form.get('isActive') ?? 'true') === 'true';
		if (!id || !name || !serviceId) return fail(400, { message: 'Missing required fields' });
		await db
			.update(serviceTimeline)
			.set({ name, serviceId, isActive })
			.where(and(eq(serviceTimeline.id, id), eq(serviceTimeline.businessId, business.id)));
		return { success: true, message: 'Timeline updated' };
	},
	delete: async ({ request, locals, params }) => {
		const { business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { message: 'Id required' });
		await db
			.delete(serviceTimeline)
			.where(and(eq(serviceTimeline.id, id), eq(serviceTimeline.businessId, business.id)));
		return { success: true, message: 'Timeline deleted' };
	},
	addStep: async ({ request, locals, params }) => {
		const { business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const timelineId = String(form.get('timelineId') ?? '');
		const destinationId = String(form.get('destinationId') ?? '');
		const stepOrder = Number(form.get('stepOrder') ?? 1);
		const slaRaw = String(form.get('slaMinutes') ?? '').trim();
		const slaMinutes = slaRaw === '' ? null : Number(slaRaw);
		if (!timelineId || !destinationId) {
			return fail(400, { message: 'Timeline and destination required' });
		}
		const [tl] = await db
			.select()
			.from(serviceTimeline)
			.where(and(eq(serviceTimeline.id, timelineId), eq(serviceTimeline.businessId, business.id)))
			.limit(1);
		if (!tl) return fail(400, { message: 'Timeline not found' });
		try {
			await db.insert(serviceTimelineStep).values({
				timelineId,
				destinationId,
				stepOrder: Number.isFinite(stepOrder) ? stepOrder : 1,
				slaMinutes: slaMinutes != null && Number.isFinite(slaMinutes) ? slaMinutes : null
			});
		} catch {
			return fail(400, { message: 'Could not add step (duplicate order?)' });
		}
		return { success: true, message: 'Step added' };
	},
	updateStep: async ({ request, locals, params }) => {
		await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const destinationId = String(form.get('destinationId') ?? '');
		const stepOrder = Number(form.get('stepOrder') ?? 1);
		const slaRaw = String(form.get('slaMinutes') ?? '').trim();
		const slaMinutes = slaRaw === '' ? null : Number(slaRaw);
		if (!id || !destinationId) return fail(400, { message: 'Missing fields' });
		await db
			.update(serviceTimelineStep)
			.set({
				destinationId,
				stepOrder: Number.isFinite(stepOrder) ? stepOrder : 1,
				slaMinutes: slaMinutes != null && Number.isFinite(slaMinutes) ? slaMinutes : null
			})
			.where(eq(serviceTimelineStep.id, id));
		return { success: true, message: 'Step updated' };
	},
	deleteStep: async ({ request, locals, params }) => {
		await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { message: 'Id required' });
		await db.delete(serviceTimelineStep).where(eq(serviceTimelineStep.id, id));
		return { success: true, message: 'Step deleted' };
	}
};
