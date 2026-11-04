import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { trialRequest } from '#lib/server/db/schema';
import { sendEmail } from '#lib/server/qms/email';
import { trialRequestNotifyEmail } from '#lib/server/email/templates/trial';
import { sendTrialOtp, verifyAndConsumeTrialOtp } from '#lib/server/qms/trial-otp';
import { isTrialDuration } from '#lib/tool/plans';
import { ORIGIN, TRIAL_REQUEST_INBOX } from '$app/env/private';

function trialInbox(): string | null {
	const inbox = (TRIAL_REQUEST_INBOX ?? process.env.TRIAL_REQUEST_INBOX ?? '').trim();
	return inbox || null;
}

/** Trial OTP and request actions need a live server. SvelteKit refuses to prerender those pages. */
export const prerender = false;

export const load: PageServerLoad = async () => {
	return {
		origin: ORIGIN || 'http://localhost:4001'
	};
};

export const actions: Actions = {
	sendTrialOtp: async ({ request }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		if (!email || !email.includes('@')) {
			return fail(400, {
				success: false,
				message: 'Enter a valid email before sending a verification code.',
				otpSent: false
			});
		}

		const result = await sendTrialOtp(email);
		if (!result.ok) {
			return fail(400, { success: false, message: result.message, otpSent: false });
		}
		return { success: true, message: result.message, otpSent: true };
	},

	requestTrial: async ({ request }) => {
		const form = await request.formData();
		const firstName = String(form.get('firstName') ?? '').trim();
		const lastName = String(form.get('lastName') ?? '').trim();
		const businessName = String(form.get('businessName') ?? '').trim();
		const businessWebsite = String(form.get('businessWebsite') ?? '').trim();
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		const otp = String(form.get('otp') ?? '').trim();
		const message = String(form.get('message') ?? '').trim();
		const duration = String(form.get('duration') ?? '').trim();

		if (!firstName || !lastName || !businessName || !email || !otp || !duration) {
			return fail(400, {
				success: false,
				message: 'Fill all required fields, including the verification code.',
				otpSent: false
			});
		}
		if (!isTrialDuration(duration)) {
			return fail(400, {
				success: false,
				message: 'Choose a trial duration: 7 days, 2 weeks, or 1 month.',
				otpSent: false
			});
		}

		const otpOk = await verifyAndConsumeTrialOtp(email, otp);
		if (!otpOk) {
			return fail(400, {
				success: false,
				message: 'Invalid or expired verification code. Send a new code and try again.',
				otpSent: false
			});
		}

		const website = businessWebsite || null;
		const [row] = await db
			.insert(trialRequest)
			.values({
				firstName,
				lastName,
				businessName,
				businessWebsite: website,
				email,
				message: message || null,
				duration,
				status: 'pending'
			})
			.returning();

		const inbox = trialInbox();
		if (!inbox) {
			console.warn(
				'[pricing] TRIAL_REQUEST_INBOX unset; trial request saved without notification email.'
			);
			return {
				success: true,
				message:
					'Your trial request was saved. Our team can see it in admin (notification inbox is not configured).',
				otpSent: false,
				requestId: row.id
			};
		}

		const origin = (ORIGIN || 'http://localhost:4001').replace(/\/$/, '');
		const adminUrl = `${origin}/admin/trials`;
		const notify = trialRequestNotifyEmail({
			firstName,
			lastName,
			businessName,
			businessWebsite: website ?? undefined,
			email,
			message: message || undefined,
			duration,
			adminUrl
		});

		const mail = await sendEmail({
			to: inbox,
			...notify
		});

		if (!mail.ok) {
			return {
				success: true,
				message:
					'Your trial request was saved, but the notification email failed. Our team can still see it in admin.',
				otpSent: false,
				requestId: row.id
			};
		}

		return {
			success: true,
			message: mail.loggedOnly
				? 'Trial request received. Notification logged on the server (set SMTP_* to email the inbox).'
				: 'Trial request received. We will follow up by email soon.',
			otpSent: false,
			requestId: row.id
		};
	}
};
