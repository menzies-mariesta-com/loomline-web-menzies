import { m } from '#lib/paraglide/messages';
import type { ShortcutDef } from '#lib/keyboard/types';
import { registerPageShortcuts } from '#lib/keyboard/registerPageShortcuts';

export type DataTableHeaderShortcutOpts = {
	onRefresh?: () => void | Promise<void>;
	refreshDisabled?: () => boolean;
	/** Create / add / issue — bound to N in help mode. */
	onNew?: () => void;
	newLabel?: string;
};

/** Page-level R/N shortcuts for DataTableShell header actions (help mode only). */
export function registerDataTableHeaderShortcuts(
	pageId: string,
	opts: DataTableHeaderShortcutOpts
): () => void {
	const defs: ShortcutDef[] = [];
	if (opts.onRefresh) {
		defs.push({
			id: `${pageId}.refresh`,
			scope: 'page',
			keys: ['R'],
			label: m.keyboard_action_refresh(),
			run: () => {
				if (opts.refreshDisabled?.()) return;
				void opts.onRefresh!();
			}
		});
	}
	if (opts.onNew) {
		defs.push({
			id: `${pageId}.new`,
			scope: 'page',
			keys: ['N'],
			label: opts.newLabel ?? m.keyboard_action_new(),
			run: () => opts.onNew!()
		});
	}
	return registerPageShortcuts(defs);
}
