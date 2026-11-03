import { ORIGIN, BETTER_AUTH_SECRET } from '$app/env/private';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from '#lib/server/db';
import { passwordResetEmail } from '#lib/server/email/templates/auth';
import { sendEmail } from '#lib/server/qms/email';

export const auth = betterAuth({
	baseURL: ORIGIN,
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: {
		enabled: true,
		sendResetPassword: async ({ user, url }) => {
			const message = passwordResetEmail({ resetUrl: url });
			const result = await sendEmail({ to: user.email, ...message });
			if (!result.ok) {
				console.error(
					`[auth:reset-password] failed to=${user.email}: ${result.errorMessage ?? 'unknown'}`
				);
			} else if (result.loggedOnly) {
				console.info(`[auth:reset-password] logged to console for ${user.email} (set SMTP_* to email it)`);
			}
		}
	},
	plugins: [
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
