import { escapeHtml } from '#lib/server/email/brand';
import { renderEmailLayout, textFooter } from '#lib/server/email/templates/layout';
import type { EmailMessage } from '#lib/server/email/templates/types';

export type AppointmentBookedProps = {
	businessName: string;
	startsAtLabel: string;
	endsAtLabel?: string;
	guestName?: string;
	siteName?: string;
	serviceName?: string;
};

export function appointmentBookedEmail(props: AppointmentBookedProps): EmailMessage {
	const subject = `Appointment booked at ${props.businessName}`;
	const hello = props.guestName?.trim() ? `Hello ${props.guestName.trim()},` : 'Hello,';
	const text = [
		hello,
		'',
		`Your appointment at ${props.businessName} is booked.`,
		`When: ${props.startsAtLabel}${props.endsAtLabel ? ` to ${props.endsAtLabel}` : ''}`,
		props.siteName ? `Where: ${props.siteName}` : '',
		props.serviceName ? `Service: ${props.serviceName}` : '',
		'',
		'If you need to change or cancel, contact the business.',
		textFooter()
	]
		.filter(Boolean)
		.join('\n');

	const details = [
		`<p style="margin:0 0 8px;"><strong>When:</strong> ${escapeHtml(props.startsAtLabel)}${props.endsAtLabel ? ` to ${escapeHtml(props.endsAtLabel)}` : ''}</p>`,
		props.siteName
			? `<p style="margin:0 0 8px;"><strong>Where:</strong> ${escapeHtml(props.siteName)}</p>`
			: '',
		props.serviceName
			? `<p style="margin:0;"><strong>Service:</strong> ${escapeHtml(props.serviceName)}</p>`
			: ''
	]
		.filter(Boolean)
		.join('\n');

	const html = renderEmailLayout({
		heading: 'Appointment confirmed',
		preheader: `${props.startsAtLabel} at ${props.businessName}`,
		showHero: true,
		bodyHtml: `<p style="margin:0 0 12px;">${escapeHtml(hello)}</p>
<p style="margin:0 0 12px;">Your appointment at <strong>${escapeHtml(props.businessName)}</strong> is booked.</p>
${details}
<p style="margin:16px 0 0;font-size:13px;opacity:0.85;">If you need to change or cancel, contact the business.</p>`
	});

	return { subject, html, text };
}

export type AppointmentReminderProps = {
	businessName: string;
	startsAtLabel: string;
	guestName?: string;
	siteName?: string;
	serviceName?: string;
};

export function appointmentReminderEmail(props: AppointmentReminderProps): EmailMessage {
	const subject = `Reminder: appointment at ${props.businessName}`;
	const hello = props.guestName?.trim() ? `Hello ${props.guestName.trim()},` : 'Hello,';
	const text = [
		hello,
		'',
		`Reminder: your appointment at ${props.businessName} is coming up.`,
		`When: ${props.startsAtLabel}`,
		props.siteName ? `Where: ${props.siteName}` : '',
		props.serviceName ? `Service: ${props.serviceName}` : '',
		textFooter()
	]
		.filter(Boolean)
		.join('\n');

	const html = renderEmailLayout({
		heading: 'Appointment reminder',
		preheader: props.startsAtLabel,
		showHero: true,
		bodyHtml: `<p style="margin:0 0 12px;">${escapeHtml(hello)}</p>
<p style="margin:0 0 12px;">Your appointment at <strong>${escapeHtml(props.businessName)}</strong> is coming up.</p>
<p style="margin:0 0 8px;"><strong>When:</strong> ${escapeHtml(props.startsAtLabel)}</p>
${props.siteName ? `<p style="margin:0 0 8px;"><strong>Where:</strong> ${escapeHtml(props.siteName)}</p>` : ''}
${props.serviceName ? `<p style="margin:0;"><strong>Service:</strong> ${escapeHtml(props.serviceName)}</p>` : ''}`
	});

	return { subject, html, text };
}

export type AppointmentCancelledProps = {
	businessName: string;
	startsAtLabel: string;
	guestName?: string;
};

export function appointmentCancelledEmail(props: AppointmentCancelledProps): EmailMessage {
	const subject = `Appointment cancelled at ${props.businessName}`;
	const hello = props.guestName?.trim() ? `Hello ${props.guestName.trim()},` : 'Hello,';
	const text = [
		hello,
		'',
		`Your appointment at ${props.businessName} on ${props.startsAtLabel} has been cancelled.`,
		'If this is unexpected, contact the business.',
		textFooter()
	].join('\n');

	const html = renderEmailLayout({
		heading: 'Appointment cancelled',
		preheader: props.startsAtLabel,
		showHero: false,
		bodyHtml: `<p style="margin:0 0 12px;">${escapeHtml(hello)}</p>
<p style="margin:0 0 12px;">Your appointment at <strong>${escapeHtml(props.businessName)}</strong> on <strong>${escapeHtml(props.startsAtLabel)}</strong> has been cancelled.</p>
<p style="margin:0;font-size:13px;opacity:0.85;">If this is unexpected, contact the business.</p>`
	});

	return { subject, html, text };
}
