import { describe, expect, it } from 'vitest';
import {
	isBusinessOverviewPath,
	pathnameAllowedForConsole,
	universalBusinessPaths
} from '#lib/server/qms/page-access';
import { buildRbacPathsCacheKey } from '#lib/server/cache/redis';

describe('pathnameAllowedForConsole', () => {
	const businessId = '11111111-1111-4111-8111-111111111111';
	const base = `/b/${businessId}`;

	it('always allows overview and account', () => {
		const allowed = new Set<string>();
		expect(pathnameAllowedForConsole(base, businessId, allowed)).toBe(true);
		expect(pathnameAllowedForConsole(`${base}/account`, businessId, allowed)).toBe(true);
	});

	it('allows prefixed console paths when listed', () => {
		const allowed = new Set([`${base}/sites`, `${base}/administration/staff/list`]);
		expect(pathnameAllowedForConsole(`${base}/sites`, businessId, allowed)).toBe(true);
		expect(pathnameAllowedForConsole(`${base}/administration/staff/list`, businessId, allowed)).toBe(
			true
		);
		expect(pathnameAllowedForConsole(`${base}/config`, businessId, allowed)).toBe(false);
	});

	it('universal paths include account only', () => {
		const paths = universalBusinessPaths(businessId);
		expect(paths).toContain(`${base}/account`);
		expect(isBusinessOverviewPath(base, businessId)).toBe(true);
	});

	it('prefers the longest matching allowed prefix', () => {
		const allowed = new Set([`${base}/administration`, `${base}/administration/staff/list`]);
		expect(pathnameAllowedForConsole(`${base}/administration/staff/list`, businessId, allowed)).toBe(
			true
		);
		expect(pathnameAllowedForConsole(`${base}/administration/other`, businessId, allowed)).toBe(true);
		expect(pathnameAllowedForConsole(`${base}/administration-staff`, businessId, allowed)).toBe(
			false
		);
	});
});

describe('buildRbacPathsCacheKey', () => {
	it('includes business, user, role, membership, and version', () => {
		const key = buildRbacPathsCacheKey({
			businessId: 'b1',
			userId: 'u1',
			membershipRole: 'counter_agent',
			membershipId: null,
			version: 3
		});
		expect(key).toBe('rbac:paths:b1:u1:counter_agent:none:v3');
	});
});
