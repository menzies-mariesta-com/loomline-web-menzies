<script lang="ts">
	import { getHelpModeContext } from '#lib/keyboard/help-mode.svelte';

	type Props = {
		/** Single key or chord tokens, e.g. ['E'] or ['3', '·', 'E'] */
		keys: string[];
		class?: string;
		/** Word-style centered on control vs corner chip (default corner). */
		placement?: 'corner' | 'center';
	};

	let { keys, class: className = '', placement = 'corner' }: Props = $props();

	const help = getHelpModeContext();
</script>

{#if help.helpModeActive && keys.length}
	<span
		class="menzies-kbd-help menzies-kbd-help--{placement} {className}"
		aria-hidden="true"
	>
		{#each keys as token, i (i)}
			{#if token === '·'}
				<span class="menzies-kbd-help__sep">·</span>
			{:else}
				<kbd class="menzies-kbd-help__cap">{token}</kbd>
			{/if}
		{/each}
	</span>
{/if}
