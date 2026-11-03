<script lang="ts">
	import frauncesUrl from '#lib/asset/font/fraunces-latin.woff2?url';
	import HomeNav from '#lib/component/own/local/public/home/HomeNav.svelte';
	import HomeFooter from '#lib/component/own/local/public/home/HomeFooter.svelte';
	import PricingPlans from '#lib/component/own/local/public/home/PricingPlans.svelte';
	import PricingTrialRequest from '#lib/component/own/local/public/home/PricingTrialRequest.svelte';
	import PricingAudienceFaq from '#lib/component/own/local/public/home/PricingAudienceFaq.svelte';
	import { m } from '#lib/paraglide/messages';
	import { CLOUD_MONTHLY_USD, onpremMonthlyUsd } from '#lib/tool/pricing';

	let { data, form } = $props();

	const title = $derived(m.pricing_seo_title());
	const description = $derived(m.pricing_seo_description());
	const canonical = $derived(`${data.origin.replace(/\/$/, '')}/pricing`);
	const ogImage = $derived(`${data.origin.replace(/\/$/, '')}/og-nextup.png`);

	const onpremStarter = onpremMonthlyUsd(CLOUD_MONTHLY_USD.starter);
	const onpremBusiness = onpremMonthlyUsd(CLOUD_MONTHLY_USD.business);
	const onpremScale = onpremMonthlyUsd(CLOUD_MONTHLY_USD.scale);

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
					name: m.brand_nextup(),
					url: data.origin.replace(/\/$/, '')
				}
			},
			{
				'@context': 'https://schema.org',
				'@type': 'SoftwareApplication',
				name: m.brand_nextup_qms(),
				applicationCategory: 'BusinessApplication',
				operatingSystem: 'Web',
				url: canonical,
				description,
				offers: [
					{
						'@type': 'Offer',
						name: `Cloud ${m.pricing_plan_starter_name()}`,
						price: String(CLOUD_MONTHLY_USD.starter),
						priceCurrency: 'USD',
						priceSpecification: {
							'@type': 'UnitPriceSpecification',
							price: String(CLOUD_MONTHLY_USD.starter),
							priceCurrency: 'USD',
							billingDuration: 'P1M'
						}
					},
					{
						'@type': 'Offer',
						name: `Cloud ${m.pricing_plan_business_name()}`,
						price: String(CLOUD_MONTHLY_USD.business),
						priceCurrency: 'USD',
						priceSpecification: {
							'@type': 'UnitPriceSpecification',
							price: String(CLOUD_MONTHLY_USD.business),
							priceCurrency: 'USD',
							billingDuration: 'P1M'
						}
					},
					{
						'@type': 'Offer',
						name: `Cloud ${m.pricing_plan_scale_name()}`,
						price: String(CLOUD_MONTHLY_USD.scale),
						priceCurrency: 'USD',
						priceSpecification: {
							'@type': 'UnitPriceSpecification',
							price: String(CLOUD_MONTHLY_USD.scale),
							priceCurrency: 'USD',
							billingDuration: 'P1M'
						}
					},
					{
						'@type': 'Offer',
						name: `On-premise ${m.pricing_plan_starter_name()}`,
						price: String(onpremStarter),
						priceCurrency: 'USD',
						priceSpecification: {
							'@type': 'UnitPriceSpecification',
							price: String(onpremStarter),
							priceCurrency: 'USD',
							billingDuration: 'P1M'
						}
					},
					{
						'@type': 'Offer',
						name: `On-premise ${m.pricing_plan_business_name()}`,
						price: String(onpremBusiness),
						priceCurrency: 'USD',
						priceSpecification: {
							'@type': 'UnitPriceSpecification',
							price: String(onpremBusiness),
							priceCurrency: 'USD',
							billingDuration: 'P1M'
						}
					},
					{
						'@type': 'Offer',
						name: `On-premise ${m.pricing_plan_scale_name()}`,
						price: String(onpremScale),
						priceCurrency: 'USD',
						priceSpecification: {
							'@type': 'UnitPriceSpecification',
							price: String(onpremScale),
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
		<PricingPlans />
		<PricingTrialRequest {form} />
		<PricingAudienceFaq />
	</main>
	<HomeFooter />
</div>
