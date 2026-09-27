import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { department, site } from '#lib/server/db/schema';
import { requireManager } from '#lib/server/qms/guards';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { business } = await requireManager(locals.user, params.businessId);
	const [departments, sites] = await Promise.all([
		db
			.select()
			.from(department)
			.where(eq(department.businessId, business.id))
			.orderBy(asc(department.sortOrder), asc(department.name)),
		db.select().from(site).where(eq(site.businessId, business.id))
	]);
	const siteById = Object.fromEntries(sites.map((s) => [s.id, s]));
	return {
		departments: departments.map((d) => ({ ...d, site: siteById[d.siteId] ?? null })),
		sites
	};
};

export const actions: Actions = {
	create: async ({ request, locals, params }) => {
		const { business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const code = String(form.get('code') ?? '').trim().toUpperCase();
		const siteId = String(form.get('siteId') ?? '');
		const sortOrder = Number(form.get('sortOrder') ?? 0);
		const status = String(form.get('status') ?? 'active') as 'active' | 'inactive';
		if (!name || !code || !siteId) return fail(400, { message: 'Name, code, and site required' });
		const [siteRow] = await db
			.select()
			.from(site)
			.where(and(eq(site.id, siteId), eq(site.businessId, business.id)))
			.limit(1);
		if (!siteRow) return fail(400, { message: 'Invalid site' });
		try {
			await db.insert(department).values({
				businessId: business.id,
				siteId,
				name,
				code,
				sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
				status: status === 'inactive' ? 'inactive' : 'active'
			});
		} catch {
			return fail(400, { message: 'Could not create department (duplicate code?)' });
		}
		return { success: true, message: 'Department created' };
	},
	update: async ({ request, locals, params }) => {
		const { business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const name = String(form.get('name') ?? '').trim();
		const code = String(form.get('code') ?? '').trim().toUpperCase();
		const siteId = String(form.get('siteId') ?? '');
		const sortOrder = Number(form.get('sortOrder') ?? 0);
		const status = String(form.get('status') ?? 'active') as 'active' | 'inactive';
		if (!id || !name || !code || !siteId) return fail(400, { message: 'Missing required fields' });
		await db
			.update(department)
			.set({
				name,
				code,
				siteId,
				sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
				status: status === 'inactive' ? 'inactive' : 'active'
			})
			.where(and(eq(department.id, id), eq(department.businessId, business.id)));
		return { success: true, message: 'Department updated' };
	},
	delete: async ({ request, locals, params }) => {
		const { business } = await requireManager(locals.user, params.businessId);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!id) return fail(400, { message: 'Id required' });
		try {
			await db
				.delete(department)
				.where(and(eq(department.id, id), eq(department.businessId, business.id)));
		} catch {
			return fail(400, { message: 'Cannot delete: counters may still reference this department' });
		}
		return { success: true, message: 'Department deleted' };
	}
};
