import { teamInviteEmail, managerInviteEmail } from '#lib/server/email/templates/invite';
import {
	sendEmail,
	type SendEmailResult
} from '#lib/server/qms/email';
import { enqueueAndDeliverNotification } from '#lib/server/qms/notify';

export type InviteMailTemplateKey = 'team_invite' | 'owner_invite' | 'manager_invite';

export type DeliverInviteEmailInput = {
	businessId: string;
	to: string;
	templateKey: InviteMailTemplateKey;
	businessName: string;
	inviteUrl: string;
	roleLabel?: string;
};

function buildInviteMessage(input: DeliverInviteEmailInput) {
	const props = {
		businessName: input.businessName,
		inviteUrl: input.inviteUrl,
		roleLabel: input.roleLabel
	};
	if (input.templateKey === 'team_invite') return teamInviteEmail(props);
	return managerInviteEmail(props);
}

/**
 * Enqueue invite mail on the notification outbox and attempt immediate SMTP delivery.
 * Falls back to a direct `sendEmail` if outbox insert/delivery throws.
 */
export async function deliverInviteEmail(
	input: DeliverInviteEmailInput
): Promise<SendEmailResult> {
	const payload = {
		businessName: input.businessName,
		inviteUrl: input.inviteUrl,
		roleLabel: input.roleLabel
	};

	try {
		const { result } = await enqueueAndDeliverNotification({
			businessId: input.businessId,
			channel: 'email',
			toAddress: input.to,
			templateKey: input.templateKey,
			payload
		});
		if (!result.ok) {
			console.error(
				`[invite-delivery] outbox send failed template=${input.templateKey} to=${input.to}: ${result.errorMessage ?? 'unknown'}`
			);
		}
		return result;
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Outbox invite deliver failed';
		console.error(
			`[invite-delivery] outbox threw template=${input.templateKey} to=${input.to}: ${errorMessage}; trying direct SMTP`
		);
		const message = buildInviteMessage(input);
		const direct = await sendEmail({ to: input.to, ...message });
		if (!direct.ok) {
			console.error(
				`[invite-delivery] direct send failed to=${input.to}: ${direct.errorMessage ?? 'unknown'}`
			);
		}
		return direct;
	}
}
