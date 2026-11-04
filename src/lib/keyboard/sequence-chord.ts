export const SEQUENCE_TIMEOUT_MS = 1200;

export type RowActionChordState = {
	pendingRowIndex: number | null;
	lastAt: number;
};

export function createRowActionChordState(): RowActionChordState {
	return { pendingRowIndex: null, lastAt: 0 };
}

export function clearRowActionChord(state: RowActionChordState): void {
	state.pendingRowIndex = null;
	state.lastAt = 0;
}

/** Map key to visible row index 0-based, or null if not a row digit. */
export function rowIndexFromDigitKey(key: string, rowCount: number): number | null {
	if (rowCount <= 0) return null;
	const k = key.length === 1 ? key : '';
	if (k >= '1' && k <= '9') {
		const idx = Number(k) - 1;
		return idx < rowCount ? idx : null;
	}
	if (k === '0' && rowCount >= 10) return 9;
	return null;
}

export function isExpired(state: RowActionChordState, now = Date.now()): boolean {
	if (state.pendingRowIndex == null) return false;
	return now - state.lastAt > SEQUENCE_TIMEOUT_MS;
}

/**
 * Handle one key when help mode is active for a table.
 * Returns true if the event was consumed.
 */
export function handleTableChordKey(opts: {
	key: string;
	rowCount: number;
	state: RowActionChordState;
	actionKeys: Set<string>;
	onAction: (rowIndex: number, actionKey: string) => void;
	now?: number;
}): boolean {
	const now = opts.now ?? Date.now();
	if (isExpired(opts.state, now)) clearRowActionChord(opts.state);

	const rowIdx = rowIndexFromDigitKey(opts.key, opts.rowCount);
	if (rowIdx != null) {
		opts.state.pendingRowIndex = rowIdx;
		opts.state.lastAt = now;
		return true;
	}

	if (opts.state.pendingRowIndex == null) return false;

	const actionKey = opts.key.length === 1 ? opts.key.toLowerCase() : '';
	if (!actionKey || !opts.actionKeys.has(actionKey)) return false;

	const idx = opts.state.pendingRowIndex;
	clearRowActionChord(opts.state);
	opts.onAction(idx, actionKey);
	return true;
}
