import { ORIGIN } from '$app/env/private';

const BASE = (ORIGIN || 'http://localhost:4001').replace(/\/$/, '');

const paths = [
	{ loc: '/', priority: '1.0', changefreq: 'weekly' },
	{ loc: '/pricing', priority: '0.9', changefreq: 'monthly' }
] as const;

export function GET() {
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
