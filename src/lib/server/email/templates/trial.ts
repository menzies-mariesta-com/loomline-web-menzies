import { escapeHtml } from '#lib/server/email/brand';
import { renderEmailLayout, textFooter } from '#lib/server/email/templates/layout';
import type { EmailMessage } from '#lib/server/email/templates/types';
import { trialDurationLabel } from '#lib/tool/plans';

export type TrialOtpProps = {
	code: string;
	expiresInMinutes?: number;
};

/** One-time code for pricing trial request email verification. */
export function trialOtpEmail(props: TrialOtpProps): EmailMessage {
	const mins = props.expiresInMinutes ?? 15;
	const code = props.code.trim();
	const subject = 'Your NextUp trial verification code';
	const text = [
		'Use this code to verify your email for a NextUp trial request:',
		'',
		code,
		'',
		`This code expires in about ${mins} minutes. If you did not request a trial, you can ignore this email.`,
		textFooter()
	].join('\n');

	const html = renderEmailLayout({
		heading: 'Verify your email',
		preheader: `Your NextUp trial code is ${code}`,
		showHero: false,
		bodyHtml: `<p style="margin:0 0 12px;">Use this code to verify your email for a NextUp trial request:</p>
<p style="margin:0 0 16px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:28px;font-weight:700;letter-spacing:0.2em;text-align:center;">${escapeHtml(code)}</p>
<p style="margin:0;font-size:13px;opacity:0.85;">This code expires in about ${mins} minutes. If you did not request a trial, you can ignore this email.</p>`
	});

	return { subject, html, text };
}

export type TrialRequestNotifyProps = {
	firstName: string;
	lastName: string;
	businessName: string;
	businessWebsite?: string;
	email: string;
	message?: string;
	duration: string;
	adminUrl?: string;
};

/** Soft Wash inbox notification when someone requests a trial from pricing. */
export function trialRequestNotifyEmail(props: TrialRequestNotifyProps): EmailMessage {
	const durationLabel = trialDurationLabel(props.duration);
	const name = `${props.firstName.trim()} ${props.lastName.trim()}`.trim();
	const subject = `Trial request: ${props.businessName} (${durationLabel})`;
	const website = props.businessWebsite?.trim();
	const message = props.message?.trim();

	const textLines = [
		'A new NextUp trial request was submitted.',
		'',
		`Name: ${name}`,
		`Email: ${props.email.trim()}`,
		`Business: ${props.businessName.trim()}`,
		website ? `Website: ${website}` : null,
		`Duration: ${durationLabel}`,
		message ? `Message:\n${message}` : null,
		props.adminUrl ? `\nReview in admin:\n${props.adminUrl}` : null,
		textFooter()
	].filter((line): line is string => line !== null);

	const htmlRows = [
		['Name', name],
		['Email', props.email.trim()],
		['Business', props.businessName.trim()],
		website ? ['Website', website] : null,
		['Duration', durationLabel]
	].filter((row): row is [string, string] => row !== null);

	const tableHtml = htmlRows
		.map(
			([label, value]) =>
				`<tr>
					<td style="padding:4px 12px 4px 0;vertical-align:top;font-size:13px;opacity:0.75;white-space:nowrap;">${escapeHtml(label)}</td>
					<td style="padding:4px 0;vertical-align:top;">${escapeHtml(value)}</td>
				</tr>`
		)
		.join('');

	const messageBlock = message
		? `<p style="margin:16px 0 0;"><strong>Message</strong></p>
<p style="margin:6px 0 0;white-space:pre-wrap;">${escapeHtml(message)}</p>`
		: '';

	const html = renderEmailLayout({
		heading: 'New trial request',
		preheader: `${name} requested a ${durationLabel} trial for ${props.businessName}`,
		showHero: true,
		cta: props.adminUrl
			? { label: 'Review in admin', url: props.adminUrl }
			: undefined,
		bodyHtml: `<p style="margin:0 0 12px;">Someone submitted a trial request from the pricing page.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">${tableHtml}</table>
${messageBlock}`
	});

	return { subject, html, text: textLines.join('\n') };
}
