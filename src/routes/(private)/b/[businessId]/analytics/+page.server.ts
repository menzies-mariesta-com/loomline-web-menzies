import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

/** Analytics lives on Home. Keep bookmarks working. */
export const load: PageServerLoad = async ({ params, url }) => {
	const days = url.searchParams.get('days');
	const qs = days ? `?days=${encodeURIComponent(days)}` : '';
	throw redirect(301, `/b/${params.businessId}${qs}`);
};
