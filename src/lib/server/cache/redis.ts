import { Redis } from '@upstash/redis';
import {
	CACHE_DEBUG,
	UPSTASH_REDIS_REST_TOKEN,
	UPSTASH_REDIS_REST_URL
} from '$app/env/private';

const PREFIX = 'nextup:';

type MemoryEntry = { value: string; expiresAt: number };

const memoryStore = new Map<string, MemoryEntry>();
const memoryCounters = new Map<string, number>();
const inflight = new Map<string, Promise<unknown>>();

let memoryOnlyOverride = false;

function logCache(event: string, key: string) {
	if (CACHE_DEBUG !== '1' && CACHE_DEBUG !== 'true') return;
	console.info(`[cache] ${event} ${key}`);
}

function redisEnabled(): boolean {
	if (memoryOnlyOverride) return false;
	return Boolean(UPSTASH_REDIS_REST_URL?.trim() && UPSTASH_REDIS_REST_TOKEN?.trim());
}

let client: Redis | null = null;
function getRedis(): Redis | null {
	if (!redisEnabled()) return null;
	if (!client) {
		client = new Redis({
			url: UPSTASH_REDIS_REST_URL!.trim(),
			token: UPSTASH_REDIS_REST_TOKEN!.trim()
		});
	}
	return client;
}

function memoryGet(key: string): string | null {
	const row = memoryStore.get(key);
	if (!row) return null;
	if (row.expiresAt > 0 && row.expiresAt < Date.now()) {
		memoryStore.delete(key);
		return null;
	}
	return row.value;
}

function memorySet(key: string, value: string, ttlSeconds: number) {
	const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
	memoryStore.set(key, { value, expiresAt });
}

async function getRaw(key: string): Promise<string | null> {
	const redis = getRedis();
	if (redis) {
		const v = await redis.get<unknown>(key);
		if (v == null) return null;
		return typeof v === 'string' ? v : JSON.stringify(v);
	}
	return memoryGet(key);
}

async function setRaw(key: string, value: string, ttlSeconds: number): Promise<void> {
	const redis = getRedis();
	if (redis) {
		if (ttlSeconds > 0) await redis.set(key, value, { ex: ttlSeconds });
		else await redis.set(key, value);
		return;
	}
	memorySet(key, value, ttlSeconds);
}

async function acquireStampedeLock(lockKey: string): Promise<boolean> {
	const redis = getRedis();
	if (!redis) return true;
	const ok = await redis.set(lockKey, '1', { nx: true, ex: 5 });
	return ok === 'OK';
}

async function releaseStampedeLock(lockKey: string): Promise<void> {
	const redis = getRedis();
	if (!redis) return;
	await redis.del(lockKey);
}

/** Cache-aside with in-process single-flight and optional Redis stampede lock. */
export async function cacheAside<T>(
	key: string,
	ttlSeconds: number,
	fetchFn: () => Promise<T>
): Promise<T> {
	const fullKey = `${PREFIX}${key}`;
	const existing = inflight.get(fullKey);
	if (existing) return existing as Promise<T>;

	const run = (async () => {
		const cached = await getRaw(fullKey);
		if (cached != null) {
			logCache('hit', fullKey);
			return JSON.parse(cached) as T;
		}

		const lockKey = `${fullKey}:lock`;
		const gotLock = await acquireStampedeLock(lockKey);
		if (!gotLock) {
			await new Promise((r) => setTimeout(r, 25));
			const retry = await getRaw(fullKey);
			if (retry != null) return JSON.parse(retry) as T;
		}

		try {
			logCache('miss', fullKey);
			const value = await fetchFn();
			await setRaw(fullKey, JSON.stringify(value), ttlSeconds);
			return value;
		} finally {
			if (gotLock) await releaseStampedeLock(lockKey);
		}
	})();

	inflight.set(fullKey, run);
	try {
		return await run;
	} finally {
		inflight.delete(fullKey);
	}
}

export function rbacVersionKey(businessId: string): string {
	return `${PREFIX}rbac:ver:${businessId}`;
}

export async function getBusinessRbacVersion(businessId: string): Promise<number> {
	const key = rbacVersionKey(businessId);
	const redis = getRedis();
	if (redis) {
		const v = await redis.get<number>(key);
		return typeof v === 'number' ? v : 0;
	}
	return memoryCounters.get(key) ?? 0;
}

export async function bumpBusinessRbacVersion(businessId: string): Promise<number> {
	const key = rbacVersionKey(businessId);
	const redis = getRedis();
	if (redis) {
		return redis.incr(key);
	}
	const next = (memoryCounters.get(key) ?? 0) + 1;
	memoryCounters.set(key, next);
	return next;
}

export function buildRbacPathsCacheKey(opts: {
	businessId: string;
	userId: string;
	membershipRole: string;
	membershipId: string | null;
	version: number;
}): string {
	return `rbac:paths:${opts.businessId}:${opts.userId}:${opts.membershipRole}:${opts.membershipId ?? 'none'}:v${opts.version}`;
}

const QUEUE_ISSUE_LOCK_TTL_SEC = 3;

/** Serialize ticket issue / transfer sequence per queue (cross-instance when Redis is up). */
export async function withQueueIssueLock<T>(queueId: string, fn: () => Promise<T>): Promise<T> {
	const redis = getRedis();
	const lockKey = `${PREFIX}queue:issue:${queueId}`;
	if (!redis) return fn();

	const deadline = Date.now() + 2500;
	while (Date.now() < deadline) {
		const ok = await redis.set(lockKey, '1', { nx: true, ex: QUEUE_ISSUE_LOCK_TTL_SEC });
		if (ok === 'OK') {
			try {
				return await fn();
			} finally {
				await redis.del(lockKey);
			}
		}
		await new Promise((r) => setTimeout(r, 20));
	}
	return fn();
}

/** Idempotent cron run per minute bucket. Returns false if already ran. */
export async function claimCronRun(job: string, bucket: string): Promise<boolean> {
	const key = `${PREFIX}cron:${job}:${bucket}`;
	const redis = getRedis();
	if (redis) {
		const ok = await redis.set(key, '1', { nx: true, ex: 120 });
		return ok === 'OK';
	}
	if (memoryGet(key)) return false;
	memorySet(key, '1', 120);
	return true;
}

export async function incrementRateLimitCounter(
	scope: string,
	id: string,
	windowSeconds: number
): Promise<number> {
	const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
	const key = `${PREFIX}ratelimit:${scope}:${id}:${bucket}`;
	const redis = getRedis();
	if (redis) {
		const count = await redis.incr(key);
		if (count === 1) await redis.expire(key, windowSeconds + 1);
		return count;
	}
	const memKey = key;
	const next = (memoryCounters.get(memKey) ?? 0) + 1;
	memoryCounters.set(memKey, next);
	return next;
}

/** Test-only: force in-process cache (ignore Upstash env). */
export function forceMemoryCacheForTests() {
	memoryOnlyOverride = true;
	resetCacheForTests();
}

/** Test-only reset. */
export function resetCacheForTests() {
	memoryStore.clear();
	memoryCounters.clear();
	inflight.clear();
	client = null;
}
