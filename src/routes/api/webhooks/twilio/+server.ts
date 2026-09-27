import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { notificationOutbox } from '#lib/server/db/schema';

/** Twilio status callback: updates outbox by provider message SID. */
export const POST: RequestHandler = async ({ request }) => {
	const form = await request.formData();
	const sid = String(form.get('MessageSid') ?? '');
	const status = String(form.get('MessageStatus') ?? '');
	if (!sid) return new Response('ok');

	const row = await db.query.notificationOutbox.findFirst({
		where: eq(notificationOutbox.providerMessageId, sid)
	});
	if (row) {
		const mapped =
			status === 'delivered' || status === 'sent'
				? 'sent'
				: status === 'failed' || status === 'undelivered'
					? 'failed'
					: row.status;
		await db
			.update(notificationOutbox)
			.set({
				status: mapped as typeof row.status,
				errorMessage: status === 'failed' ? String(form.get('ErrorMessage') ?? status) : row.errorMessage
			})
			.where(eq(notificationOutbox.id, row.id));
	}
	return new Response('ok');
};
