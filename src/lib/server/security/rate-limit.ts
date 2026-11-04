import { error } from '@sveltejs/kit';
import { incrementRateLimitCounter } from '#lib/server/cache/redis';

export type RateLimitConfig = {
	scope: string;
	id: string;
	limit: number;
	windowSeconds: number;
};

export async function checkRateLimit(config: RateLimitConfig): Promise<boolean> {
	const id = config.id.trim().toLowerCase();
	if (!id) return true;
	const count = await incrementRateLimitCounter(config.scope, id, config.windowSeconds);
	return count <= config.limit;
}

export async function enforceRateLimit(config: RateLimitConfig): Promise<void> {
	const ok = await checkRateLimit(config);
	if (!ok) {
		throw error(429, 'Too many requests. Try again later.');
	}
}

export function clientIpFromRequest(request: Request, getClientAddress: () => string): string {
	try {
		return getClientAddress() || 'unknown';
	} catch {
		const forwarded = request.headers.get('x-forwarded-for');
		if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
		return 'unknown';
	}
}
