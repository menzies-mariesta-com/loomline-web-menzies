import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { requireUser, getMembershipsForUser, isPlatformAdmin } from '#lib/server/qms/guards';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await requireUser(locals.user);
	const memberships = await getMembershipsForUser(user.id);
	const platformAdmin = await isPlatformAdmin(user.id);

	const usable = memberships.filter((m) => {
		const status = m.business?.status;
		return status === 'active' || status === 'pending';
	});

	if (!platformAdmin && usable.length === 1 && usable[0].business) {
		throw redirect(303, `/b/${usable[0].business.id}`);
	}

	return { memberships: usable, platformAdmin };
};
