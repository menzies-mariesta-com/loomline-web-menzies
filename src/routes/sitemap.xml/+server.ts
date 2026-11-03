import { ORIGIN } from '$app/env/private';
import { DOC_TREES, getAllDocs } from '#lib/tool/docs/catalog';

const BASE = (ORIGIN || 'http://localhost:4001').replace(/\/$/, '');

const staticPaths = [
	{ loc: '/', priority: '1.0', changefreq: 'weekly' },
	{ loc: '/pricing', priority: '0.9', changefreq: 'monthly' },
	{ loc: '/docs', priority: '0.9', changefreq: 'weekly' },
	{ loc: '/privacy', priority: '0.5', changefreq: 'yearly' },
	{ loc: '/terms', priority: '0.5', changefreq: 'yearly' }
] as const;

export function GET() {
	const docPaths = DOC_TREES.flatMap((tree) =>
		getAllDocs(tree).map((d) => ({
			loc: d.href,
			priority: '0.7',
			changefreq: 'monthly' as const
		}))
	);

	const paths = [...staticPaths, ...docPaths];

	const urls = paths
		.map(
			(p) => `  <url>
    <loc>${BASE}${p.loc === '/' ? '/' : p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
		)
		.join('\n');

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
}
