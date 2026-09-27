import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** @deprecated Use /admin/templates */
export const load: PageServerLoad = async () => {
	throw redirect(301, '/admin/templates');
};
