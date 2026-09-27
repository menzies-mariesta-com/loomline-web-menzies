import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { requireUser, isPlatformAdmin } from '#lib/server/qms/guards';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = await requireUser(locals.user);
	if (!(await isPlatformAdmin(user.id))) {
		throw redirect(303, '/workspaces');
	}
	return { user };
};
