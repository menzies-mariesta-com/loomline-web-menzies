import type { RequestHandler } from './$types';
import { getSiteSnapshot } from '#lib/server/qms/ticket-machine';

export const GET: RequestHandler = async ({ params, url }) => {
	const siteId = params.siteId;
	const once = url.searchParams.get('once') === '1';

	if (once) {
		const snapshot = await getSiteSnapshot(siteId);
		return Response.json(snapshot);
	}

	const stream = new ReadableStream({
		async start(controller) {
			const enc = new TextEncoder();
			let closed = false;
			const send = async () => {
				if (closed) return;
				try {
					const snapshot = await getSiteSnapshot(siteId);
					controller.enqueue(enc.encode(`data: ${JSON.stringify(snapshot)}\n\n`));
				} catch {
					controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: true })}\n\n`));
				}
			};
			await send();
			const id = setInterval(send, 2000);
			const close = () => {
				closed = true;
				clearInterval(id);
				try {
					controller.close();
				} catch {
					/* already closed */
				}
			};
			// Netlify / serverless: stop after ~25s and let client reconnect
			setTimeout(close, 25_000);
		},
		cancel() {}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive'
		}
	});
};
