<script lang="ts">
	import frauncesUrl from '#lib/asset/font/fraunces-latin.woff2?url';
	import HomeNav from '#lib/component/own/local/public/home/HomeNav.svelte';
	import HomeFooter from '#lib/component/own/local/public/home/HomeFooter.svelte';
	import PricingPlans from '#lib/component/own/local/public/home/PricingPlans.svelte';
	import PricingAudienceFaq from '#lib/component/own/local/public/home/PricingAudienceFaq.svelte';
	import { m } from '#lib/paraglide/messages';

	let { data } = $props();

	const title = $derived(m.pricing_seo_title());
	const description = $derived(m.pricing_seo_description());
	const canonical = $derived(`${data.origin.replace(/\/$/, '')}/pricing`);
	const ogImage = $derived(`${data.origin.replace(/\/$/, '')}/og-loomline.png`);

	const jsonLd = $derived(
		JSON.stringify([
			{
				'@context': 'https://schema.org',
				'@type': 'WebPage',
				name: title,
				description,
				url: canonical,
				isPartOf: {
					'@type': 'WebSite',
					name: m.brand_loomline(),
					url: data.origin.replace(/\/$/, '')
				}
			},
			{
				'@context': 'https://schema.org',
				'@type': 'SoftwareApplication',
				name: m.brand_loomline_qms(),
				applicationCategory: 'BusinessApplication',
				operatingSystem: 'Web',
				url: canonical,
				description,
				offers: [
					{
						'@type': 'Offer',
						name: m.pricing_plan_starter_name(),
						price: '49',
						priceCurrency: 'USD',
						priceSpecification: {
							'@type': 'UnitPriceSpecification',
							price: '49',
							priceCurrency: 'USD',
							billingDuration: 'P1M'
						}
					},
					{
						'@type': 'Offer',
						name: m.pricing_plan_business_name(),
						price: '149',
						priceCurrency: 'USD',
						priceSpecification: {
							'@type': 'UnitPriceSpecification',
							price: '149',
							priceCurrency: 'USD',
							billingDuration: 'P1M'
						}
					},
					{
						'@type': 'Offer',
						name: m.pricing_plan_scale_name(),
						price: '299',
						priceCurrency: 'USD',
						priceSpecification: {
							'@type': 'UnitPriceSpecification',
							price: '299',
							priceCurrency: 'USD',
							billingDuration: 'P1M'
						}
					}
				]
			}
		])
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
	<meta property="og:site_name" content={m.brand_loomline()} />
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
		<PricingPlans />
		<PricingAudienceFaq />
	</main>
	<HomeFooter />
</div>
