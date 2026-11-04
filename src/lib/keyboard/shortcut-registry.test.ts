import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
	findSingleKeyShortcut,
	getShortcutsSnapshot,
	registerShortcut,
	resetShortcutsForTests,
	unregisterShortcut
} from '#lib/keyboard/shortcut-registry';

beforeEach(() => {
	resetShortcutsForTests();
});

describe('registerShortcut', () => {
	it('lists and unregisters shortcuts', () => {
		const run = vi.fn();
		const off = registerShortcut({
			id: 'test.a',
			scope: 'page',
			keys: ['A'],
			label: 'Action A',
			run
		});
		expect(getShortcutsSnapshot()).toHaveLength(1);
		off();
		expect(getShortcutsSnapshot()).toHaveLength(0);
	});

	it('findSingleKeyShortcut only when help active', () => {
		registerShortcut({
			id: 'test.s',
			scope: 'page',
			keys: ['S'],
			label: 'Search',
			run: () => {}
		});
		expect(findSingleKeyShortcut('s', false)).toBe(null);
		expect(findSingleKeyShortcut('s', true)?.id).toBe('test.s');
	});

	it('unregisterShortcut removes by id', () => {
		registerShortcut({
			id: 'x',
			scope: 'global',
			keys: ['G'],
			label: 'Go',
			run: () => {}
		});
		unregisterShortcut('x');
		expect(getShortcutsSnapshot()).toHaveLength(0);
	});
});
