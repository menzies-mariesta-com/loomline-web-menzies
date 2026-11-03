import type { RequestHandler } from './$types';
import { expireEndedTrials } from '#lib/server/qms/trial-expiry';
import { purgeExpiredTrialOtps } from '#lib/server/qms/trial-otp';
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

export const POST: RequestHandler = async ({ request }) => {
	if (!authorized(request)) return new Response('Unauthorized', { status: 401 });
	return Response.json(await run());
};

export const GET: RequestHandler = async ({ request }) => {
	if (!authorized(request)) return new Response('Unauthorized', { status: 401 });
	return Response.json(await run());
};
