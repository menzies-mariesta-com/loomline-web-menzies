import net from 'node:net';
import tls from 'node:tls';
import {
	SMTP_FROM,
	SMTP_HOST,
	SMTP_PASS,
	SMTP_PORT,
	SMTP_USER
} from '$app/env/private';
import { managerInviteEmail } from '#lib/server/email/templates/invite';

export type SendEmailInput = {
	to: string;
	subject: string;
	text: string;
	html?: string;
};

export type SendEmailResult = {
	ok: boolean;
	providerMessageId?: string;
	errorMessage?: string;
	/** True when SMTP was unset and the message was logged instead. */
	loggedOnly?: boolean;
};

function smtpConfig() {
	// Prefer SvelteKit private env ($app/env/private). process.env alone is often empty for .env
	// private vars under Vite SSR, which incorrectly forced the console fallback.
	const host = (SMTP_HOST ?? process.env.SMTP_HOST)?.trim();
	if (!host) return null;
	const portRaw = SMTP_PORT ?? process.env.SMTP_PORT ?? '587';
	const port = Number(String(portRaw).trim()) || 587;
	const user = (SMTP_USER ?? process.env.SMTP_USER)?.trim() || undefined;
	const passRaw = SMTP_PASS ?? process.env.SMTP_PASS;
	const pass = passRaw !== undefined && passRaw !== null ? String(passRaw) : undefined;
	const from =
		(SMTP_FROM ?? process.env.SMTP_FROM)?.trim() || user || 'noreply@loomline.local';
	return { host, port, user, pass, from };
}

