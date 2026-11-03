<script lang="ts">
	import frauncesUrl from '#lib/asset/font/fraunces-latin.woff2?url';
	import HomeNav from '#lib/component/own/local/public/home/HomeNav.svelte';
	import HomeFooter from '#lib/component/own/local/public/home/HomeFooter.svelte';
	import DocsHubCards from '#lib/component/own/local/public/docs/DocsHubCards.svelte';
	import { m } from '#lib/paraglide/messages';

	let { data } = $props();

	const title = $derived(m.docs_hub_seo_title());
	const description = $derived(m.docs_hub_seo_description());
	const canonical = $derived(`${data.origin.replace(/\/$/, '')}/docs`);
	const ogImage = $derived(`${data.origin.replace(/\/$/, '')}/og-nextup.png`);

	const jsonLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'CollectionPage',
			name: title,
			description,
			url: canonical,
			isPartOf: {
				'@type': 'WebSite',
				name: m.brand_nextup(),
				url: data.origin.replace(/\/$/, '')
			}
		})
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:type" content="website" />
	<meta property="og:image" content={ogImage} />
	<meta property="og:site_name" content={m.brand_nextup()} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
	<link rel="preload" href={frauncesUrl} as="font" type="font/woff2" crossorigin="anonymous" />
</svelte:head>

<div class="loom-marketing paper-grain min-h-screen">
	<HomeNav />
	<main class="pt-24 sm:pt-28">
		<header class="mx-auto max-w-5xl px-4 pb-10 text-center sm:px-6 sm:pb-14">
			<p class="text-xs font-semibold tracking-wide text-primary uppercase">NextUp</p>
			<h1 class="font-display mt-2 text-4xl font-semibold tracking-tight text-[var(--loom-ink)] sm:text-5xl">
				{m.docs_hub_title()}
			</h1>
			<p class="mx-auto mt-4 max-w-2xl text-base text-[var(--loom-ink)]/70 sm:text-lg">
				{m.docs_hub_subtitle()}
			</p>
		</header>
		<DocsHubCards />
	</main>
	<HomeFooter />
</div>
