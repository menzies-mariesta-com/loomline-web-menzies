import { describe, expect, it } from 'vitest';
import {
	administrationPageTemplates,
	businessConsolePath,
	CONSOLE_PAGE_TEMPLATES,
	DEFAULT_USER_GROUP_NAMES
} from '#lib/tool/business-console-pages';

describe('business-console-pages', () => {
	const businessId = 'biz-1';

	it('builds console paths', () => {
		expect(businessConsolePath(businessId, '/sites')).toBe('/b/biz-1/sites');
	});

	it('lists administration templates including staff RBAC pages', () => {
		const suffixes = administrationPageTemplates().map((p) => p.pathSuffix);
		expect(suffixes).toContain('/administration/staff/registration');
		expect(suffixes).toContain('/administration/staff/list');
		expect(suffixes).toContain('/administration/user-group');
	});

	it('keeps unique path suffixes in catalog', () => {
		const suffixes = CONSOLE_PAGE_TEMPLATES.map((p) => p.pathSuffix);
		expect(new Set(suffixes).size).toBe(suffixes.length);
	});

	it('exposes default user group names', () => {
		expect(DEFAULT_USER_GROUP_NAMES.fullAdmin).toBeTruthy();
	});
});
