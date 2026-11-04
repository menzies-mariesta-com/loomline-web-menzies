import { describe, expect, it, beforeEach } from 'vitest';
import {
	bumpBusinessRbacVersion,
	buildRbacPathsCacheKey,
	cacheAside,
	claimCronRun,
	forceMemoryCacheForTests,
	getBusinessRbacVersion,
	incrementRateLimitCounter,
	resetCacheForTests
} from '#lib/server/cache/redis';

beforeEach(() => {
	forceMemoryCacheForTests();
});

describe('cacheAside', () => {
	it('dedupes concurrent fetches for the same key', async () => {
		let calls = 0;
		const fetchFn = async () => {
			calls += 1;
			await new Promise((r) => setTimeout(r, 10));
			return { n: 1 };
		};
		const [a, b] = await Promise.all([
			cacheAside('test:dedupe', 60, fetchFn),
			cacheAside('test:dedupe', 60, fetchFn)
		]);
		expect(a).toEqual({ n: 1 });
		expect(b).toEqual({ n: 1 });
		expect(calls).toBe(1);
	});

	it('returns cached value on second read', async () => {
		let calls = 0;
		const value = await cacheAside('test:hit', 60, async () => {
			calls += 1;
			return ['a'];
		});
		expect(value).toEqual(['a']);
		expect(calls).toBe(1);
		const again = await cacheAside('test:hit', 60, async () => {
			calls += 1;
			return ['b'];
		});
		expect(again).toEqual(['a']);
		expect(calls).toBe(1);
	});
});

describe('rbac version keys', () => {
	it('bumps version in degraded mode', async () => {
		expect(await getBusinessRbacVersion('biz-1')).toBe(0);
		expect(await bumpBusinessRbacVersion('biz-1')).toBe(1);
		expect(await getBusinessRbacVersion('biz-1')).toBe(1);
		const key = buildRbacPathsCacheKey({
			businessId: 'biz-1',
			userId: 'u1',
			membershipRole: 'business_admin',
			membershipId: 'm1',
			version: 1
		});
		expect(key).toContain('biz-1');
		expect(key).toContain('v1');
	});
});

describe('claimCronRun', () => {
	it('allows first claim and rejects duplicate bucket', async () => {
		expect(await claimCronRun('job', '2026-01-01T12:00')).toBe(true);
		expect(await claimCronRun('job', '2026-01-01T12:00')).toBe(false);
	});
});

describe('incrementRateLimitCounter', () => {
	it('increments within the same window bucket', async () => {
		const cfg = { scope: 'test', id: '1.2.3.4', windowSeconds: 60 };
		expect(await incrementRateLimitCounter(cfg.scope, cfg.id, cfg.windowSeconds)).toBe(1);
		expect(await incrementRateLimitCounter(cfg.scope, cfg.id, cfg.windowSeconds)).toBe(2);
	});
});
