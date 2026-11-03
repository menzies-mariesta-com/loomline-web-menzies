import { and, eq, lte } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { notificationOutbox } from '#lib/server/db/schema';
import { resolveEmailTemplate } from '#lib/server/email/templates';
import { sendEmail } from '#lib/server/qms/email';

export type NotifyChannel = 'sms' | 'telegram' | 'viber' | 'discord' | 'email' | 'push';

export type NotifyInput = {
	businessId: string;
	channel: NotifyChannel;
	toAddress: string;
	templateKey: string;
	payload?: Record<string, unknown>;
	scheduledAt?: Date;
};

export type NotifyResult = {
	ok: boolean;
	providerMessageId?: string;
	errorMessage?: string;
	loggedOnly?: boolean;
};

export interface NotificationPort {
	send(input: NotifyInput): Promise<NotifyResult>;
}

export class ConsoleNotificationAdapter implements NotificationPort {
	async send(input: NotifyInput): Promise<NotifyResult> {
		console.info('[notify:console]', input.channel, input.toAddress, input.templateKey, input.payload);
		return { ok: true, providerMessageId: `console-${Date.now()}`, loggedOnly: true };
	}
}

export class EmailNotificationAdapter implements NotificationPort {
	async send(input: NotifyInput): Promise<NotifyResult> {
		if (input.channel !== 'email') {
			return { ok: false, errorMessage: `Email adapter does not support ${input.channel}` };
		}
		const payload = input.payload ?? {};
		const rendered = resolveEmailTemplate(input.templateKey, payload);
		if (rendered) {
			return sendEmail({
				to: input.toAddress,
				subject: rendered.subject,
				text: rendered.text,
				html: rendered.html
			});
		}
		const body =
			typeof payload.body === 'string' ? payload.body : `NextUp: ${input.templateKey}`;
		const subject =
			typeof payload.subject === 'string' ? payload.subject : `NextUp: ${input.templateKey}`;
		const html = typeof payload.html === 'string' ? payload.html : undefined;
		return sendEmail({ to: input.toAddress, subject, text: body, html });
	}
}

export class TwilioNotificationAdapter implements NotificationPort {
	constructor(
		private readonly accountSid: string,
		private readonly authToken: string,
		private readonly fromSms: string
	) {}

	async send(input: NotifyInput): Promise<NotifyResult> {
		if (input.channel !== 'sms') {
			return { ok: false, errorMessage: `Twilio adapter does not support ${input.channel}` };
		}

		const body =
			typeof input.payload?.body === 'string'
				? input.payload.body
				: `NextUp: ${input.templateKey}`;

		const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
		const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
		const form = new URLSearchParams({ To: input.toAddress, From: this.fromSms, Body: body });

		try {
			const res = await fetch(url, {
				method: 'POST',
				headers: {
					Authorization: `Basic ${auth}`,
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: form
			});
			const data = (await res.json()) as { sid?: string; message?: string };
			if (!res.ok) {
				return { ok: false, errorMessage: data.message ?? `Twilio HTTP ${res.status}` };
			}
			return { ok: true, providerMessageId: data.sid };
		} catch (err) {
			return {
				ok: false,
				errorMessage: err instanceof Error ? err.message : 'Twilio request failed'
			};
		}
	}
}

/** Routes email → SMTP/console, SMS → Twilio when configured, else console (Telegram/Viber/Discord log). */
export class CompositeNotificationAdapter implements NotificationPort {
	constructor(
		private readonly email: NotificationPort,
		private readonly sms: NotificationPort,
		private readonly chat: NotificationPort
	) {}

	async send(input: NotifyInput): Promise<NotifyResult> {
		if (input.channel === 'email') return this.email.send(input);
		if (input.channel === 'sms') return this.sms.send(input);
		if (
			input.channel === 'telegram' ||
			input.channel === 'viber' ||
			input.channel === 'discord' ||
			input.channel === 'push'
		) {
			return this.chat.send(input);
		}
		return this.chat.send(input);
	}
}

export function getNotificationPort(): NotificationPort {
	const sid = process.env.TWILIO_ACCOUNT_SID;
	const token = process.env.TWILIO_AUTH_TOKEN;
	const fromSms = process.env.TWILIO_FROM_SMS;
	const sms =
		sid && token && fromSms
			? new TwilioNotificationAdapter(sid, token, fromSms)
			: new ConsoleNotificationAdapter();
	const consolePort = new ConsoleNotificationAdapter();
	return new CompositeNotificationAdapter(new EmailNotificationAdapter(), sms, consolePort);
}

export async function enqueueNotification(input: NotifyInput) {
	const [row] = await db
		.insert(notificationOutbox)
		.values({
			businessId: input.businessId,
			channel: input.channel,
			toAddress: input.toAddress,
			templateKey: input.templateKey,
			payload: input.payload ?? {},
			scheduledAt: input.scheduledAt ?? new Date(),
			status: 'pending'
		})
		.returning();
	return row;
}

/** Enqueue then attempt immediate delivery (does not wait on cron). */
export async function enqueueAndDeliverNotification(input: NotifyInput) {
	const row = await enqueueNotification(input);
	await db
		.update(notificationOutbox)
		.set({ status: 'sending', attempts: row.attempts + 1 })
		.where(eq(notificationOutbox.id, row.id));

	const result = await getNotificationPort().send(input);
	if (result.ok) {
		await db
			.update(notificationOutbox)
			.set({
				status: 'sent',
				providerMessageId: result.providerMessageId,
				sentAt: new Date(),
				errorMessage: null
			})
			.where(eq(notificationOutbox.id, row.id));
	} else {
		console.error(
			`[notify] deliver failed channel=${input.channel} to=${input.toAddress}: ${result.errorMessage ?? 'unknown'}`
		);
		await db
			.update(notificationOutbox)
			.set({
				status: 'pending',
				errorMessage: result.errorMessage
			})
			.where(eq(notificationOutbox.id, row.id));
	}
	return { row, result };
}

export async function drainNotificationOutbox(limit = 50) {
	const port = getNotificationPort();
	const pending = await db.query.notificationOutbox.findMany({
		where: and(
			eq(notificationOutbox.status, 'pending'),
			lte(notificationOutbox.scheduledAt, new Date())
		),
		limit
	});

	let sent = 0;
	let failed = 0;

	for (const row of pending) {
		await db
			.update(notificationOutbox)
			.set({ status: 'sending', attempts: row.attempts + 1 })
			.where(eq(notificationOutbox.id, row.id));

		const result = await port.send({
			businessId: row.businessId,
			channel: row.channel,
			toAddress: row.toAddress,
			templateKey: row.templateKey,
			payload: row.payload as Record<string, unknown>
		});

		if (result.ok) {
			sent += 1;
			await db
				.update(notificationOutbox)
				.set({
					status: 'sent',
					providerMessageId: result.providerMessageId,
					sentAt: new Date(),
					errorMessage: null
				})
				.where(eq(notificationOutbox.id, row.id));
		} else {
			failed += 1;
			await db
				.update(notificationOutbox)
				.set({
					status: row.attempts + 1 >= 5 ? 'failed' : 'pending',
					errorMessage: result.errorMessage
				})
				.where(eq(notificationOutbox.id, row.id));
		}
	}

	return { processed: pending.length, sent, failed };
}
