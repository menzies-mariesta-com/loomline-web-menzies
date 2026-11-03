import { escapeHtml } from '#lib/server/email/brand';
import { renderEmailLayout, textFooter } from '#lib/server/email/templates/layout';
import type { EmailMessage } from '#lib/server/email/templates/types';

export type ManagerInviteProps = {
	businessName: string;
	inviteUrl: string;
	/** Optional role label shown in copy (e.g. manager, owner). */
	roleLabel?: string;
	expiresInDays?: number;
};

/** Platform / manager invite: set password and join a business. */
export function managerInviteEmail(props: ManagerInviteProps): EmailMessage {
	const days = props.expiresInDays ?? 7;
	const role = props.roleLabel?.trim();
	const joinAs = role ? ` as ${role}` : '';
	const subject = `Set your password for ${props.businessName} on NextUp`;
	const text = [
		`You have been invited to manage ${props.businessName} on NextUp${joinAs}.`,
		'',
		'Open this link to set your password and activate your account:',
		props.inviteUrl.trim(),
		'',
		`This invite expires in ${days} days. If you did not expect this email, you can ignore it.`,
		textFooter()
	].join('\n');

	const html = renderEmailLayout({
		heading: 'You are invited to NextUp',
		preheader: `Join ${props.businessName} and set your password`,
		showHero: true,
		cta: { label: 'Set your password', url: props.inviteUrl.trim() },
		bodyHtml: `<p style="margin:0 0 12px;">You have been invited to manage <strong>${escapeHtml(props.businessName)}</strong> on NextUp${role ? ` as <strong>${escapeHtml(role)}</strong>` : ''}.</p>
<p style="margin:0 0 12px;">Use the button below to set your password and activate your account.</p>
<p style="margin:0;font-size:13px;opacity:0.85;">This invite expires in ${days} days. If you did not expect this email, you can ignore it.</p>`
	});

	return { subject, html, text };
}

export type TeamInviteProps = {
	businessName: string;
	inviteUrl: string;
	roleLabel?: string;
	expiresInDays?: number;
};

/** Business team invite (owner/manager inviting staff). Set-password link (same UX as reset-password invite). */
export function teamInviteEmail(props: TeamInviteProps): EmailMessage {
	const days = props.expiresInDays ?? 7;
	const role = props.roleLabel?.trim() || 'team member';
	const subject = `Set your password for ${props.businessName} on NextUp`;
	const text = [
		`You have been invited to join ${props.businessName} on NextUp as ${role}.`,
		'',
		'Open this link to set your password and join:',
		props.inviteUrl.trim(),
		'',
		`This invite expires in ${days} days. If you did not expect this email, you can ignore it.`,
		textFooter()
	].join('\n');

	const html = renderEmailLayout({
		heading: 'Set your password',
		preheader: `Join ${props.businessName} as ${role}`,
		showHero: true,
		cta: { label: 'Set your password', url: props.inviteUrl.trim() },
		bodyHtml: `<p style="margin:0 0 12px;">You have been invited to join <strong>${escapeHtml(props.businessName)}</strong> as <strong>${escapeHtml(role)}</strong>.</p>
<p style="margin:0 0 12px;">Use the button below to set your password and activate your account.</p>
<p style="margin:0;font-size:13px;opacity:0.85;">This invite expires in ${days} days. If you did not expect this email, you can ignore it.</p>`
	});

	return { subject, html, text };
}

export type InviteReminderProps = {
	businessName: string;
	inviteUrl: string;
	expiresInDays?: number;
};

/** Reminder for a pending invite (stub until a reminder job exists). */
export function inviteReminderEmail(props: InviteReminderProps): EmailMessage {
	const days = props.expiresInDays ?? 7;
	const subject = `Reminder: join ${props.businessName} on NextUp`;
	const text = [
		`This is a reminder that you still have a pending invite to ${props.businessName} on NextUp.`,
		'',
		'Open this link to set your password and join:',
		props.inviteUrl.trim(),
		'',
		`The invite expires in about ${days} days from issue. If you already joined, you can ignore this message.`,
		textFooter()
	].join('\n');

	const html = renderEmailLayout({
		heading: 'Your invite is waiting',
		preheader: `Finish joining ${props.businessName}`,
		showHero: true,
		cta: { label: 'Finish setup', url: props.inviteUrl.trim() },
		bodyHtml: `<p style="margin:0 0 12px;">You still have a pending invite to <strong>${escapeHtml(props.businessName)}</strong> on NextUp.</p>
<p style="margin:0 0 12px;">Complete setup with the button below when you are ready.</p>
<p style="margin:0;font-size:13px;opacity:0.85;">If you already joined, you can ignore this message.</p>`
	});

	return { subject, html, text };
}

export type WelcomeAfterAcceptProps = {
	businessName: string;
	dashboardUrl: string;
	recipientName?: string;
};

/** Welcome after an invite is accepted (stub until wired at accept-invite). */
export function welcomeAfterAcceptEmail(props: WelcomeAfterAcceptProps): EmailMessage {
	const hello = props.recipientName?.trim() ? `Hello ${props.recipientName.trim()},` : 'Hello,';
	const subject = `Welcome to ${props.businessName} on NextUp`;
	const text = [
		hello,
		'',
		`Your account for ${props.businessName} is ready.`,
		'',
		'Open your dashboard:',
		props.dashboardUrl.trim(),
		textFooter()
	].join('\n');

	const html = renderEmailLayout({
		heading: 'Welcome to NextUp',
		preheader: `${props.businessName} is ready for you`,
		showHero: true,
		cta: { label: 'Open dashboard', url: props.dashboardUrl.trim() },
		bodyHtml: `<p style="margin:0 0 12px;">${escapeHtml(hello)}</p>
<p style="margin:0;">Your account for <strong>${escapeHtml(props.businessName)}</strong> is ready. Use the button below to open your dashboard.</p>`
	});

	return { subject, html, text };
}
