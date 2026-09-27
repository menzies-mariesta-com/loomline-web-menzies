import type { Config } from '@netlify/functions';

/**
 * Scheduled drain of notification outbox.
 * Calls the app cron endpoint with CRON_SECRET.
 */
export default async () => {
	const origin = process.env.URL || process.env.ORIGIN || 'http://localhost:4001';
	const secret = process.env.CRON_SECRET;
	if (!secret) {
		return new Response('CRON_SECRET missing', { status: 500 });
	}
	const res = await fetch(`${origin}/api/cron/outbox`, {
		method: 'POST',
		headers: { 'x-cron-secret': secret }
	});
	const body = await res.text();
	return new Response(body, { status: res.status });
};

export const config: Config = {
	schedule: '* * * * *'
};
