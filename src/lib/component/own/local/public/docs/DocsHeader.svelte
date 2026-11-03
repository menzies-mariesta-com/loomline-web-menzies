<script lang="ts">
	import { Menu, Search } from '@lucide/svelte';
	import AppearanceMenu from '#lib/component/own/local/private/AppearanceMenu.svelte';
	import LanguageMenu from '#lib/component/own/local/private/LanguageMenu.svelte';
	import DocsBrandMark from './DocsBrandMark.svelte';
	import { resolve } from '$app/paths';

	let {
		title,
		onSearch,
		onMenu
	}: {
		title: string;
		onSearch?: () => void;
		onMenu?: () => void;
	} = $props();

	const isMac = $derived(
		typeof navigator !== 'undefined' &&
			(/Mac|iPhone|iPad|iPod/i.test(navigator.platform) || /Mac OS X/i.test(navigator.userAgent))
	);
</script>

<header
	class="sticky top-0 z-30 flex h-12 min-h-12 items-center border-b border-ink-border/80 bg-base-100/80 px-4 backdrop-blur-sm lg:px-6"
>
	<div class="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
		<div class="flex min-w-0 items-center gap-2 sm:gap-3">
			{#if onMenu}
				<div class="tooltip tooltip-secondary tooltip-right lg:hidden" data-tip="Open menu">
					<button
						type="button"
						class="btn btn-ghost btn-square btn-secondary shrink-0 cursor-pointer"
						aria-label="Open menu"
						onclick={onMenu}
					>
						<Menu class="size-5" strokeWidth={2} aria-hidden="true" />
					</button>
				</div>
			{/if}
			<a href={resolve('/docs')} class="flex min-w-0 cursor-pointer items-center gap-2.5">
				<DocsBrandMark size="md" />
				<span class="flex min-w-0 flex-col leading-tight">
					<span class="font-display truncate text-lg font-semibold tracking-tight sm:text-xl">
						{title}
					</span>
					<span class="hidden truncate text-xs text-ink-muted sm:inline">NextUp Soft Wash</span>
				</span>
			</a>
		</div>

		<div class="flex justify-center">
			{#if onSearch}
				<button
					type="button"
					class="btn hidden h-10 min-h-10 w-56 cursor-pointer justify-start gap-2 border border-base-content/25 bg-base-100 px-3 font-normal shadow-none hover:border-base-content/40 hover:bg-base-100 md:inline-flex lg:w-72"
					aria-label="Search"
					onclick={onSearch}
				>
					<Search class="size-4 shrink-0 opacity-70" strokeWidth={2} aria-hidden="true" />
					<span class="min-w-0 flex-1 truncate text-left text-sm opacity-60">Search pages…</span>
					<kbd class="kbd kbd-sm shrink-0">{isMac ? '⌘' : 'Ctrl'}K</kbd>
				</button>
			{/if}
		</div>

		<div class="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
			{#if onSearch}
				<div class="tooltip tooltip-secondary tooltip-left md:hidden" data-tip="Search">
					<button
						type="button"
						class="btn btn-ghost btn-square btn-secondary cursor-pointer"
						aria-label="Search"
						onclick={onSearch}
					>
						<Search class="size-4" aria-hidden="true" />
					</button>
				</div>
			{/if}
			<AppearanceMenu size="sm" />
			<LanguageMenu size="sm" />
		</div>
	</div>
</header>
