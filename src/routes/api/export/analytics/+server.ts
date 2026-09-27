import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { requireManager } from '#lib/server/qms/guards';
import { businessAnalytics, multiBranchRollup } from '#lib/server/qms/analytics';

export const GET: RequestHandler = async ({ url, locals }) => {
	const businessId = url.searchParams.get('businessId');
	if (!businessId) throw error(400, 'businessId required');
	const days = Number(url.searchParams.get('days') ?? 7);
	const { business } = await requireManager(locals.user, businessId);
	const analytics = await businessAnalytics(business.id, days);
	const rollup = await multiBranchRollup(business.id);

	const lines = [
		'metric,value',
		`total,${analytics.total}`,
		`completed,${analytics.completed}`,
		`avg_wait_ms,${analytics.avgWaitMs}`,
		`avg_serve_ms,${analytics.avgServeMs}`,
		...Object.entries(analytics.byStatus).map(([k, v]) => `status_${k},${v}`),
		...rollup.map((r) => `site_${r.siteId}_total,${r.count}`),
		...rollup.map((r) => `site_${r.siteId}_completed,${r.completed}`)
	];

	return new Response(lines.join('\n'), {
		headers: {
			'Content-Type': 'text/csv',
			'Content-Disposition': `attachment; filename="loomline-${business.id}-${days}d.csv"`
		}
	});
};
