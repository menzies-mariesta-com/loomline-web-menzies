import { describe, expect, it, beforeEach } from 'vitest';
import { checkRateLimit, enforceRateLimit } from '#lib/server/security/rate-limit';
import { forceMemoryCacheForTests } from '#lib/server/cache/redis';

beforeEach(() => {
	forceMemoryCacheForTests();
});

describe('checkRateLimit', () => {
	it('allows up to the configured limit', async () => {
		const cfg = { scope: 'unit', id: 'user@test.com', limit: 2, windowSeconds: 60 };
		expect(await checkRateLimit(cfg)).toBe(true);
		expect(await checkRateLimit(cfg)).toBe(true);
		expect(await checkRateLimit(cfg)).toBe(false);
	});

	it('enforceRateLimit throws when over limit', async () => {
		const cfg = { scope: 'enforce', id: 'x', limit: 1, windowSeconds: 60 };
		await enforceRateLimit(cfg);
		await expect(enforceRateLimit(cfg)).rejects.toMatchObject({ status: 429 });
	});
});
