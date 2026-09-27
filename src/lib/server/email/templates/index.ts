/**
 * Soft Wash email templates.
 *
 * Scenario index (templateKey → builder):
 * - owner_invite / manager_invite → managerInviteEmail
 * - team_invite → teamInviteEmail
 * - invite_reminder → inviteReminderEmail (stub sender)
 * - welcome_after_accept → welcomeAfterAcceptEmail (stub sender)
 * - password_reset → passwordResetEmail (stub; better-auth not wired yet)
 * - password_changed → passwordChangedEmail (stub)
 * - ticket_issued → ticketIssuedEmail
 * - ticket_called → ticketCalledEmail
 * - almost_your_turn → almostYourTurnEmail
 * - ticket_completed → ticketCompletedEmail
 * - appointment_booked → appointmentBookedEmail
 * - appointment_reminder → appointmentReminderEmail
 * - appointment_cancelled → appointmentCancelledEmail
 * - station_account_created → stationAccountCreatedEmail (stub sender)
 * - transactional / unknown → transactionalFallbackEmail
 */
import {
	appointmentBookedEmail,
	appointmentCancelledEmail,
	appointmentReminderEmail
} from '#lib/server/email/templates/appointment';
import { passwordChangedEmail, passwordResetEmail } from '#lib/server/email/templates/auth';
import {
	inviteReminderEmail,
	managerInviteEmail,
	teamInviteEmail,
	welcomeAfterAcceptEmail
} from '#lib/server/email/templates/invite';
import { stationAccountCreatedEmail } from '#lib/server/email/templates/station';
import {
	almostYourTurnEmail,
	ticketCalledEmail,
	ticketCompletedEmail,
	ticketIssuedEmail
} from '#lib/server/email/templates/ticket';
import { transactionalFallbackEmail } from '#lib/server/email/templates/transactional';
import type { EmailMessage } from '#lib/server/email/templates/types';
import { siteOrigin } from '#lib/server/email/brand';

export type { EmailMessage, EmailCta } from '#lib/server/email/templates/types';
export { renderEmailLayout, textFooter } from '#lib/server/email/templates/layout';
export {
	managerInviteEmail,
	teamInviteEmail,
	inviteReminderEmail,
	welcomeAfterAcceptEmail
} from '#lib/server/email/templates/invite';
export { passwordResetEmail, passwordChangedEmail } from '#lib/server/email/templates/auth';
export {
	ticketIssuedEmail,
	ticketCalledEmail,
	almostYourTurnEmail,
	ticketCompletedEmail
} from '#lib/server/email/templates/ticket';
export {
	appointmentBookedEmail,
	appointmentReminderEmail,
	appointmentCancelledEmail
} from '#lib/server/email/templates/appointment';
export { stationAccountCreatedEmail } from '#lib/server/email/templates/station';
export { transactionalFallbackEmail } from '#lib/server/email/templates/transactional';

