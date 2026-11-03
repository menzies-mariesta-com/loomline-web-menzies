<script lang="ts">
	import { X } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages';
	import WashTooltip from '#lib/component/wash/tooltip/WashTooltip.svelte';

	type Props = {
		onclick: () => void;
	};

	let { onclick }: Props = $props();

	const label = $derived(m.common_dismiss());
</script>

<WashTooltip tooltipText={label} className="tooltip-secondary">
	<button
		type="button"
		class="btn btn-ghost btn-square btn-sm btn-secondary cursor-pointer"
		aria-label={label}
		{onclick}
	>
		<X class="size-4" aria-hidden="true" />
	</button>
</WashTooltip>
