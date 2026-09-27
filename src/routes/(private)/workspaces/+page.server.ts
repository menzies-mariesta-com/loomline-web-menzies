import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { requireUser, getMembershipsForUser, isPlatformAdmin } from '#lib/server/qms/guards';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireUser(locals.user);
	const memberships = await getMembershipsForUser(user.id);
	const platformAdmin = await isPlatformAdmin(user.id);

	if (!platformAdmin && memberships.length === 1 && memberships[0].business) {
		throw redirect(303, `/b/${memberships[0].business.id}`);
	}

	return { memberships, platformAdmin };
};
