import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { counter, department, destination } from '#lib/server/db/schema';
import { requireManager } from '#lib/server/qms/guards';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { business } = await requireManager(locals.user, params.businessId);
	const [destinations, departments, counters] = await Promise.all([
		db
			.select()
			.from(destination)
			.where(eq(destination.businessId, business.id))
			.orderBy(asc(destination.name)),
		db
			.select()
			.from(department)
			.where(eq(department.businessId, business.id))
			.orderBy(asc(department.name)),
		db.select().from(counter).where(eq(counter.businessId, business.id))
	]);
	const deptById = Object.fromEntries(departments.map((d) => [d.id, d]));
	const counterById = Object.fromEntries(counters.map((c) => [c.id, c]));
	return {
		destinations: destinations.map((d) => ({
			...d,
			targetDepartment: d.targetDepartmentId ? (deptById[d.targetDepartmentId] ?? null) : null,
			targetCounter: d.targetCounterId ? (counterById[d.targetCounterId] ?? null) : null
		})),
		departments,
		counters
	};
};

export const actions: Actions = {
	create: async ({ request, locals, params }) => {
		const { business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const type = String(form.get('type') ?? '') as 'department' | 'counter' | 'external';
		const targetDepartmentId = String(form.get('targetDepartmentId') ?? '') || null;
		const targetCounterId = String(form.get('targetCounterId') ?? '') || null;
		const externalLabel = String(form.get('externalLabel') ?? '').trim() || null;
		const active = String(form.get('active') ?? 'true') === 'true';
		if (!name || !['department', 'counter', 'external'].includes(type)) {
			return fail(400, { message: 'Name and type required' });
		}
		await db.insert(destination).values({
			businessId: business.id,
			name,
			type,
			targetDepartmentId: type === 'department' ? targetDepartmentId : null,
			targetCounterId: type === 'counter' ? targetCounterId : null,
			externalLabel: type === 'external' ? externalLabel : null,
			active
		});
		return { success: true, message: 'Destination created' };
	},
	update: async ({ request, locals, params }) => {
		const { business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const name = String(form.get('name') ?? '').trim();
		const type = String(form.get('type') ?? '') as 'department' | 'counter' | 'external';
		const targetDepartmentId = String(form.get('targetDepartmentId') ?? '') || null;
		const targetCounterId = String(form.get('targetCounterId') ?? '') || null;
		const externalLabel = String(form.get('externalLabel') ?? '').trim() || null;
		const active = String(form.get('active') ?? 'true') === 'true';
		if (!id || !name || !['department', 'counter', 'external'].includes(type)) {
			return fail(400, { message: 'Missing required fields' });
		}
		await db
			.update(destination)
			.set({
				name,
				type,
				targetDepartmentId: type === 'department' ? targetDepartmentId : null,
				targetCounterId: type === 'counter' ? targetCounterId : null,
				externalLabel: type === 'external' ? externalLabel : null,
				active
			})
			.where(and(eq(destination.id, id), eq(destination.businessId, business.id)));
		return { success: true, message: 'Destination updated' };
	},
	delete: async ({ request, locals, params }) => {
		const { business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { message: 'Id required' });
		try {
			await db
				.delete(destination)
				.where(and(eq(destination.id, id), eq(destination.businessId, business.id)));
		} catch {
			return fail(400, { message: 'Cannot delete: still referenced by timeline steps' });
		}
		return { success: true, message: 'Destination deleted' };
	}
};
