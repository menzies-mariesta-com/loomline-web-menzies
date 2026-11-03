import { escapeHtml, siteOrigin } from '#lib/server/email/brand';
import { renderEmailLayout, textFooter } from '#lib/server/email/templates/layout';
import type { EmailMessage } from '#lib/server/email/templates/types';

function ticketTrackUrl(publicToken: string): string {
	return `${siteOrigin()}/t/${encodeURIComponent(publicToken)}`;
}

export type TicketIssuedProps = {
	ticketNumber: string;
	businessName: string;
	publicToken: string;
	siteName?: string;
};

export function ticketIssuedEmail(props: TicketIssuedProps): EmailMessage {
	const trackUrl = ticketTrackUrl(props.publicToken);
	const subject = `Your ticket ${props.ticketNumber} at ${props.businessName}`;
	const text = [
		`Your NextUp ticket is ${props.ticketNumber}${props.siteName ? ` (${props.siteName})` : ''}.`,
		'',
		`Track your place in line:`,
		trackUrl,
		textFooter()
	].join('\n');

	const html = renderEmailLayout({
		heading: `Ticket ${props.ticketNumber}`,
		preheader: `Issued for ${props.businessName}`,
		showHero: true,
		cta: { label: 'Track your ticket', url: trackUrl },
		bodyHtml: `<p style="margin:0 0 12px;">Your ticket at <strong>${escapeHtml(props.businessName)}</strong> is ready.</p>
<p style="margin:0;font-size:28px;font-family:Fraunces,Georgia,serif;font-weight:600;letter-spacing:-0.02em;">${escapeHtml(props.ticketNumber)}</p>
${props.siteName ? `<p style="margin:8px 0 0;font-size:13px;opacity:0.85;">${escapeHtml(props.siteName)}</p>` : ''}`
	});

	return { subject, html, text };
}

export type TicketCalledProps = {
	ticketNumber: string;
	businessName: string;
	counterLabel?: string;
	publicToken?: string;
};

export function ticketCalledEmail(props: TicketCalledProps): EmailMessage {
	const subject = `Ticket ${props.ticketNumber} is being called`;
	const counter = props.counterLabel?.trim();
	const trackUrl = props.publicToken ? ticketTrackUrl(props.publicToken) : undefined;
	const text = [
		`Ticket ${props.ticketNumber} is now being called at ${props.businessName}.`,
		counter ? `Please go to ${counter}.` : 'Please proceed to the serving point.',
		trackUrl ? `\nTrack: ${trackUrl}` : '',
		textFooter()
	]
		.filter(Boolean)
		.join('\n');

	const html = renderEmailLayout({
		heading: 'It is your turn',
		preheader: `Ticket ${props.ticketNumber} is being called`,
		showHero: true,
		cta: trackUrl ? { label: 'View ticket', url: trackUrl } : undefined,
		bodyHtml: `<p style="margin:0 0 12px;">Ticket <strong>${escapeHtml(props.ticketNumber)}</strong> is now being called at <strong>${escapeHtml(props.businessName)}</strong>.</p>
<p style="margin:0;">${counter ? `Please go to <strong>${escapeHtml(counter)}</strong>.` : 'Please proceed to the serving point.'}</p>`
	});

	return { subject, html, text };
}

export type AlmostYourTurnProps = {
	ticketNumber: string;
	businessName: string;
	publicToken?: string;
	threshold?: number;
};

export function almostYourTurnEmail(props: AlmostYourTurnProps): EmailMessage {
	const subject = `Ticket ${props.ticketNumber}: you are almost next`;
	const trackUrl = props.publicToken ? ticketTrackUrl(props.publicToken) : undefined;
	const text = [
		`Ticket ${props.ticketNumber} at ${props.businessName}: you are almost next.`,
		'Please stay nearby.',
		trackUrl ? `\nTrack: ${trackUrl}` : '',
		textFooter()
	]
		.filter(Boolean)
		.join('\n');

	const html = renderEmailLayout({
		heading: 'Almost your turn',
		preheader: `Ticket ${props.ticketNumber} is near the front`,
		showHero: true,
		cta: trackUrl ? { label: 'View ticket', url: trackUrl } : undefined,
		bodyHtml: `<p style="margin:0 0 12px;">Ticket <strong>${escapeHtml(props.ticketNumber)}</strong> at <strong>${escapeHtml(props.businessName)}</strong> is near the front of the line.</p>
<p style="margin:0;">Please stay nearby so you are ready when called.</p>`
	});

	return { subject, html, text };
}

export type TicketCompletedProps = {
	ticketNumber: string;
	businessName: string;
};

export function ticketCompletedEmail(props: TicketCompletedProps): EmailMessage {
	const subject = `Ticket ${props.ticketNumber} completed`;
	const text = [
		`Ticket ${props.ticketNumber} at ${props.businessName} is complete. Thank you for visiting.`,
		textFooter()
	].join('\n');

	const html = renderEmailLayout({
		heading: 'Visit complete',
		preheader: `Ticket ${props.ticketNumber} is done`,
		showHero: false,
		bodyHtml: `<p style="margin:0;">Ticket <strong>${escapeHtml(props.ticketNumber)}</strong> at <strong>${escapeHtml(props.businessName)}</strong> is complete. Thank you for visiting.</p>`
	});

	return { subject, html, text };
}
