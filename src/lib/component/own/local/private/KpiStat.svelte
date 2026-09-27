<script lang="ts">
	type Props = {
		label: string;
		value: string | number;
		hint?: string;
		class?: string;
	};

	let { label, value, hint, class: className = '' }: Props = $props();
</script>

<div class="stat rounded-box border border-base-300 bg-base-100 shadow-sm {className}">
	<div class="stat-title text-xs uppercase tracking-wide opacity-70">{label}</div>
	<div class="stat-value text-2xl font-semibold">{value}</div>
	{#if hint}
		<div class="stat-desc">{hint}</div>
	{/if}
</div>
