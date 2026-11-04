import { m } from '#lib/paraglide/messages';
import type { TableRowActionsMap } from '#lib/keyboard/types';

/** Standard CRUD row chords for DataTableKeyboard (help mode only). */
export function buildCrudRowActions<T extends { id: string }>(opts: {
	onEdit?: (row: T) => void;
	onView?: (row: T) => void;
	onDelete?: (row: T) => void;
	onCancel?: (row: T) => void;
}): TableRowActionsMap<T> {
	const map: TableRowActionsMap<T> = {};
	if (opts.onEdit) {
		map.e = { key: 'e', label: m.keyboard_action_edit(), run: (row) => opts.onEdit!(row) };
	}
	if (opts.onView) {
		map.v = { key: 'v', label: m.keyboard_action_view(), run: (row) => opts.onView!(row) };
	}
	if (opts.onDelete) {
		map.d = { key: 'd', label: m.keyboard_action_delete(), run: (row) => opts.onDelete!(row) };
	}
	if (opts.onCancel) {
		map.x = { key: 'x', label: m.keyboard_action_cancel(), run: (row) => opts.onCancel!(row) };
	}
	return map;
}
