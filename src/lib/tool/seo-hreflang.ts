import { baseLocale, locales, localizeHref } from '#lib/paraglide/runtime';

export type HreflangLink = { hreflang: string; href: string };

export function hreflangLinks(origin: string, pathname: string): HreflangLink[] {
	const base = origin.replace(/\/$/, '');
	const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
	const links: HreflangLink[] = locales.map((locale) => ({
		hreflang: locale,
		href: `${base}${localizeHref(path, { locale })}`
	}));
	links.push({
		hreflang: 'x-default',
		href: `${base}${localizeHref(path, { locale: baseLocale })}`
	});
	return links;
}
