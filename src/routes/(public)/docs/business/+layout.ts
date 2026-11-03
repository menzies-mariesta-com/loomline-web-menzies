import { buildSearchIndex, getNavGroups } from '#lib/tool/docs/catalog';

export const prerender = true;

export function load() {
	return {
		navGroups: getNavGroups('business'),
		searchIndex: buildSearchIndex('business')
	};
}
