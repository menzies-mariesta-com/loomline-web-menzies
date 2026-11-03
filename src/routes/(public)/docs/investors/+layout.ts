import { buildSearchIndex, getNavGroups } from '#lib/tool/docs/catalog';

export const prerender = true;

export function load() {
	return {
		navGroups: getNavGroups('investors'),
		searchIndex: buildSearchIndex('investors')
	};
}
