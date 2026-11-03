<script lang="ts">
	type Props = {
		label: string;
		value: string | number;
		hint?: string;
		href?: string;
		class?: string;
	};

	let { label, value, hint, href, class: className = '' }: Props = $props();

	const shell = $derived(
		`stat rounded-box border border-base-300 bg-base-100 shadow-sm ${className}`
	);
</script>

{#if href}
	<a {href} class="{shell} block cursor-pointer transition-colors hover:bg-primary/5">
		<div class="stat-title text-ink-muted text-xs tracking-wide uppercase">{label}</div>
		<div class="stat-value text-2xl font-semibold">{value}</div>
		{#if hint}
			<div class="stat-desc">{hint}</div>
		{/if}
	</a>
{:else}
	<div class={shell}>
		<div class="stat-title text-ink-muted text-xs tracking-wide uppercase">{label}</div>
		<div class="stat-value text-2xl font-semibold">{value}</div>
		{#if hint}
			<div class="stat-desc">{hint}</div>
		{/if}
	</div>
{/if}