function encodeSubject(subject: string): string {
	if (/^[\x20-\x7E]*$/.test(subject)) return subject;
	return `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
}

function buildMime(from: string, input: SendEmailInput): string {
	const boundary = `loomline_${Date.now().toString(36)}`;
	const parts = [
		`From: ${from}`,
		`To: ${input.to}`,
		`Subject: ${encodeSubject(input.subject)}`,
		'MIME-Version: 1.0',
		`Content-Type: multipart/alternative; boundary="${boundary}"`,
		'',
		`--${boundary}`,
		'Content-Type: text/plain; charset=utf-8',
		'Content-Transfer-Encoding: 8bit',
		'',
		input.text.replace(/\r?\n/g, '\r\n'),
		''
	];
	if (input.html) {
		parts.push(
			`--${boundary}`,
			'Content-Type: text/html; charset=utf-8',
			'Content-Transfer-Encoding: 8bit',
			'',
			input.html.replace(/\r?\n/g, '\r\n'),
			''
		);
	}
	parts.push(`--${boundary}--`, '');
	return parts.join('\r\n');
}

class SmtpSession {
	private buffer = '';
	private socket: net.Socket | tls.TLSSocket;

	constructor(socket: net.Socket | tls.TLSSocket) {
		this.socket = socket;
		this.socket.setEncoding('utf8');
	}

	private readReply(timeoutMs = 15_000): Promise<{ code: number; text: string }> {
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				cleanup();
				reject(new Error('SMTP read timeout'));
			}, timeoutMs);

			const onData = (chunk: string) => {
				this.buffer += chunk;
				const lines = this.buffer.split(/\r?\n/);
				// Keep incomplete trailing line in buffer
				this.buffer = lines.pop() ?? '';
				const complete = lines.filter((l) => l.length > 0);
				if (complete.length === 0) return;

				const last = complete[complete.length - 1];
				if (last.length < 4) return;
				// Final line of a reply has "CODE " (space), continuation has "CODE-"
				if (last[3] === '-') return;

				const code = Number(last.slice(0, 3));
				if (!Number.isFinite(code)) return;
				cleanup();
				resolve({ code, text: complete.join('\n') });
			};

			const onError = (err: Error) => {
				cleanup();
				reject(err);
			};

			const cleanup = () => {
				clearTimeout(timer);
				this.socket.off('data', onData);
				this.socket.off('error', onError);
			};

			this.socket.on('data', onData);
			this.socket.on('error', onError);

			// Process any buffered data already present
			if (this.buffer) onData('');
		});
	}

	async expect(code: number, command?: string): Promise<void> {
		if (command !== undefined) {
			this.socket.write(`${command}\r\n`);
		}
		const reply = await this.readReply();
		if (reply.code !== code) {
			throw new Error(`SMTP expected ${code}, got ${reply.code}: ${reply.text}`);
		}
	}

	writeRaw(data: string): void {
		this.socket.write(data);
	}

	destroy(): void {
		this.socket.destroy();
	}

	get raw(): net.Socket | tls.TLSSocket {
		return this.socket;
	}

	setSocket(socket: net.Socket | tls.TLSSocket): void {
		this.socket = socket;
		this.socket.setEncoding('utf8');
		this.buffer = '';
	}
}

async function connectPlain(host: string, port: number): Promise<net.Socket> {
	return new Promise((resolve, reject) => {
		const socket = net.connect({ host, port }, () => resolve(socket));
		socket.once('error', reject);
	});
}

async function connectTls(host: string, port: number): Promise<tls.TLSSocket> {
	return new Promise((resolve, reject) => {
		const socket = tls.connect({ host, port, servername: host }, () => resolve(socket));
		socket.once('error', reject);
	});
}

async function upgradeTls(plain: net.Socket, host: string): Promise<tls.TLSSocket> {
	return new Promise((resolve, reject) => {
		const socket = tls.connect({ socket: plain, servername: host, host }, () => resolve(socket));
		socket.once('error', reject);
	});
}

/** First http(s) URL on its own line (or anywhere) in plain text, trimmed. */
function extractUrlFromText(text: string): string | undefined {
	for (const line of text.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (/^https?:\/\//i.test(trimmed)) return trimmed;
	}
	const match = text.match(/https?:\/\/[^\s\\]+/i);
	return match?.[0]?.trim();
}

function logConsoleFallback(input: SendEmailInput): void {
	const url = extractUrlFromText(input.text);
	console.info(`[email:console] to=${input.to} subject=${input.subject}`);
	if (url) {
		console.info(`[email:console] url=${url}`);
	} else {
		console.info(`[email:console] text=${input.text.replace(/\s+/g, ' ').trim()}`);
	}
}

async function sendViaSmtp(
	cfg: NonNullable<ReturnType<typeof smtpConfig>>,
	input: SendEmailInput
): Promise<SendEmailResult> {
	const mime = buildMime(cfg.from, input);
	let session: SmtpSession | null = null;

	try {
		const useImplicitTls = cfg.port === 465;
		const initial = useImplicitTls
			? await connectTls(cfg.host, cfg.port)
			: await connectPlain(cfg.host, cfg.port);
		session = new SmtpSession(initial);
		await session.expect(220);

		const hello = 'loomline.local';
		await session.expect(250, `EHLO ${hello}`);

		if (!useImplicitTls && cfg.port === 587) {
			await session.expect(220, 'STARTTLS');
			const upgraded = await upgradeTls(session.raw as net.Socket, cfg.host);
			session.setSocket(upgraded);
			await session.expect(250, `EHLO ${hello}`);
		}

		if (cfg.user && cfg.pass !== undefined) {
			const token = Buffer.from(`\0${cfg.user}\0${cfg.pass}`, 'utf8').toString('base64');
			await session.expect(235, `AUTH PLAIN ${token}`);
		}

		await session.expect(250, `MAIL FROM:<${cfg.from}>`);
		await session.expect(250, `RCPT TO:<${input.to}>`);
		await session.expect(354, 'DATA');
		session.writeRaw(`${mime}\r\n.\r\n`);
		await session.expect(250);
		await session.expect(221, 'QUIT');

		return { ok: true, providerMessageId: `smtp-${Date.now()}` };
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'SMTP send failed';
		console.error(`[email:smtp] failed to=${input.to}: ${errorMessage}`);
		const url = extractUrlFromText(input.text);
		if (url) console.info(`[email:smtp] recoveryUrl=${url}`);
		return { ok: false, errorMessage };
	} finally {
		session?.destroy();
	}
}

/**
 * Sends email via SMTP when `SMTP_HOST` is set; otherwise logs to the server console
 * so invite links remain usable in local/dev without mail config.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
	const cfg = smtpConfig();
	if (!cfg) {
		logConsoleFallback(input);
		return {
			ok: true,
			providerMessageId: `console-${Date.now()}`,
			loggedOnly: true
		};
	}
	return sendViaSmtp(cfg, input);
}

/** Strip whitespace / accidental trailing escapes from invite tokens in URLs or forms. */
export function normalizeInviteToken(raw: string | null | undefined): string {
	let token = (raw ?? '').trim();
	// util.inspect / bad paste can leave a literal "\n" or "\r" suffix
	while (token.endsWith('\\n') || token.endsWith('\\r')) {
		token = token.slice(0, -2).trimEnd();
	}
	return token;
}

export function inviteSetPasswordUrl(origin: string, token: string): string {
	const base = origin.trim().replace(/\/$/, '');
	const clean = normalizeInviteToken(token);
	return `${base}/auth/accept-invite?token=${encodeURIComponent(clean)}`;
}

export async function sendManagerInviteEmail(opts: {
	to: string;
	businessName: string;
	inviteUrl: string;
	roleLabel?: string;
}): Promise<SendEmailResult> {
	const message = managerInviteEmail({
		businessName: opts.businessName,
		inviteUrl: opts.inviteUrl,
		roleLabel: opts.roleLabel
	});
	return sendEmail({ to: opts.to, ...message });
}
