import { onMount } from 'svelte';
import type { ShortcutDef } from '#lib/keyboard/types';
import { registerShortcut } from '#lib/keyboard/shortcut-registry';

export function registerPageShortcuts(defs: ShortcutDef[]): () => void {
	const unsubs = defs.map((d) => registerShortcut(d));
	return () => {
		for (const u of unsubs) u();
	};
}

export function usePageShortcuts(defs: () => ShortcutDef[]): void {
	onMount(() => {
		const unsubs = defs().map((d) => registerShortcut(d));
		return () => {
			for (const u of unsubs) u();
		};
	});
}
