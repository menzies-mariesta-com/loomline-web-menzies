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
	return getAllDocs('business').map((d) => ({ slug: d.slug }));
};

export const load: PageLoad = ({ params }) => {
	const slug = params.slug;
	const doc = getDocBySlug('business', slug);
	if (!doc) error(404, `Documentation page not found: ${slug}`);
	const { prev, next } = getAdjacentDocs('business', slug);
	return {
		slug,
		doc,
		sectionLabel: SECTION_LABELS.business[doc.section] ?? doc.section,
		prev,
		next
	};
};
