import type { PageServerLoad } from './$types';
import { requireStaffRegistrar } from '#lib/server/qms/guards';
import { listUserGroupsWithPages } from '#lib/server/qms/user-group';

export const load: PageServerLoad = async ({ locals, params }) => {
	await requireStaffRegistrar(locals.user, params.businessId);
	return {
		...(await listUserGroupsWithPages(params.businessId)),
		businessId: params.businessId
	};
};
