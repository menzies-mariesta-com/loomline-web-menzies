import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** Legacy path: platform admin moved to /admin */
export const load: PageServerLoad = async () => {
	throw redirect(301, '/admin');
};
