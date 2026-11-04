<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { createHelpModeStore, setHelpModeContext } from '#lib/keyboard/help-mode.svelte';
	import { clearRowActionChord, tableChordState } from '#lib/keyboard/table-chord-bridge';
	import {
		handleHelpModeKeydown,
		shouldToggleHelpOnAltKeyup
	} from '#lib/keyboard/keydown-root';

	type Props = {
		children: Snippet;
	};

	let { children }: Props = $props();

	const helpStore = setHelpModeContext(createHelpModeStore());

	$effect(() => {
		document.body.classList.toggle('menzies-kbd-help-active', helpStore.helpModeActive);
		return () => document.body.classList.remove('menzies-kbd-help-active');
	});

	onMount(() => {
		function onKeyUp(e: KeyboardEvent) {
			if (!shouldToggleHelpOnAltKeyup(e, page.url.pathname)) return;
			helpStore.toggleHelpMode();
			if (!helpStore.helpModeActive) clearRowActionChord(tableChordState);
		}

		function onKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape' && helpStore.helpModeActive) {
				e.preventDefault();
				helpStore.setHelpMode(false);
				clearRowActionChord(tableChordState);
				return;
			}

			handleHelpModeKeydown({
				e,
				helpActive: helpStore.helpModeActive,
				pathname: page.url.pathname
			});
		}

		document.addEventListener('keyup', onKeyUp);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('keyup', onKeyUp);
			document.removeEventListener('keydown', onKeyDown);
		};
	});
</script>

{@render children()}
