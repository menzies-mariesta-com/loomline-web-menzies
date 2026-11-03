<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import frauncesUrl from '#lib/asset/font/fraunces-latin.woff2?url';
	import appIcon from '#lib/asset/image/app-icon-ticket.svg';
	import { m } from '#lib/paraglide/messages';
	import ErrorScene404 from './ErrorScene404.svelte';
	import ErrorScene403 from './ErrorScene403.svelte';
	import ErrorScene500 from './ErrorScene500.svelte';
	import ErrorScene503 from './ErrorScene503.svelte';
	import ErrorSceneGeneric from './ErrorSceneGeneric.svelte';

	type ErrorKind = '404' | '403' | '500' | '503' | 'generic';

	let { status = 500 }: { status?: number } = $props();

	const kind = $derived.by((): ErrorKind => {
		if (status === 404) return '404';
		if (status === 403 || status === 401) return '403';
		if (status === 503) return '503';
		if (status >= 500) return '500';
		return 'generic';
	});

	const title = $derived.by(() => {
		switch (kind) {
			case '404':
				return m.error_404_seo_title();
			case '403':
				return m.error_403_seo_title();
			case '500':
				return m.error_500_seo_title();
			case '503':
				return m.error_503_seo_title();
			default:
				return m.error_generic_seo_title();
		}
	});

	const description = $derived.by(() => {
		switch (kind) {
			case '404':
				return m.error_404_message();
			case '403':
				return m.error_403_message();
			case '500':
				return m.error_500_message();
			case '503':
				return m.error_503_message();
			default:
				return m.error_generic_message();
		}
	});

	const heading = $derived.by(() => {
		switch (kind) {
			case '404':
				return m.error_404_title();
			case '403':
				return m.error_403_title();
			case '500':
				return m.error_500_title();
			case '503':
				return m.error_503_title();
			default:
				return m.error_generic_title();
		}
	});

	const statusLabel = $derived(String(status));
	const origin = $derived(page.url.origin.replace(/\/$/, ''));
	const ogImage = $derived(`${origin}/og-nextup.png`);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta name="robots" content="noindex,nofollow" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={m.brand_nextup()} />
	<meta property="og:image" content={ogImage} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />
	<link rel="preload" href={frauncesUrl} as="font" type="font/woff2" crossorigin="anonymous" />
</svelte:head>

<div class="loom-marketing paper-grain min-h-screen">
	<header class="absolute inset-x-0 top-0 z-20">
		<div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
			<a
				href={resolve('/')}
				class="font-display flex cursor-pointer items-center gap-2 text-xl font-semibold tracking-tight text-[var(--loom-ink)]"
			>
				<img src={appIcon} alt="" width="32" height="32" class="size-8 shrink-0" aria-hidden="true" />
				{m.brand_nextup()}
			</a>
		</div>
	</header>

	<main
		class="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-10 px-4 py-24 sm:px-6 lg:flex-row lg:gap-14 lg:py-28"
	>
		<div class="w-full max-w-md shrink-0 lg:order-2">
			{#if kind === '404'}
				<ErrorScene404 />
			{:else if kind === '403'}
				<ErrorScene403 />
			{:else if kind === '500'}
				<ErrorScene500 />
			{:else if kind === '503'}
				<ErrorScene503 />
			{:else}
				<ErrorSceneGeneric />
			{/if}
		</div>

		<div class="relative z-10 w-full max-w-lg text-center lg:order-1 lg:text-left">
			<p
				class="font-display text-6xl font-semibold tracking-tight text-[var(--loom-ink)]/15 sm:text-7xl"
				aria-hidden="true"
			>
				{statusLabel}
			</p>
			<h1
				id="error-heading"
				class="mt-2 text-3xl leading-tight font-semibold text-[var(--loom-ink)] sm:text-4xl"
			>
				{heading}
			</h1>
			<p class="mt-4 max-w-md text-base leading-relaxed text-[var(--loom-ink)]/75 sm:text-lg lg:mx-0 mx-auto">
				{description}
			</p>
			<div class="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
				<a href={resolve('/')} class="btn btn-primary cursor-pointer">{m.error_cta_home()}</a>
				<a href={resolve('/docs')} class="btn btn-outline cursor-pointer">{m.common_docs()}</a>
				<a href={resolve('/pricing')} class="btn btn-ghost cursor-pointer">{m.common_pricing()}</a>
			</div>
		</div>
	</main>
</div>

<style>
	:global(.err-scene .err-float) {
		animation: err-float 5.5s ease-in-out infinite;
	}

	:global(.err-scene .err-bob) {
		animation: err-bob 3.8s ease-in-out infinite;
	}

	@keyframes err-float {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 0 -5px;
		}
	}

	@keyframes err-bob {
		0%,
		100% {
			opacity: 0.35;
			translate: 0 0;
		}
		50% {
			opacity: 0.55;
			translate: 0 -3px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.err-scene .err-float),
		:global(.err-scene .err-bob) {
			animation: none;
		}
	}
</style>
