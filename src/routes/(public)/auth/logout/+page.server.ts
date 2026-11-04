import type { Actions } from './$types';
import { auth } from '#lib/server/auth';
import { redirect } from '@sveltejs/kit';

export const prerender = false;

export const actions: Actions = {
	default: async ({ request }) => {
		await auth.api.signOut({ headers: request.headers, request });
		throw redirect(303, '/auth/login');
	}
};
