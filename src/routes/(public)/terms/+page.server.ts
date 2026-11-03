import { ORIGIN } from '$app/env/private';

export const prerender = true;

export function load() {
	return {
		origin: ORIGIN || 'http://localhost:4001'
	};
}
