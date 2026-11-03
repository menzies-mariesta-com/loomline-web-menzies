/**
 * Soft Wash email system entry.
 * Prefer importing scenario builders or `resolveEmailTemplate` from
 * `#lib/server/email/templates`. Transport stays in `#lib/server/qms/email`.
 */
export {
	emailAssetUrl,
	emailBrand,
	escapeHtml,
	siteOrigin
} from '#lib/server/email/brand';
export {
	resolveEmailTemplate,
	managerInviteEmail,
	teamInviteEmail,
	inviteReminderEmail,
	welcomeAfterAcceptEmail,
	passwordResetEmail,
	passwordChangedEmail,
	trialOtpEmail,
	trialRequestNotifyEmail,
	ticketIssuedEmail,
	ticketCalledEmail,
	almostYourTurnEmail,
	ticketCompletedEmail,
	appointmentBookedEmail,
	appointmentReminderEmail,
	appointmentCancelledEmail,
	stationAccountCreatedEmail,
	transactionalFallbackEmail,
	renderEmailLayout,
	textFooter
} from '#lib/server/email/templates';
export type { EmailMessage, EmailCta } from '#lib/server/email/templates';
