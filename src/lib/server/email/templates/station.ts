import { escapeHtml, siteOrigin } from '#lib/server/email/brand';
import { renderEmailLayout, textFooter } from '#lib/server/email/templates/layout';
import type { EmailMessage } from '#lib/server/email/templates/types';

export type StationAccountCreatedProps = {
	businessName: string;
	stationEmail: string;
	/** Optional one-time password; omit if only email is shared. */
	temporaryPassword?: string;
	loginUrl?: string;
	deviceName?: string;
};

/** Station / agent desk credentials notice (stub until devices page emails staff). */
export function stationAccountCreatedEmail(props: StationAccountCreatedProps): EmailMessage {
	const loginUrl = (props.loginUrl ?? `${siteOrigin()}/auth/login`).trim();
	const subject = `Station account for ${props.businessName}`;
	const text = [
		`A NextUp agent station account was created for ${props.businessName}.`,
		props.deviceName ? `Device: ${props.deviceName}` : '',
		'',
		`Sign-in email: ${props.stationEmail}`,
		props.temporaryPassword ? `Temporary password: ${props.temporaryPassword}` : '',
		'',
		`Sign in: ${loginUrl}`,
		'',
		'Change the password after first sign-in when your policy requires it.',
		textFooter()
	]
		.filter(Boolean)
		.join('\n');

	const html = renderEmailLayout({
		heading: 'Station account ready',
		preheader: `Credentials for ${props.businessName}`,
		showHero: false,
		cta: { label: 'Sign in to NextUp', url: loginUrl },
		bodyHtml: `<p style="margin:0 0 12px;">A NextUp agent station account was created for <strong>${escapeHtml(props.businessName)}</strong>.</p>
${props.deviceName ? `<p style="margin:0 0 12px;">Device: <strong>${escapeHtml(props.deviceName)}</strong></p>` : ''}
<p style="margin:0 0 8px;"><strong>Email:</strong> ${escapeHtml(props.stationEmail)}</p>
${props.temporaryPassword ? `<p style="margin:0 0 12px;"><strong>Temporary password:</strong> ${escapeHtml(props.temporaryPassword)}</p>` : ''}
<p style="margin:0;font-size:13px;opacity:0.85;">Change the password after first sign-in when your policy requires it.</p>`
	});

	return { subject, html, text };
}
