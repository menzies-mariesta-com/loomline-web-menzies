import type {
	DocFrontmatter,
	DocNavGroup,
	DocNavItem,
	DocTree,
	SearchEntry
} from './types';

type DocModule = {
	default: unknown;
	metadata?: Partial<DocFrontmatter>;
};

export const DOC_TREES: DocTree[] = [
	'business',
	'developer',
	'brand',
	'partners',
	'investors'
];

const SECTION_LABELS: Record<DocTree, Record<string, string>> = {
	business: {
		start: 'Getting started',
		floor: 'Floor setup',
		operations: 'Operations',
		admin: 'Team and config'
	},
	developer: {
		start: 'Getting started',
		connect: 'API and auth',
		events: 'Events and messaging',
		surfaces: 'Floor embedding'
	},
	brand: {
		brand: 'Brand and assets'
	},
	partners: {
		partners: 'Sponsors and partners'
	},
	investors: {
		investors: 'Investors'
	}
};

const SECTION_ORDER: Record<DocTree, string[]> = {
	business: ['start', 'floor', 'operations', 'admin'],
	developer: ['start', 'connect', 'events', 'surfaces'],
	brand: ['brand'],
	partners: ['partners'],
	investors: ['investors']
};

const TREE_TITLES: Record<DocTree, string> = {
	business: 'Business Documentation',
	developer: 'Developer Documentation',
	brand: 'Brand Guidelines',
	partners: 'Sponsors and Partners',
	investors: 'Investor Materials'
};

const TREE_NAV_LABELS: Record<DocTree, string> = {
	business: 'Business',
	developer: 'Developer',
	brand: 'Brand',
	partners: 'Partners',
	investors: 'Investors'
};

const modules = import.meta.glob<{
	default: unknown;
	metadata?: Partial<DocFrontmatter>;
}>('../../../content/docs/**/*.{md,svx}', { eager: true });

function parsePath(path: string): { tree: DocTree; slug: string } | null {
	const match = path.match(
		/\/content\/docs\/(business|developer|brand|partners|investors)\/(.+)\.(md|svx)$/
	);
	if (!match) return null;
	const tree = match[1] as DocTree;
	const slug = match[2]!.replace(/\/index$/, '');
	return { tree, slug };
}

function toItem(path: string, mod: DocModule): DocNavItem | null {
	const parsed = parsePath(path);
	const meta = mod.metadata;
	if (!parsed || !meta?.title || !meta.description || !meta.section || meta.order == null) {
		return null;
	}
	return {
		title: meta.title,
		description: meta.description,
		section: meta.section,
		order: meta.order,
		slug: parsed.slug,
		tree: parsed.tree,
		href: `/docs/${parsed.tree}/${parsed.slug}`
	};
}

export function getAllDocs(tree: DocTree): DocNavItem[] {
	const items: DocNavItem[] = [];
	for (const [path, mod] of Object.entries(modules)) {
		const item = toItem(path, mod as DocModule);
		if (item && item.tree === tree) items.push(item);
	}
	const order = SECTION_ORDER[tree];
	return items.sort((a, b) => {
		const si = order.indexOf(a.section) - order.indexOf(b.section);
		if (si !== 0) return si;
		return a.order - b.order || a.title.localeCompare(b.title);
	});
}

export function getNavGroups(tree: DocTree): DocNavGroup[] {
	const docs = getAllDocs(tree);
	const labels = SECTION_LABELS[tree];
	return SECTION_ORDER[tree]
		.map((id) => ({
			id,
			label: labels[id] ?? id,
			items: docs.filter((d) => d.section === id)
		}))
		.filter((g) => g.items.length > 0);
}

export function getDocBySlug(tree: DocTree, slug: string): DocNavItem | undefined {
	return getAllDocs(tree).find((d) => d.slug === slug);
}

export function getDocModule(tree: DocTree, slug: string): DocModule | undefined {
	const entry = Object.entries(modules).find(([path]) => {
		const parsed = parsePath(path);
		return parsed?.tree === tree && parsed.slug === slug;
	});
	return entry ? (entry[1] as DocModule) : undefined;
}

export function getAdjacentDocs(
	tree: DocTree,
	slug: string
): { prev: DocNavItem | null; next: DocNavItem | null } {
	const docs = getAllDocs(tree);
	const index = docs.findIndex((d) => d.slug === slug);
	if (index < 0) return { prev: null, next: null };
	return {
		prev: index > 0 ? docs[index - 1]! : null,
		next: index < docs.length - 1 ? docs[index + 1]! : null
	};
}

export function buildSearchIndex(tree: DocTree): SearchEntry[] {
	return getAllDocs(tree).map((doc) => ({
		slug: doc.slug,
		href: doc.href,
		title: doc.title,
		description: doc.description,
		section: doc.section,
		tree: doc.tree,
		headings: []
	}));
}

export function getTreeTitle(tree: DocTree): string {
	return TREE_TITLES[tree];
}

export function getTreeNavLabel(tree: DocTree): string {
	return TREE_NAV_LABELS[tree];
}

export function getFirstDocHref(tree: DocTree): string {
	const first = getAllDocs(tree)[0];
	return first?.href ?? `/docs/${tree}`;
}

/** Old developer paths that moved to dedicated trees. */
export const DEVELOPER_DOC_REDIRECTS: Record<string, string> = {
	'brand/overview': '/docs/brand/overview',
	'brand/referencing': '/docs/brand/referencing',
	'brand/assets': '/docs/brand/assets',
	partners: '/docs/partners/overview',
	investors: '/docs/investors/overview'
};

export { SECTION_LABELS, SECTION_ORDER };
