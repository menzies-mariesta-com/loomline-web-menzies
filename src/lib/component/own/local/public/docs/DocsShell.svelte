<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { DocNavGroup, DocTree, SearchEntry } from '#lib/tool/docs/types';
	import { getTreeTitle } from '#lib/tool/docs/catalog';
	import { page } from '$app/state';
	import { Globe } from '@lucide/svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';
	import { m } from '#lib/paraglide/messages';
	import DocsHeader from './DocsHeader.svelte';
	import DocsSearch from './DocsSearch.svelte';
	import DocsSidebar from './DocsSidebar.svelte';
	import DocsBrandMark from './DocsBrandMark.svelte';
	import { resolve } from '$app/paths';

	let {
		tree,
		navGroups,
		searchIndex,
		children
	}: {
		tree: DocTree;
		navGroups: DocNavGroup[];
		searchIndex: SearchEntry[];
		children: Snippet;
	} = $props();

	let searchOpen = $state(false);
	let drawerOpen = $state(false);

	const title = $derived(getTreeTitle(tree));
	const currentSlug = $derived.by(() => {
		const prefix = `/docs/${tree}/`;
		const path = page.url.pathname;
		if (!path.startsWith(prefix)) return '';
		return path.slice(prefix.length).replace(/\/$/, '');
	});

	$effect(() => {
		page.url.pathname;
		drawerOpen = false;
	});
</script>

<DocsSearch entries={searchIndex} bind:open={searchOpen} />

<!-- Literal `lg:drawer-open` so daisyUI emits it (washRecipes.drawer alone is not scanned). -->
<div class="drawer loom-marketing {washRecipes.pageWash} min-h-dvh w-full lg:drawer-open">
	<input id="loom-docs-drawer-{tree}" type="checkbox" class="drawer-toggle" bind:checked={drawerOpen} />

	<div class="drawer-content flex min-h-dvh flex-col">
		<DocsHeader
			{title}
			onSearch={() => (searchOpen = true)}
			onMenu={() => (drawerOpen = true)}
		/>
		<div class="min-w-0 flex-1">{@render children()}</div>
	</div>

	<div class="drawer-side z-40">
		<label
			for="loom-docs-drawer-{tree}"
			class="drawer-overlay cursor-pointer"
			aria-label="Close sidebar"
		></label>
		<aside
			class="flex min-h-full w-[280px] flex-col border-r border-ink-border bg-base-100/75 paper-grain backdrop-blur-sm"
		>
			<div class="flex h-12 min-h-12 shrink-0 items-center border-b border-ink-border/80 px-5">
				<a href={resolve('/docs')} class="flex min-w-0 cursor-pointer items-center gap-2.5">
					<DocsBrandMark size="md" />
					<span class="flex min-w-0 flex-col leading-tight">
						<span class="font-display truncate text-lg font-semibold tracking-tight">{title}</span>
						<span class="text-ink-muted truncate text-[10px] italic">NextUp</span>
					</span>
				</a>
			</div>
			<ul class="menu w-full min-h-0 flex-1 gap-1 overflow-y-auto px-3 py-4">
				<DocsSidebar
					groups={navGroups}
					{currentSlug}
					onNavigate={() => (drawerOpen = false)}
				/>
			</ul>
			<div class="shrink-0 border-t border-ink-border/80 p-3">
				<a
					href={resolve('/')}
					class="btn btn-ghost btn-sm h-10 min-h-10 w-full cursor-pointer justify-start gap-2 font-normal"
					onclick={() => (drawerOpen = false)}
				>
					<Globe class="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
					{m.common_website()}
				</a>
			</div>
		</aside>
	</div>
</div>
