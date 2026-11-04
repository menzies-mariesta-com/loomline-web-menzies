import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
	clearRowActionChord,
	createRowActionChordState,
	handleTableChordKey,
	rowIndexFromDigitKey,
	SEQUENCE_TIMEOUT_MS
} from '#lib/keyboard/sequence-chord';

describe('rowIndexFromDigitKey', () => {
	it('maps 1-9 to zero-based indices within row count', () => {
		expect(rowIndexFromDigitKey('1', 5)).toBe(0);
		expect(rowIndexFromDigitKey('5', 5)).toBe(4);
		expect(rowIndexFromDigitKey('6', 5)).toBe(null);
	});

	it('maps 0 to row 10 when at least 10 rows', () => {
		expect(rowIndexFromDigitKey('0', 10)).toBe(9);
		expect(rowIndexFromDigitKey('0', 9)).toBe(null);
	});
});

describe('handleTableChordKey', () => {
	it('runs action after row digit within sequence', () => {
		const state = createRowActionChordState();
		const onAction = vi.fn();
		const keys = new Set(['e']);

		expect(handleTableChordKey({ key: '3', rowCount: 5, state, actionKeys: keys, onAction })).toBe(
			true
		);
		expect(handleTableChordKey({ key: 'e', rowCount: 5, state, actionKeys: keys, onAction })).toBe(
			true
		);
		expect(onAction).toHaveBeenCalledWith(2, 'e');
	});

	it('clears pending row after timeout', () => {
		const state = createRowActionChordState();
		const onAction = vi.fn();
		const keys = new Set(['e']);
		const t0 = 1_000_000;

		handleTableChordKey({
			key: '2',
			rowCount: 5,
			state,
			actionKeys: keys,
			onAction,
			now: t0
		});

		const consumed = handleTableChordKey({
			key: 'e',
			rowCount: 5,
			state,
			actionKeys: keys,
			onAction,
			now: t0 + SEQUENCE_TIMEOUT_MS + 1
		});
		expect(consumed).toBe(false);
		expect(onAction).not.toHaveBeenCalled();
	});

	it('clearRowActionChord resets state', () => {
		const state = createRowActionChordState();
		state.pendingRowIndex = 2;
		clearRowActionChord(state);
		expect(state.pendingRowIndex).toBe(null);
	});
});
