import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** Legacy path: client picker moved to /workspaces */
export const load: PageServerLoad = async () => {
	throw redirect(301, '/workspaces');
};
