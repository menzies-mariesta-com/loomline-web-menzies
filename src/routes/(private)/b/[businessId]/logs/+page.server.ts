import type { PageServerLoad } from './$types';
import { listBusinessLogs } from '#lib/server/qms/audit';
import { requireManager } from '#lib/server/qms/guards';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { business } = await requireManager(locals.user, params.businessId);
	const logs = await listBusinessLogs(business.id, 400);
	return { logs };
};
