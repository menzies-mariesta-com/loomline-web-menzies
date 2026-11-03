<script lang="ts">
	import frauncesUrl from '#lib/asset/font/fraunces-latin.woff2?url';
	import HomeNav from '#lib/component/own/local/public/home/HomeNav.svelte';
	import HomeHero from '#lib/component/own/local/public/home/HomeHero.svelte';
	import HomeHowItWorks from '#lib/component/own/local/public/home/HomeHowItWorks.svelte';
	import HomeIndustries from '#lib/component/own/local/public/home/HomeIndustries.svelte';
	import HomeBusinessModel from '#lib/component/own/local/public/home/HomeBusinessModel.svelte';
	import HomeSurfaces from '#lib/component/own/local/public/home/HomeSurfaces.svelte';
	import HomeOmnichannel from '#lib/component/own/local/public/home/HomeOmnichannel.svelte';
	import HomeCta from '#lib/component/own/local/public/home/HomeCta.svelte';
	import HomeFooter from '#lib/component/own/local/public/home/HomeFooter.svelte';
	import { m } from '#lib/paraglide/messages';

	let { data } = $props();

	const title = $derived(m.home_seo_title());
	const description = $derived(m.home_seo_description());
	const canonical = $derived(data.origin.replace(/\/$/, ''));
	const ogImage = $derived(`${canonical}/og-nextup.png`);

	const jsonLd = $derived(
		JSON.stringify([
			{
				'@context': 'https://schema.org',
				'@type': 'Organization',
				name: m.brand_nextup(),
				url: canonical,
				description
			},
			{
				'@context': 'https://schema.org',
				'@type': 'WebSite',
				name: m.brand_nextup(),
				url: canonical,
				description
			},
			{
				'@context': 'https://schema.org',
				'@type': 'SoftwareApplication',
				name: m.brand_nextup_qms(),
				applicationCategory: 'BusinessApplication',
				operatingSystem: 'Web',
				url: canonical,
				description
			}
		])
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href="{canonical}/" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content="{canonical}/" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={m.brand_nextup()} />
	<meta property="og:image" content={ogImage} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />
	<link rel="preload" href={frauncesUrl} as="font" type="font/woff2" crossorigin="anonymous" />
	{@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<div class="loom-marketing paper-grain min-h-screen">
	<HomeNav />
	<main>
		<HomeHero />
		<HomeHowItWorks />
		<HomeIndustries />
		<HomeBusinessModel />
		<HomeSurfaces />
		<HomeOmnichannel />
		<HomeCta />
	</main>
	<HomeFooter />
</div>
