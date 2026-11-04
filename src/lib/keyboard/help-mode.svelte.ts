import { getContext, setContext } from 'svelte';

const HELP_MODE_KEY = Symbol('keyboard-help-mode');

export type HelpModeStore = {
	readonly helpModeActive: boolean;
	toggleHelpMode: () => void;
	setHelpMode: (active: boolean) => void;
};

export function createHelpModeStore(): HelpModeStore & { subscribe: (fn: (v: boolean) => void) => () => void } {
	let helpModeActive = $state(false);
	const subs = new Set<(v: boolean) => void>();

	function emit() {
		for (const fn of subs) fn(helpModeActive);
	}

	return {
		get helpModeActive() {
			return helpModeActive;
		},
		toggleHelpMode() {
			helpModeActive = !helpModeActive;
			emit();
		},
		setHelpMode(active: boolean) {
			if (helpModeActive === active) return;
			helpModeActive = active;
			emit();
		},
		subscribe(fn: (v: boolean) => void) {
			subs.add(fn);
			fn(helpModeActive);
			return () => subs.delete(fn);
		}
	};
}

export type HelpModeContext = ReturnType<typeof createHelpModeStore>;

export function setHelpModeContext(store: HelpModeContext): HelpModeContext {
	setContext(HELP_MODE_KEY, store);
	return store;
}

export function getHelpModeContext(): HelpModeContext {
	return getContext<HelpModeContext>(HELP_MODE_KEY);
}
