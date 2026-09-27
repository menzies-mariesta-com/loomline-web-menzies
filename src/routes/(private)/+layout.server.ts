import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { isPlatformAdmin } from '#lib/server/qms/guards';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		let redirectTo = url.pathname;
		if (redirectTo === '/app' || redirectTo.startsWith('/app/')) redirectTo = '/workspaces';
		if (redirectTo === '/platform' || redirectTo.startsWith('/platform/')) redirectTo = '/admin';
		throw redirect(303, `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	const platformAdmin = await isPlatformAdmin(locals.user.id);
	return {
		user: locals.user,
		platformAdmin
	};
};
