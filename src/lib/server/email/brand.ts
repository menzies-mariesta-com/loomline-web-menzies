import { ORIGIN } from '$app/env/private';

/** Soft Wash palette (matches marketing CSS tokens). */
export const emailBrand = {
	mint: '#d8eee6',
	mintDeep: '#b8ddd0',
	ink: '#1c2a28',
	coral: '#e07a5f',
	teal: '#3d7a6f',
	navy: '#2c3e50',
	cream: '#f7f4ef',
	white: '#ffffff'
} as const;

/** Public site origin for absolute asset and CTA links in HTML email. */
export function siteOrigin(): string {
	const fromEnv = (ORIGIN ?? process.env.ORIGIN ?? '').trim().replace(/\/$/, '');
	return fromEnv || 'http://localhost:4001';
}

/** Absolute URL for a path under `/static` (served at site root). */
export function emailAssetUrl(path: string): string {
	const clean = path.startsWith('/') ? path : `/${path}`;
	return `${siteOrigin()}${clean}`;
}

export function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

export function escapeAttr(value: string): string {
	return escapeHtml(value).replaceAll("'", '&#39;');
}