function str(payload: Record<string, unknown>, key: string): string | undefined {
	const v = payload[key];
	return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function num(payload: Record<string, unknown>, key: string): number | undefined {
	const v = payload[key];
	return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/**
 * Resolve Soft Wash HTML/text for a notification `templateKey` + payload.
 * Returns null when required fields are missing (caller may fall back).
 */
export function resolveEmailTemplate(
	templateKey: string,
	payload: Record<string, unknown> = {}
): EmailMessage | null {
	const key = templateKey.trim();

	switch (key) {
		case 'owner_invite':
		case 'manager_invite': {
			const businessName = str(payload, 'businessName');
			const inviteUrl = str(payload, 'inviteUrl');
			if (!businessName || !inviteUrl) return null;
			return managerInviteEmail({
				businessName,
				inviteUrl,
				roleLabel: str(payload, 'roleLabel'),
				expiresInDays: num(payload, 'expiresInDays')
			});
		}
		case 'team_invite': {
			const businessName = str(payload, 'businessName');
			const inviteUrl = str(payload, 'inviteUrl');
			if (!businessName || !inviteUrl) return null;
			return teamInviteEmail({
				businessName,
				inviteUrl,
				roleLabel: str(payload, 'roleLabel'),
				expiresInDays: num(payload, 'expiresInDays')
			});
		}
		case 'invite_reminder': {
			const businessName = str(payload, 'businessName');
			const inviteUrl = str(payload, 'inviteUrl');
			if (!businessName || !inviteUrl) return null;
			return inviteReminderEmail({
				businessName,
				inviteUrl,
				expiresInDays: num(payload, 'expiresInDays')
			});
		}
		case 'welcome_after_accept': {
			const businessName = str(payload, 'businessName');
			const dashboardUrl = str(payload, 'dashboardUrl');
			if (!businessName || !dashboardUrl) return null;
			return welcomeAfterAcceptEmail({
				businessName,
				dashboardUrl,
				recipientName: str(payload, 'recipientName')
			});
		}
		case 'password_reset': {
			const resetUrl = str(payload, 'resetUrl');
			if (!resetUrl) return null;
			return passwordResetEmail({
				resetUrl,
				expiresInMinutes: num(payload, 'expiresInMinutes')
			});
		}
		case 'password_changed': {
			const loginUrl = str(payload, 'loginUrl') ?? `${siteOrigin()}/auth/login`;
			return passwordChangedEmail({
				loginUrl,
				changedAtLabel: str(payload, 'changedAtLabel')
			});
		}
		case 'ticket_issued': {
			const ticketNumber = str(payload, 'ticketNumber');
			const businessName = str(payload, 'businessName');
			const publicToken = str(payload, 'publicToken');
			if (!ticketNumber || !businessName || !publicToken) return null;
			return ticketIssuedEmail({
				ticketNumber,
				businessName,
				publicToken,
				siteName: str(payload, 'siteName')
			});
		}
		case 'ticket_called': {
			const ticketNumber = str(payload, 'ticketNumber');
			const businessName = str(payload, 'businessName');
			if (!ticketNumber || !businessName) return null;
			return ticketCalledEmail({
				ticketNumber,
				businessName,
				counterLabel: str(payload, 'counterLabel'),
				publicToken: str(payload, 'publicToken')
			});
		}
		case 'almost_your_turn': {
			const ticketNumber = str(payload, 'ticketNumber');
			const businessName = str(payload, 'businessName');
			if (!ticketNumber || !businessName) return null;
			return almostYourTurnEmail({
				ticketNumber,
				businessName,
				publicToken: str(payload, 'publicToken'),
				threshold: num(payload, 'threshold')
			});
		}
		case 'ticket_completed': {
			const ticketNumber = str(payload, 'ticketNumber');
			const businessName = str(payload, 'businessName');
			if (!ticketNumber || !businessName) return null;
			return ticketCompletedEmail({ ticketNumber, businessName });
		}
		case 'appointment_booked': {
			const businessName = str(payload, 'businessName');
			const startsAtLabel = str(payload, 'startsAtLabel');
			if (!businessName || !startsAtLabel) return null;
			return appointmentBookedEmail({
				businessName,
				startsAtLabel,
				endsAtLabel: str(payload, 'endsAtLabel'),
				guestName: str(payload, 'guestName'),
				siteName: str(payload, 'siteName'),
				serviceName: str(payload, 'serviceName')
			});
		}
		case 'appointment_reminder': {
			const businessName = str(payload, 'businessName');
			const startsAtLabel = str(payload, 'startsAtLabel');
			if (!businessName || !startsAtLabel) return null;
			return appointmentReminderEmail({
				businessName,
				startsAtLabel,
				guestName: str(payload, 'guestName'),
				siteName: str(payload, 'siteName'),
				serviceName: str(payload, 'serviceName')
			});
		}
		case 'appointment_cancelled': {
			const businessName = str(payload, 'businessName');
			const startsAtLabel = str(payload, 'startsAtLabel');
			if (!businessName || !startsAtLabel) return null;
			return appointmentCancelledEmail({
				businessName,
				startsAtLabel,
				guestName: str(payload, 'guestName')
			});
		}
		case 'station_account_created': {
			const businessName = str(payload, 'businessName');
			const stationEmail = str(payload, 'stationEmail');
			if (!businessName || !stationEmail) return null;
			return stationAccountCreatedEmail({
				businessName,
				stationEmail,
				temporaryPassword: str(payload, 'temporaryPassword'),
				loginUrl: str(payload, 'loginUrl'),
				deviceName: str(payload, 'deviceName')
			});
		}
		case 'transactional':
		default: {
			const subject = str(payload, 'subject') ?? `Loomline: ${key}`;
			const body =
				str(payload, 'body') ??
				(Array.isArray(payload.bodyLines)
					? (payload.bodyLines as unknown[]).filter((l) => typeof l === 'string').join('\n')
					: undefined) ??
				`Loomline notification (${key}).`;
			const ctaUrl = str(payload, 'ctaUrl');
			const ctaLabel = str(payload, 'ctaLabel');
			return transactionalFallbackEmail({
				subject,
				heading: str(payload, 'heading'),
				bodyLines: body.split(/\n+/).filter(Boolean),
				preheader: str(payload, 'preheader'),
				showHero: payload.showHero === true,
				cta: ctaUrl && ctaLabel ? { url: ctaUrl, label: ctaLabel } : undefined
			});
		}
	}
}
