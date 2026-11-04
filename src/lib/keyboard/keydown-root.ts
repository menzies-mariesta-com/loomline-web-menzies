import { clearRowActionChord, dispatchTableChordKey, tableChordState } from '#lib/keyboard/table-chord-bridge';
import { findSingleKeyShortcut } from '#lib/keyboard/shortcut-registry';

const EXCLUDED_PREFIXES = ['/kiosk/', '/display/', '/t/'];

export function isTextInputTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const tag = target.tagName;
	if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
	if (target.isContentEditable) return true;
	return Boolean(target.closest('[contenteditable="true"]'));
}

export function isHelpLayerExcludedPath(pathname: string): boolean {
	return EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p));
}

export function shouldToggleHelpOnAltKeyup(e: KeyboardEvent, pathname: string): boolean {
	if (e.key !== 'Alt' || e.repeat) return false;
	if (e.ctrlKey || e.metaKey || e.shiftKey) return false;
	if (isTextInputTarget(e.target)) return false;
	if (isHelpLayerExcludedPath(pathname)) return false;
	return true;
}

export function handleHelpModeKeydown(opts: {
	e: KeyboardEvent;
	helpActive: boolean;
	pathname: string;
}): boolean {
	if (isTextInputTarget(opts.e.target)) return false;
	if (isHelpLayerExcludedPath(opts.pathname)) return false;

	if (opts.e.key === 'Escape' && opts.helpActive) {
		clearRowActionChord(tableChordState);
		return false;
	}

	if (!opts.helpActive) return false;

	if (dispatchTableChordKey(opts.e)) {
		opts.e.preventDefault();
		return true;
	}

	const def = findSingleKeyShortcut(opts.e.key, true);
	if (def) {
		opts.e.preventDefault();
		def.run();
		return true;
	}

	return false;
}
