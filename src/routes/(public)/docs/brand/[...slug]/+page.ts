import { error } from '@sveltejs/kit';
import {
	getAdjacentDocs,
	getAllDocs,
	getDocBySlug,
	SECTION_LABELS
} from '#lib/tool/docs/catalog';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => {
	return getAllDocs('brand').map((d) => ({ slug: d.slug }));
};

export const load: PageLoad = ({ params }) => {
	const slug = params.slug;
	const doc = getDocBySlug('brand', slug);
	if (!doc) error(404, `Documentation page not found: ${slug}`);
	const { prev, next } = getAdjacentDocs('brand', slug);
	return {
		slug,
		doc,
		sectionLabel: SECTION_LABELS.brand[doc.section] ?? doc.section,
		prev,
		next
	};
};
