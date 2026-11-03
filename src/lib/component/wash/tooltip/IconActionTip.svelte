<script lang="ts">
	import type { Snippet } from 'svelte';

	type Tone =
		| 'primary'
		| 'secondary'
		| 'accent'
		| 'info'
		| 'success'
		| 'warning'
		| 'error';

	type Props = {
		tip: string;
		tone?: Tone;
		children: Snippet;
	};

	let { tip, tone = 'secondary', children }: Props = $props();
</script>

<span class="menzies-table-icon-action-tip" data-tone={tone}>
	{@render children()}
	<span class="menzies-table-icon-action-tip__label" role="tooltip">{tip}</span>
</span>
