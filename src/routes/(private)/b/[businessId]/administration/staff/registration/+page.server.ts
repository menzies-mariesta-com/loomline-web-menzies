import type { PageServerLoad } from './$types';
import { isPlatformAdmin, requireOwner, requireStaffRegistrar } from '#lib/server/qms/guards';
import { getStaffRegistrationContext } from '#lib/server/qms/staff-registration';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	await requireStaffRegistrar(locals.user, params.businessId);
	const membershipId = url.searchParams.get('membershipId');
	const ctx = await getStaffRegistrationContext(params.businessId, membershipId);
	let canCreateAdmin = false;
	if (locals.user) {
		if (await isPlatformAdmin(locals.user.id)) canCreateAdmin = true;
		else {
			try {
				await requireOwner(locals.user, params.businessId);
				canCreateAdmin = true;
			} catch {
				canCreateAdmin = false;
			}
		}
	}
	return { ...ctx, canCreateAdmin, businessId: params.businessId };
};
