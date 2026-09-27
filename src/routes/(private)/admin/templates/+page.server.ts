import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { desc, eq, ne, and } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { industryPack } from '#lib/server/db/schema';
import { requirePlatformAdmin } from '#lib/server/qms/guards';
import {
	emptyIndustryPackConfig,
	normalizeQueueStrategy,
	type IndustryPackConfig
} from '#lib/server/qms/industry-packs';
import { writeAudit } from '#lib/server/qms/audit';
import { slugify } from '#lib/server/qms/ids';

export const load: PageServerLoad = async ({ locals }) => {
	await requirePlatformAdmin(locals.user);
	const templates = await db.query.industryPack.findMany({
		orderBy: [desc(industryPack.name)]
	});
	return { templates };
};

export const actions: Actions = {
	createTemplate: async ({ request, locals }) => {
		const admin = await requirePlatformAdmin(locals.user);
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const slugRaw = String(form.get('slug') ?? '').trim();
		const description = String(form.get('description') ?? '').trim() || null;
		const version = String(form.get('version') ?? '').trim() || '1.0.0';
		const queueStrategy = normalizeQueueStrategy(String(form.get('queueStrategy') ?? ''));

		if (!name) return fail(400, { message: 'Name is required.', success: false });

		const slug = slugify(slugRaw || name);
		if (!slug) return fail(400, { message: 'Slug is required.', success: false });

		const existing = await db.query.industryPack.findFirst({
			where: eq(industryPack.slug, slug)
		});
		if (existing) {
			return fail(400, { message: `Slug "${slug}" is already in use.`, success: false });
		}

		const config = emptyIndustryPackConfig(queueStrategy);

		const [row] = await db
			.insert(industryPack)
			.values({ name, slug, description, version, config })
			.returning();

		await writeAudit({
			actorUserId: admin.id,
			action: 'template.create',
			entityType: 'industry_pack',
			entityId: row.id,
			payload: { name, slug }
		});

		return {
			success: true,
			message: `Template "${row.name}" created with empty pack config (no services yet).`
		};
	},

	updateTemplate: async ({ request, locals }) => {
		const admin = await requirePlatformAdmin(locals.user);
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const name = String(form.get('name') ?? '').trim();
		const slugRaw = String(form.get('slug') ?? '').trim();
		const description = String(form.get('description') ?? '').trim() || null;
		const version = String(form.get('version') ?? '').trim() || '1.0.0';
		const queueStrategy = normalizeQueueStrategy(String(form.get('queueStrategy') ?? ''));

		if (!id || !name) return fail(400, { message: 'Id and name are required.', success: false });

		const slug = slugify(slugRaw || name);
		if (!slug) return fail(400, { message: 'Slug is required.', success: false });

		const conflict = await db.query.industryPack.findFirst({
			where: and(eq(industryPack.slug, slug), ne(industryPack.id, id))
		});
		if (conflict) {
			return fail(400, { message: `Slug "${slug}" is already in use.`, success: false });
		}

		const current = await db.query.industryPack.findFirst({
			where: eq(industryPack.id, id)
		});
		if (!current) return fail(404, { message: 'Template not found.', success: false });

		const prev = (current.config ?? {}) as Partial<IndustryPackConfig>;
		const config: IndustryPackConfig = {
			services: Array.isArray(prev.services) ? prev.services : [],
			ticketNumberFormat: prev.ticketNumberFormat ?? '{PREFIX}{NNN}',
			voiceScripts:
				prev.voiceScripts && typeof prev.voiceScripts === 'object' ? prev.voiceScripts : {},
			appointmentTypes: Array.isArray(prev.appointmentTypes) ? prev.appointmentTypes : [],
			uiLabels: prev.uiLabels && typeof prev.uiLabels === 'object' ? prev.uiLabels : {},
			queueStrategyDefault: queueStrategy
		};

		const [row] = await db
			.update(industryPack)
			.set({ name, slug, description, version, config })
			.where(eq(industryPack.id, id))
			.returning();

		if (!row) return fail(404, { message: 'Template not found.', success: false });

		await writeAudit({
			actorUserId: admin.id,
			action: 'template.update',
			entityType: 'industry_pack',
			entityId: row.id,
			payload: { name, slug }
		});

		return { success: true, message: `Template "${row.name}" updated.` };
	}
};
