<script lang="ts">
	import DocsBreadcrumbs from '#lib/component/own/local/public/docs/DocsBreadcrumbs.svelte';
	import DocsToc from '#lib/component/own/local/public/docs/DocsToc.svelte';
	import DocsPrevNext from '#lib/component/own/local/public/docs/DocsPrevNext.svelte';
	import { getDocModule } from '#lib/tool/docs/catalog';
	import { collectToc, observeActiveHeading } from '#lib/tool/docs/toc';
	import type { TocItem } from '#lib/tool/docs/types';
	import { page } from '$app/state';
	import type { Component } from 'svelte';

	let { data } = $props();

	const Doc = $derived(
		getDocModule('business', data.slug)?.default as Component | undefined
	);

	let articleEl = $state<HTMLElement | null>(null);
	let tocItems = $state<TocItem[]>([]);
	let activeId = $state<string | null>(null);
	let pinnedId = $state<string | null>(null);
	let pinTimer: ReturnType<typeof setTimeout> | undefined;

	function selectTocHeading(id: string) {
		activeId = id;
		pinnedId = id;
		if (pinTimer) clearTimeout(pinTimer);
		pinTimer = setTimeout(() => {
			pinnedId = null;
		}, 900);
	}

	$effect(() => {
		data.slug;
		queueMicrotask(() => {
			tocItems = collectToc(articleEl);
		});
	});

	$effect(() => {
		data.slug;
		pinnedId = null;
		if (pinTimer) clearTimeout(pinTimer);
		return observeActiveHeading(articleEl, (id) => {
			if (pinnedId) return;
			activeId = id;
		});
	});

	const origin = $derived(page.url.origin);
	const canonical = $derived(`${origin}${data.doc.href}`);
	const ogImage = $derived(`${origin}/og-nextup.png`);

	const crumbs = $derived([
		{ href: '/', label: 'Home' },
		{ href: '/docs', label: 'Docs' },
		{ href: '/docs/business/overview', label: 'Business' },
		{ href: data.doc.href, label: data.doc.title }
	]);
</script>

<svelte:head>
	<title>{data.doc.title} | Business Documentation | NextUp</title>
	<meta name="description" content={data.doc.description} />
	<link rel="canonical" href={canonical} />
	<meta property="og:title" content={`${data.doc.title} | NextUp`} />
	<meta property="og:description" content={data.doc.description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:type" content="article" />
	<meta property="og:image" content={ogImage} />
	<meta property="og:site_name" content="NextUp" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={`${data.doc.title} | NextUp`} />
	<meta name="twitter:description" content={data.doc.description} />
	<meta name="twitter:image" content={ogImage} />
</svelte:head>

<div class="flex w-full">
	<div class="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-10">
		<DocsBreadcrumbs items={crumbs} />
		<p class="mt-4 text-xs font-semibold tracking-wide text-primary uppercase">
			{data.sectionLabel}
		</p>
		<article class="docs-prose mt-2" bind:this={articleEl}>
			{#if Doc}
				<Doc />
			{/if}
		</article>
		<DocsPrevNext prev={data.prev} next={data.next} />
	</div>
	<aside
		class="sticky top-12 hidden h-[calc(100dvh-3rem)] w-56 shrink-0 overflow-y-auto scroll-smooth pt-3 pb-6 pe-5 xl:block"
	>
		<DocsToc items={tocItems} {activeId} onSelect={selectTocHeading} />
	</aside>
</div>
