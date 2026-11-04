export type ShortcutScope = 'global' | 'page' | 'table';

export type ShortcutDisplayKeys = string[];

export type ShortcutDef = {
	id: string;
	scope: ShortcutScope;
	/** Display tokens, e.g. ['Ctrl', 'K'] or ['3', '·', 'E'] */
	keys: ShortcutDisplayKeys;
	label: string;
	/** When false, hidden from panel (still callable if registered). */
	showInPanel?: boolean;
	run: () => void | boolean;
};

export type TableRowAction<T extends { id: string }> = {
	key: string;
	label: string;
	run: (row: T, index: number) => void;
};

export type TableRowActionsMap<T extends { id: string }> = Record<string, TableRowAction<T>>;
