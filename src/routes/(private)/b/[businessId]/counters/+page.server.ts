import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '#lib/server/db';
import {
	counter,
	counterService,
	department,
	service,
	site
} from '#lib/server/db/schema';
import { requireManager } from '#lib/server/qms/guards';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { business } = await requireManager(locals.user, params.businessId);

	const [counters, sites, departments, services, bindings] = await Promise.all([
		db.select().from(counter).where(eq(counter.businessId, business.id)),
		db.select().from(site).where(eq(site.businessId, business.id)),
		db.select().from(department).where(eq(department.businessId, business.id)),
		db.select().from(service).where(eq(service.businessId, business.id)),
		db.select().from(counterService)
	]);

	const serviceById = Object.fromEntries(services.map((s) => [s.id, s]));
	const deptById = Object.fromEntries(departments.map((d) => [d.id, d]));
	const siteById = Object.fromEntries(sites.map((s) => [s.id, s]));
	const bindingsByCounter = new Map<string, typeof bindings>();
	for (const b of bindings) {
		const list = bindingsByCounter.get(b.counterId) ?? [];
		list.push(b);
		bindingsByCounter.set(b.counterId, list);
	}

	const countersEnriched = counters.map((c) => ({
		...c,
		department: c.departmentId ? (deptById[c.departmentId] ?? null) : null,
		site: siteById[c.siteId] ?? null,
		services: (bindingsByCounter.get(c.id) ?? []).map((b) => ({
			...b,
			service: serviceById[b.serviceId] ?? null
		}))
	}));

	return { counters: countersEnriched, sites, departments, services };
};

export const actions: Actions = {
	create: async ({ request, locals, params }) => {
		const { business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const label = String(form.get('label') ?? '').trim();
		const siteId = String(form.get('siteId') ?? '');
		const departmentId = String(form.get('departmentId') ?? '');
		const serviceIds = form.getAll('serviceIds').map(String).filter(Boolean);
		if (!label || !siteId || !departmentId) {
			return fail(400, { message: 'Label, site, and department required' });
		}
		const [dept] = await db
			.select()
			.from(department)
			.where(and(eq(department.id, departmentId), eq(department.businessId, business.id)))
			.limit(1);
		if (!dept) return fail(400, { message: 'Invalid department' });
		if (dept.siteId !== siteId) {
			return fail(400, { message: 'Department must belong to the selected site' });
		}

		const [row] = await db
			.insert(counter)
			.values({
				businessId: business.id,
				siteId,
				departmentId,
				label,
				status: 'closed'
			})
			.returning();

		if (serviceIds.length > 0) {
			const valid = await db
				.select()
				.from(service)
				.where(and(eq(service.businessId, business.id), inArray(service.id, serviceIds)));
			if (valid.length > 0) {
				await db.insert(counterService).values(
					valid.map((s) => ({ counterId: row.id, serviceId: s.id }))
				);
			}
		}
		return { success: true, message: 'Counter created' };
	},
	update: async ({ request, locals, params }) => {
		const { business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const label = String(form.get('label') ?? '').trim();
		const siteId = String(form.get('siteId') ?? '');
		const departmentId = String(form.get('departmentId') ?? '');
		const serviceIds = form.getAll('serviceIds').map(String).filter(Boolean);
		if (!id || !label || !siteId || !departmentId) {
			return fail(400, { message: 'Missing required fields' });
		}
		const [dept] = await db
			.select()
			.from(department)
			.where(and(eq(department.id, departmentId), eq(department.businessId, business.id)))
			.limit(1);
		if (!dept || dept.siteId !== siteId) {
			return fail(400, { message: 'Department must belong to the selected site' });
		}
		await db
			.update(counter)
			.set({ label, siteId, departmentId })
			.where(and(eq(counter.id, id), eq(counter.businessId, business.id)));

		await db.delete(counterService).where(eq(counterService.counterId, id));
		if (serviceIds.length > 0) {
			const valid = await db
				.select()
				.from(service)
				.where(and(eq(service.businessId, business.id), inArray(service.id, serviceIds)));
			if (valid.length > 0) {
				await db.insert(counterService).values(
					valid.map((s) => ({ counterId: id, serviceId: s.id }))
				);
			}
		}
		return { success: true, message: 'Counter updated' };
	},
	setStatus: async ({ request, locals, params }) => {
		await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const status = String(form.get('status') ?? 'open') as 'open' | 'closed' | 'paused';
		await db.update(counter).set({ status }).where(eq(counter.id, id));
		return { success: true, message: 'Counter status updated' };
	},
	delete: async ({ request, locals, params }) => {
		const { business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { message: 'Id required' });
		await db.delete(counter).where(and(eq(counter.id, id), eq(counter.businessId, business.id)));
		return { success: true, message: 'Counter deleted' };
	}
};
