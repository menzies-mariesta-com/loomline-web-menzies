import type { ShortcutDef } from '#lib/keyboard/types';

const shortcuts = new Map<string, ShortcutDef>();
const listeners = new Set<() => void>();

function notify() {
	for (const fn of listeners) fn();
}

export function subscribeShortcuts(fn: () => void): () => void {
	listeners.add(fn);
	return () => listeners.delete(fn);
}

export function getShortcutsSnapshot(): ShortcutDef[] {
	return [...shortcuts.values()].sort((a, b) => {
		const scopeOrder = { global: 0, page: 1, table: 2 };
		const d = scopeOrder[a.scope] - scopeOrder[b.scope];
		if (d !== 0) return d;
		return a.label.localeCompare(b.label);
	});
}

export function registerShortcut(def: ShortcutDef): () => void {
	shortcuts.set(def.id, def);
	notify();
	return () => {
		shortcuts.delete(def.id);
		notify();
	};
}

export function unregisterShortcut(id: string): void {
	if (shortcuts.delete(id)) notify();
}

export function clearShortcuts(): void {
	shortcuts.clear();
	notify();
}

/** Match a simple single-key shortcut (one letter/digit). */
export function findSingleKeyShortcut(key: string, helpActive: boolean): ShortcutDef | null {
	if (!helpActive) return null;
	const k = key.length === 1 ? key.toLowerCase() : '';
	if (!k) return null;
	for (const def of shortcuts.values()) {
		if (def.keys.length === 1 && def.keys[0]!.toLowerCase() === k) return def;
	}
	return null;
}

export function resetShortcutsForTests(): void {
	shortcuts.clear();
	listeners.clear();
}
