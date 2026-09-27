import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** @deprecated Use /b/[businessId]/config */
export const load: PageServerLoad = async ({ params }) => {
	throw redirect(301, `/b/${params.businessId}/config`);
};
