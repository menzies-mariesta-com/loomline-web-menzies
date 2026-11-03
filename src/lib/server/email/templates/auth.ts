import { escapeHtml } from '#lib/server/email/brand';
import { renderEmailLayout, textFooter } from '#lib/server/email/templates/layout';
import type { EmailMessage } from '#lib/server/email/templates/types';

export type PasswordResetProps = {
	resetUrl: string;
	expiresInMinutes?: number;
};

/**
 * Password reset link (better-auth `emailAndPassword.sendResetPassword`).
 */
export function passwordResetEmail(props: PasswordResetProps): EmailMessage {
	const mins = props.expiresInMinutes ?? 60;
	const subject = 'Reset your NextUp password';
	const text = [
		'We received a request to reset your NextUp password.',
		'',
		'Open this link to choose a new password:',
		props.resetUrl.trim(),
		'',
		`This link expires in about ${mins} minutes. If you did not request a reset, you can ignore this email.`,
		textFooter()
	].join('\n');

	const html = renderEmailLayout({
		heading: 'Reset your password',
		preheader: 'Choose a new password for your NextUp account',
		showHero: false,
		cta: { label: 'Reset password', url: props.resetUrl.trim() },
		bodyHtml: `<p style="margin:0 0 12px;">We received a request to reset your NextUp password.</p>
<p style="margin:0 0 12px;">Use the button below to choose a new password.</p>
<p style="margin:0;font-size:13px;opacity:0.85;">This link expires in about ${mins} minutes. If you did not request a reset, you can ignore this email.</p>`
	});

	return { subject, html, text };
}

export type PasswordChangedProps = {
	loginUrl: string;
	changedAtLabel?: string;
};

/** Confirmation after a successful password change (stub). */
export function passwordChangedEmail(props: PasswordChangedProps): EmailMessage {
	const when = props.changedAtLabel?.trim();
	const subject = 'Your NextUp password was changed';
	const text = [
		'Your NextUp password was changed successfully.',
		when ? `Time: ${when}` : '',
		'',
		'If this was you, no further action is needed.',
		'If you did not change your password, sign in and secure your account, or contact your administrator.',
		'',
		`Sign in: ${props.loginUrl.trim()}`,
		textFooter()
	]
		.filter((line) => line !== undefined)
		.join('\n');

	const html = renderEmailLayout({
		heading: 'Password updated',
		preheader: 'Your NextUp password was changed',
		showHero: false,
		cta: { label: 'Sign in', url: props.loginUrl.trim() },
		bodyHtml: `<p style="margin:0 0 12px;">Your NextUp password was changed successfully.${when ? ` <span style="opacity:0.85;">(${escapeHtml(when)})</span>` : ''}</p>
<p style="margin:0;">If this was you, no further action is needed. If you did not change your password, sign in and secure your account, or contact your administrator.</p>`
	});

	return { subject, html, text };
}
