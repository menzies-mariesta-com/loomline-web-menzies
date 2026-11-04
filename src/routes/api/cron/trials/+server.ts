import type { RequestHandler } from './$types';
import { expireEndedTrials } from '#lib/server/qms/trial-expiry';
import { purgeExpiredTrialOtps } from '#lib/server/qms/trial-otp';
import { claimCronRun } from '#lib/server/cache/redis';
import { CRON_SECRET } from '$app/env/private';

function authorized(request: Request): boolean {
	const secret = request.headers.get('x-cron-secret') ?? '';
	const expected = (CRON_SECRET ?? process.env.CRON_SECRET ?? '').trim();
	return Boolean(expected) && secret === expected;
}

async function run() {
	const expired = await expireEndedTrials();
	const otpsPurged = await purgeExpiredTrialOtps();
	return { ...expired, otpsPurged };
}

function minuteBucket(): string {
	return new Date().toISOString().slice(0, 16);
}

export const POST: RequestHandler = async ({ request }) => {
	if (!authorized(request)) return new Response('Unauthorized', { status: 401 });
	if (!(await claimCronRun('trials', minuteBucket()))) {
		return Response.json({ skipped: true, reason: 'already_ran_this_minute' });
	}
	return Response.json(await run());
};

export const GET: RequestHandler = async ({ request }) => {
	if (!authorized(request)) return new Response('Unauthorized', { status: 401 });
	if (!(await claimCronRun('trials', minuteBucket()))) {
		return Response.json({ skipped: true, reason: 'already_ran_this_minute' });
	}
	return Response.json(await run());
};
