import { describe, expect, it } from 'vitest';
import { isHelpLayerExcludedPath } from '#lib/keyboard/keydown-root';

describe('isHelpLayerExcludedPath', () => {
	it('excludes public floor routes', () => {
		expect(isHelpLayerExcludedPath('/t/token')).toBe(true);
		expect(isHelpLayerExcludedPath('/kiosk/x')).toBe(true);
		expect(isHelpLayerExcludedPath('/display/x')).toBe(true);
		expect(isHelpLayerExcludedPath('/b/1/agent')).toBe(false);
	});
});
