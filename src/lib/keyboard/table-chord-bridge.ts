import {
	clearRowActionChord,
	createRowActionChordState,
	handleTableChordKey,
	type RowActionChordState
} from '#lib/keyboard/sequence-chord';

/** Shared row-then-action buffer for the active table. */
export const tableChordState: RowActionChordState = createRowActionChordState();

export function resetTableChordState(): void {
	clearRowActionChord(tableChordState);
}

/** Top-most mounted DataTableKeyboard receives chord keys in help mode. */
let activeHandler: ((e: KeyboardEvent) => boolean) | null = null;

export function setActiveTableChordHandler(
	handler: ((e: KeyboardEvent) => boolean) | null
): void {
	activeHandler = handler;
}

export function dispatchTableChordKey(e: KeyboardEvent): boolean {
	return activeHandler?.(e) ?? false;
}

export { handleTableChordKey, clearRowActionChord };
