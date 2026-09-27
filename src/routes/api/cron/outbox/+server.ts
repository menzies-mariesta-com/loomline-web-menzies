import type { RequestHandler } from './$types';
import { drainNotificationOutbox } from '#lib/server/qms/notify';

function authorized(request: Request): boolean {
	const secret = request.headers.get('x-cron-secret') ?? '';
	const expected = process.env.CRON_SECRET ?? '';
	return Boolean(expected) && secret === expected;
}

export const POST: RequestHandler = async ({ request }) => {
	if (!authorized(request)) return new Response('Unauthorized', { status: 401 });
	const result = await drainNotificationOutbox(50);
	return Response.json(result);
};

export const GET: RequestHandler = async ({ request }) => {
	if (!authorized(request)) return new Response('Unauthorized', { status: 401 });
	const result = await drainNotificationOutbox(50);
	return Response.json(result);
};
