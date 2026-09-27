import { pgEnum } from 'drizzle-orm/pg-core';

export const membershipRoleEnum = pgEnum('membership_role', [
	'platform_admin',
	'business_owner',
	'manager',
	'counter_agent',
	'guest'
]);

export const membershipStatusEnum = pgEnum('membership_status', [
	'active',
	'invited',
	'suspended',
	'revoked'
]);

export const businessStatusEnum = pgEnum('business_status', [
	'active',
	'suspended',
	'pending'
]);

export const counterStatusEnum = pgEnum('counter_status', [
	'open',
	'closed',
	'paused'
]);

export const queueStrategyEnum = pgEnum('queue_strategy', [
	'fifo',
	'priority',
	'appointment_first'
]);

export const ticketStatusEnum = pgEnum('ticket_status', [
	'issued',
	'waiting',
	'called',
	'serving',
	'held',
	'completed',
	'no_show',
	'cancelled',
	'transferred'
]);

export const ticketSourceEnum = pgEnum('ticket_source', [
	'kiosk',
	'web',
	'qr',
	'appointment',
	'agent',
	'api'
]);

export const ticketEventTypeEnum = pgEnum('ticket_event_type', [
	'created',
	'waiting',
	'called',
	'recalled',
	'serving',
	'held',
	'completed',
	'no_show',
	'cancelled',
	'transferred',
	'redirected',
	'sla_breach',
	'almost_your_turn',
	'sms_sent',
	'telegram_sent',
	'viber_sent',
	'discord_sent',
	'email_sent'
]);

export const departmentStatusEnum = pgEnum('department_status', [
	'active',
	'inactive'
]);

export const destinationTypeEnum = pgEnum('destination_type', [
	'department',
	'counter',
	'external'
]);

export const appointmentStatusEnum = pgEnum('appointment_status', [
	'scheduled',
	'checked_in',
	'converted',
	'cancelled',
	'no_show',
	'completed'
]);

export const displayDeviceTypeEnum = pgEnum('display_device_type', [
	'tv',
	'kiosk',
	'agent'
]);

export const notificationChannelEnum = pgEnum('notification_channel', [
	'sms',
	'telegram',
	'viber',
	'discord',
	'email',
	'push'
]);

export const notificationStatusEnum = pgEnum('notification_status', [
	'pending',
	'sending',
	'sent',
	'failed',
	'cancelled'
]);

export const inviteStatusEnum = pgEnum('invite_status', [
	'pending',
	'accepted',
	'expired',
	'revoked'
]);
