import type { RequestHandler } from './$types';
import { drainNotificationOutbox } from '#lib/server/qms/notify';
import { expireEndedTrials } from '#lib/server/qms/trial-expiry';

function authorized(request: Request): boolean {
	const secret = request.headers.get('x-cron-secret') ?? '';
	const expected = process.env.CRON_SECRET ?? '';
	return Boolean(expected) && secret === expected;
}

async function run() {
	const outbox = await drainNotificationOutbox(50);
	const trials = await expireEndedTrials();
	return { ...outbox, trials };
}

export const POST: RequestHandler = async ({ request }) => {
	if (!authorized(request)) return new Response('Unauthorized', { status: 401 });
	return Response.json(await run());
};

export const GET: RequestHandler = async ({ request }) => {
	if (!authorized(request)) return new Response('Unauthorized', { status: 401 });
	return Response.json(await run());
};
