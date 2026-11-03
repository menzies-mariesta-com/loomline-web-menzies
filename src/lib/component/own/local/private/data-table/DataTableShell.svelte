<script lang="ts">
	import type { Snippet } from 'svelte';
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';

	type Legend = {
		label: string;
		swatch: string;
	};

	type Props = {
		title: string;
		description?: string;
		/** Outer height classes; default fills remaining flex space. */
		class?: string;
		/** Bind to the scroll body for ResizeObserver page-size. */
		bodyEl?: HTMLDivElement | null;
		headerActions?: Snippet;
		/** Table (thead sticky + tbody) rendered inside the scroll pane. */
		children: Snippet;
		/** Left footer slot (e.g. per-page select). */
		footerStart?: Snippet;
		/** Center summary, e.g. `Showing 1-8 of 24`. */
		footerSummary?: string;
		/** Right join paginator. */
		paginator?: Snippet;
		legends?: Legend[];
	};

	let {
		title,
		description,
		class: className = 'min-h-0 flex-1',
		bodyEl = $bindable(null),
		headerActions,
		children,
		footerStart,
		footerSummary,
		paginator,
		legends = []
	}: Props = $props();
</script>

<div
	class="border-base-300 rounded-box flex min-h-0 flex-col overflow-hidden border bg-base-100 {washRecipes.tableChrome} {className}"
>
	<div
		class="border-base-300 bg-base-100 relative z-10 flex shrink-0 items-center justify-between gap-3 overflow-visible border-b px-3 py-2.5"
	>
		<div class="min-w-0 flex-1">
			<h2 class="text-base-content text-base leading-tight font-bold">{title}</h2>
			{#if description}
				<p class="text-ink-muted mt-0.5 text-xs">{description}</p>
			{/if}
		</div>
		{#if headerActions}
			<div class="flex shrink-0 flex-wrap items-center justify-end gap-0.5 overflow-visible">
				{@render headerActions()}
			</div>
		{/if}
	</div>

	<div class="menzies-table-scroll min-h-0 flex-1 overflow-auto" bind:this={bodyEl}>
		{@render children()}
	</div>

	<div
		class="border-base-300 bg-base-100 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
	>
		<div class="min-w-0 justify-self-start">
			{#if footerStart}
				{@render footerStart()}
			{/if}
		</div>
		{#if footerSummary != null}
			<p class="text-ink-muted hidden justify-self-center text-center font-mono text-xs sm:block">
				{footerSummary}
			</p>
		{/if}
		<div class="col-start-2 flex min-w-0 flex-wrap items-center justify-end gap-2 justify-self-end sm:col-start-3">
			{#if paginator}
				{@render paginator()}
			{/if}
		</div>
	</div>

	{#if legends.length}
		<div
			class="border-base-300 bg-base-100 flex shrink-0 flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t px-3 pt-3 pb-2"
		>
			{#each legends as item (item.label)}
				<span class="text-ink-muted inline-flex items-center gap-1.5 text-xs">
					<span class="size-2.5 shrink-0 rounded-sm {item.swatch}" aria-hidden="true"></span>
					{item.label}
				</span>
			{/each}
		</div>
	{/if}
</div>
