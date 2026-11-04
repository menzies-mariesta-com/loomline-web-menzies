<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ShortcutDisplayKeys } from '#lib/keyboard/types';
	import { getHelpModeContext } from '#lib/keyboard/help-mode.svelte';
	import WashShortcutBadge from './WashShortcutBadge.svelte';

	type Props = {
		keys: ShortcutDisplayKeys;
		label: string;
		children: Snippet;
		class?: string;
	};

	let { keys, label, children, class: className = 'relative inline-flex' }: Props = $props();

	const help = getHelpModeContext();
</script>

<span class={className}>
	{@render children()}
	<WashShortcutBadge {keys} />
	{#if help.helpModeActive}
		<span class="sr-only">{label}</span>
	{/if}
</span>
