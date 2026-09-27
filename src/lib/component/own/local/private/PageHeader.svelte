<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		subtitle?: string;
		actions?: Snippet;
	};

	let { title, subtitle, actions }: Props = $props();
</script>

<div class="mb-6 flex flex-wrap items-start justify-between gap-3">
	<div class="min-w-0">
		<h1 class="card-title text-primary text-2xl font-bold">{title}</h1>
		{#if subtitle}
			<p class="mt-1 text-sm text-base-content/65">{subtitle}</p>
		{/if}
	</div>
	{#if actions}
		<div class="flex flex-wrap items-center gap-2">
			{@render actions()}
		</div>
	{/if}
</div>
