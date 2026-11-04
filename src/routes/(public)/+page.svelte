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
	import SeoHead from '#lib/component/own/local/public/SeoHead.svelte';
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

<SeoHead
	{title}
	{description}
	canonical="{canonical}/"
	{ogImage}
	pathname="/"
	origin={canonical}
	{jsonLd}
	siteName={m.brand_nextup()}
	preloadFontUrl={frauncesUrl}
/>

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
