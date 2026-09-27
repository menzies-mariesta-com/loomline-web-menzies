import type { PageServerLoad } from './$types';
import { ORIGIN } from '$app/env/private';

export const load: PageServerLoad = async () => {
	return {
		origin: ORIGIN || 'http://localhost:4001'
	};
};
