import { error, redirect } from '@sveltejs/kit';
import {
	DEVELOPER_DOC_REDIRECTS,
	getAdjacentDocs,
	getAllDocs,
	getDocBySlug,
	SECTION_LABELS
} from '#lib/tool/docs/catalog';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => {
	const live = getAllDocs('developer').map((d) => ({ slug: d.slug }));
	const redirects = Object.keys(DEVELOPER_DOC_REDIRECTS).map((slug) => ({ slug }));
	return [...live, ...redirects];
};

export const load: PageLoad = ({ params }) => {
	const slug = params.slug;
	const moved = DEVELOPER_DOC_REDIRECTS[slug];
	if (moved) redirect(301, moved);

	const doc = getDocBySlug('developer', slug);
	if (!doc) error(404, `Documentation page not found: ${slug}`);
	const { prev, next } = getAdjacentDocs('developer', slug);
	return {
		slug,
		doc,
		sectionLabel: SECTION_LABELS.developer[doc.section] ?? doc.section,
		prev,
		next
	};
};
