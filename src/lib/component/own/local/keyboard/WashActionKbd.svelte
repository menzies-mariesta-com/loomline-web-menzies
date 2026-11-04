<script lang="ts">
	import type { Snippet } from 'svelte';
	import WashShortcutBadge from './WashShortcutBadge.svelte';

	type Props = {
		/** Single action key shown when Alt help is on (display uppercase). */
		key: string;
		children: Snippet;
		class?: string;
	};

	let { key, children, class: className = 'relative inline-flex' }: Props = $props();

	const cap = $derived(key.length === 1 ? key.toUpperCase() : key);
</script>

<span class={className}>
	{@render children()}
	<WashShortcutBadge keys={[cap]} />
</span>
