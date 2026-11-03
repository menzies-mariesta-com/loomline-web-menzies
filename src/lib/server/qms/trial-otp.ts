import { and, eq, gt, lt } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '#lib/server/db';
import { verification } from '#lib/server/db/schema';
import { sendEmail } from '#lib/server/qms/email';
import { trialOtpEmail } from '#lib/server/email/templates/trial';

const OTP_TTL_MS = 15 * 60_000;
const OTP_PREFIX = 'trial-otp:';

function identifierFor(email: string): string {
	return `${OTP_PREFIX}${email.trim().toLowerCase()}`;
}

function generateOtpCode(): string {
	return String(Math.floor(100000 + Math.random() * 900000));
}

/** Send a 6-digit Soft Wash OTP email and store it in the verification table. */
export async function sendTrialOtp(emailRaw: string): Promise<{ ok: boolean; message: string }> {
	const email = emailRaw.trim().toLowerCase();
	if (!email || !email.includes('@')) {
		return { ok: false, message: 'A valid email is required.' };
	}

	const code = generateOtpCode();
	const identifier = identifierFor(email);
	const expiresAt = new Date(Date.now() + OTP_TTL_MS);

	await db.delete(verification).where(eq(verification.identifier, identifier));
	await db.insert(verification).values({
		id: randomUUID(),
		identifier,
		value: code,
		expiresAt
	});

	const message = trialOtpEmail({ code, expiresInMinutes: 15 });
	const result = await sendEmail({ to: email, ...message });
	if (!result.ok) {
		return { ok: false, message: result.errorMessage ?? 'Could not send verification code.' };
	}

	return {
		ok: true,
		message: result.loggedOnly
			? 'Verification code logged on the server (set SMTP_* to email it).'
			: 'Verification code sent. Check your inbox.'
	};
}

/** Consume a valid OTP for the given email. Returns false if missing/expired/wrong. */
export async function verifyAndConsumeTrialOtp(
	emailRaw: string,
	codeRaw: string
): Promise<boolean> {
	const email = emailRaw.trim().toLowerCase();
	const code = codeRaw.trim();
	if (!email || !code) return false;

	const identifier = identifierFor(email);
	const now = new Date();
	const row = await db.query.verification.findFirst({
		where: and(
			eq(verification.identifier, identifier),
			eq(verification.value, code),
			gt(verification.expiresAt, now)
		)
	});
	if (!row) return false;

	await db.delete(verification).where(eq(verification.id, row.id));
	return true;
}

/** Drop expired trial OTP rows (best-effort housekeeping). */
export async function purgeExpiredTrialOtps(): Promise<number> {
	const all = await db.query.verification.findMany({
		where: lt(verification.expiresAt, new Date()),
		limit: 100
	});
	let n = 0;
	for (const row of all) {
		if (!row.identifier.startsWith(OTP_PREFIX)) continue;
		await db.delete(verification).where(eq(verification.id, row.id));
		n += 1;
	}
	return n;
}
