<script lang="ts">
	import type { DocNavItem } from '#lib/tool/docs/types';
	import { ArrowLeft, ArrowRight } from '@lucide/svelte';

	let {
		prev,
		next
	}: {
		prev: DocNavItem | null;
		next: DocNavItem | null;
	} = $props();
</script>

{#if prev || next}
	<nav
		class="mt-12 flex flex-col gap-3 border-t border-ink-border/80 pt-6 sm:flex-row sm:justify-between"
		aria-label="Adjacent pages"
	>
		{#if prev}
			<a
				href={prev.href}
				class="group flex cursor-pointer flex-col gap-1 rounded-box border border-ink-border/80 bg-base-100/60 px-4 py-3 transition-colors hover:bg-primary/20 sm:max-w-[48%]"
			>
				<span class="flex items-center gap-1 text-xs text-ink-muted">
					<ArrowLeft class="size-3.5" aria-hidden="true" />
					Previous
				</span>
				<span class="font-medium group-hover:text-primary">{prev.title}</span>
			</a>
		{:else}
			<span class="hidden sm:block sm:max-w-[48%]"></span>
		{/if}
		{#if next}
			<a
				href={next.href}
				class="group flex cursor-pointer flex-col gap-1 rounded-box border border-ink-border/80 bg-base-100/60 px-4 py-3 text-end transition-colors hover:bg-primary/20 sm:ms-auto sm:max-w-[48%]"
			>
				<span class="flex items-center justify-end gap-1 text-xs text-ink-muted">
					Next
					<ArrowRight class="size-3.5" aria-hidden="true" />
				</span>
				<span class="font-medium group-hover:text-primary">{next.title}</span>
			</a>
		{/if}
	</nav>
{/if}
