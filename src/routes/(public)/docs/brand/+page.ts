import { redirect } from '@sveltejs/kit';
import { getFirstDocHref } from '#lib/tool/docs/catalog';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = () => {
	redirect(303, getFirstDocHref('brand'));
};
