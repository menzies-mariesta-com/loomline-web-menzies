<script lang="ts">
	import { hreflangLinks } from '#lib/tool/seo-hreflang';

	type Props = {
		title: string;
		description: string;
		canonical: string;
		ogImage: string;
		pathname?: string;
		origin?: string;
		jsonLd?: string;
		siteName?: string;
		ogType?: string;
		preloadFontUrl?: string;
	};

	let {
		title,
		description,
		canonical,
		ogImage,
		pathname = '/',
		origin = '',
		jsonLd,
		siteName = 'NextUp',
		ogType = 'website',
		preloadFontUrl
	}: Props = $props();

	const alternates = $derived(origin ? hreflangLinks(origin, pathname) : []);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />
	{#each alternates as alt (alt.hreflang)}
		<link rel="alternate" hreflang={alt.hreflang} href={alt.href} />
	{/each}
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:type" content={ogType} />
	<meta property="og:site_name" content={siteName} />
	<meta property="og:image" content={ogImage} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />
	{#if preloadFontUrl}
		<link rel="preload" href={preloadFontUrl} as="font" type="font/woff2" crossorigin="anonymous" />
	{/if}
	{#if jsonLd}
		{@html `<script type="application/ld+json">${jsonLd}</script>`}
	{/if}
</svelte:head>
