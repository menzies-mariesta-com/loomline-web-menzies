import { relations } from 'drizzle-orm';
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { user } from '../auth.schema';
import {
	appointmentStatusEnum,
	businessStatusEnum,
	counterStatusEnum,
	departmentStatusEnum,
	destinationTypeEnum,
	displayDeviceTypeEnum,
	inviteStatusEnum,
	membershipRoleEnum,
	membershipStatusEnum,
	notificationChannelEnum,
	notificationStatusEnum,
	queueStrategyEnum,
	ticketEventTypeEnum,
	ticketSourceEnum,
	ticketStatusEnum
} from './enums';

export * from './enums';

const timestamps = {
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
};

export const industryPack = pgTable('industry_pack', {
	id: uuid('id').primaryKey().defaultRandom(),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	description: text('description'),
	version: text('version').notNull().default('1.0.0'),
	config: jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
	...timestamps
});

/** Reusable org defaults (timezone, locale, formats). UI label: Config. */
export const platformConfigProfile = pgTable('platform_config_profile', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	timezone: text('timezone').notNull().default('Asia/Yangon'),
	locale: text('locale').notNull().default('en'),
	dateFormat: text('date_format').notNull().default('MMM d, yyyy'),
	timeFormat: text('time_format').notNull().default('HH:mm'),
	currency: text('currency').notNull().default('MMK'),
	...timestamps
});

export const business = pgTable(
	'business',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: text('name').notNull(),
		slug: text('slug').notNull(),
		timezone: text('timezone').notNull().default('Asia/Yangon'),
		localeDefault: text('locale_default').notNull().default('en'),
		status: businessStatusEnum('status').notNull().default('active'),
		industryPackId: uuid('industry_pack_id').references(() => industryPack.id, {
			onDelete: 'set null'
		}),
		configId: uuid('config_id').references(() => platformConfigProfile.id, {
			onDelete: 'set null'
		}),
		imageUrl: text('image_url'),
		branding: jsonb('branding').$type<Record<string, unknown>>().notNull().default({}),
		featureFlags: jsonb('feature_flags').$type<Record<string, unknown>>().notNull().default({}),
		messagingConfig: jsonb('messaging_config').$type<Record<string, unknown>>().notNull().default({}),
		publicSignupEnabled: boolean('public_signup_enabled').notNull().default(false),
		inviteCode: text('invite_code'),
		...timestamps
	},
	(t) => [uniqueIndex('business_slug_uidx').on(t.slug), index('business_status_idx').on(t.status)]
);

export const membership = pgTable(
	'membership',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		businessId: uuid('business_id').references(() => business.id, { onDelete: 'cascade' }),
		role: membershipRoleEnum('role').notNull(),
		status: membershipStatusEnum('status').notNull().default('active'),
		...timestamps
	},
	(t) => [
		index('membership_user_idx').on(t.userId),
		index('membership_business_idx').on(t.businessId),
		uniqueIndex('membership_user_business_role_uidx').on(t.userId, t.businessId, t.role)
	]
);

export const invite = pgTable(
	'invite',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		businessId: uuid('business_id')
			.notNull()
			.references(() => business.id, { onDelete: 'cascade' }),
		email: text('email').notNull(),
		role: membershipRoleEnum('role').notNull(),
		token: text('token').notNull().unique(),
		status: inviteStatusEnum('status').notNull().default('pending'),
		invitedByUserId: text('invited_by_user_id').references(() => user.id, {
			onDelete: 'set null'
		}),
		expiresAt: timestamp('expires_at').notNull(),
		acceptedAt: timestamp('accepted_at'),
		...timestamps
	},
	(t) => [index('invite_business_idx').on(t.businessId), index('invite_email_idx').on(t.email)]
);

export const site = pgTable(
	'site',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		businessId: uuid('business_id')
			.notNull()
			.references(() => business.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		slug: text('slug').notNull(),
		address: text('address'),
		hours: jsonb('hours').$type<Record<string, unknown>>().notNull().default({}),
		isOpen: boolean('is_open').notNull().default(true),
		...timestamps
	},
	(t) => [
		uniqueIndex('site_business_slug_uidx').on(t.businessId, t.slug),
		index('site_business_idx').on(t.businessId)
	]
);

export const membershipSite = pgTable(
	'membership_site',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		membershipId: uuid('membership_id')
			.notNull()
			.references(() => membership.id, { onDelete: 'cascade' }),
		siteId: uuid('site_id')
			.notNull()
			.references(() => site.id, { onDelete: 'cascade' }),
		...timestamps
	},
	(t) => [uniqueIndex('membership_site_uidx').on(t.membershipId, t.siteId)]
);

export const department = pgTable(
	'department',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		businessId: uuid('business_id')
			.notNull()
			.references(() => business.id, { onDelete: 'cascade' }),
		siteId: uuid('site_id')
			.notNull()
			.references(() => site.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		code: text('code').notNull(),
		sortOrder: integer('sort_order').notNull().default(0),
		status: departmentStatusEnum('status').notNull().default('active'),
		...timestamps
	},
	(t) => [
		uniqueIndex('department_site_code_uidx').on(t.siteId, t.code),
		index('department_business_idx').on(t.businessId),
		index('department_site_idx').on(t.siteId)
	]
);

export const destination = pgTable(
	'destination',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		businessId: uuid('business_id')
			.notNull()
			.references(() => business.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		type: destinationTypeEnum('type').notNull(),
		targetDepartmentId: uuid('target_department_id').references(() => department.id, {
			onDelete: 'set null'
		}),
		targetCounterId: uuid('target_counter_id').references(() => counter.id, {
			onDelete: 'set null'
		}),
		externalLabel: text('external_label'),
		active: boolean('active').notNull().default(true),
		...timestamps
	},
	(t) => [index('destination_business_idx').on(t.businessId)]
);

export const serviceTimeline = pgTable(
	'service_timeline',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		businessId: uuid('business_id')
			.notNull()
			.references(() => business.id, { onDelete: 'cascade' }),
		serviceId: uuid('service_id')
			.notNull()
			.references(() => service.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		isActive: boolean('is_active').notNull().default(true),
		...timestamps
	},
	(t) => [
		index('service_timeline_business_idx').on(t.businessId),
		index('service_timeline_service_idx').on(t.serviceId)
	]
);

export const serviceTimelineStep = pgTable(
	'service_timeline_step',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		timelineId: uuid('timeline_id')
			.notNull()
			.references(() => serviceTimeline.id, { onDelete: 'cascade' }),
		stepOrder: integer('step_order').notNull(),
		destinationId: uuid('destination_id')
			.notNull()
			.references(() => destination.id, { onDelete: 'restrict' }),
		slaMinutes: integer('sla_minutes'),
		...timestamps
	},
	(t) => [
		uniqueIndex('service_timeline_step_order_uidx').on(t.timelineId, t.stepOrder),
		index('service_timeline_step_timeline_idx').on(t.timelineId)
	]
);

export const service = pgTable(
	'service',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		businessId: uuid('business_id')
			.notNull()
			.references(() => business.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		codePrefix: text('code_prefix').notNull().default('A'),
		estimatedMinutes: integer('estimated_minutes').notNull().default(10),
		priorityWeight: integer('priority_weight').notNull().default(0),
		industryTags: jsonb('industry_tags').$type<string[]>().notNull().default([]),
		isActive: boolean('is_active').notNull().default(true),
		...timestamps
	},
	(t) => [index('service_business_idx').on(t.businessId)]
);

export const counter = pgTable(
	'counter',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		businessId: uuid('business_id')
			.notNull()
			.references(() => business.id, { onDelete: 'cascade' }),
		siteId: uuid('site_id')
			.notNull()
			.references(() => site.id, { onDelete: 'cascade' }),
		departmentId: uuid('department_id').references(() => department.id, {
			onDelete: 'restrict'
		}),
		label: text('label').notNull(),
		status: counterStatusEnum('status').notNull().default('closed'),
		assignedAgentUserId: text('assigned_agent_user_id').references(() => user.id, {
			onDelete: 'set null'
		}),
		...timestamps
	},
	(t) => [
		index('counter_site_idx').on(t.siteId),
		index('counter_business_idx').on(t.businessId),
		index('counter_department_idx').on(t.departmentId)
	]
);

export const counterService = pgTable(
	'counter_service',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		counterId: uuid('counter_id')
			.notNull()
			.references(() => counter.id, { onDelete: 'cascade' }),
		serviceId: uuid('service_id')
			.notNull()
			.references(() => service.id, { onDelete: 'cascade' }),
		...timestamps
	},
	(t) => [uniqueIndex('counter_service_uidx').on(t.counterId, t.serviceId)]
);

export const queue = pgTable(
	'queue',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		businessId: uuid('business_id')
			.notNull()
			.references(() => business.id, { onDelete: 'cascade' }),
		siteId: uuid('site_id')
			.notNull()
			.references(() => site.id, { onDelete: 'cascade' }),
		serviceId: uuid('service_id')
			.notNull()
			.references(() => service.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		strategy: queueStrategyEnum('strategy').notNull().default('fifo'),
		maxWaiting: integer('max_waiting').notNull().default(200),
		slaMinutes: integer('sla_minutes').notNull().default(30),
		almostYourTurnThreshold: integer('almost_your_turn_threshold').notNull().default(3),
		transferAllowed: boolean('transfer_allowed').notNull().default(true),
		isActive: boolean('is_active').notNull().default(true),
		...timestamps
	},
	(t) => [
		index('queue_site_idx').on(t.siteId),
		index('queue_business_idx').on(t.businessId),
		index('queue_service_idx').on(t.serviceId)
	]
);

export const ticket = pgTable(
	'ticket',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		businessId: uuid('business_id')
			.notNull()
			.references(() => business.id, { onDelete: 'cascade' }),
		siteId: uuid('site_id')
			.notNull()
			.references(() => site.id, { onDelete: 'cascade' }),
		queueId: uuid('queue_id')
			.notNull()
			.references(() => queue.id, { onDelete: 'restrict' }),
		counterId: uuid('counter_id').references(() => counter.id, { onDelete: 'set null' }),
		destinationId: uuid('destination_id').references(() => destination.id, {
			onDelete: 'set null'
		}),
		timelineStepId: uuid('timeline_step_id').references(() => serviceTimelineStep.id, {
			onDelete: 'set null'
		}),
		guestUserId: text('guest_user_id').references(() => user.id, { onDelete: 'set null' }),
		number: text('number').notNull(),
		sequence: integer('sequence').notNull(),
		status: ticketStatusEnum('status').notNull().default('waiting'),
		source: ticketSourceEnum('source').notNull().default('kiosk'),
		priority: integer('priority').notNull().default(0),
		phone: text('phone'),
		email: text('email'),
		publicToken: text('public_token').notNull().unique(),
		calledAt: timestamp('called_at'),
		servedAt: timestamp('served_at'),
		completedAt: timestamp('completed_at'),
		holdUntil: timestamp('hold_until'),
		appointmentId: uuid('appointment_id'),
		...timestamps
	},
	(t) => [
		index('ticket_queue_status_idx').on(t.queueId, t.status),
		index('ticket_business_idx').on(t.businessId),
		index('ticket_public_token_idx').on(t.publicToken),
		uniqueIndex('ticket_queue_day_seq_uidx').on(t.queueId, t.number)
	]
);

export const ticketEvent = pgTable(
	'ticket_event',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		ticketId: uuid('ticket_id')
			.notNull()
			.references(() => ticket.id, { onDelete: 'cascade' }),
		businessId: uuid('business_id')
			.notNull()
			.references(() => business.id, { onDelete: 'cascade' }),
		type: ticketEventTypeEnum('type').notNull(),
		actorUserId: text('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
		payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [
		index('ticket_event_ticket_idx').on(t.ticketId),
		index('ticket_event_business_idx').on(t.businessId)
	]
);

export const transfer = pgTable(
	'transfer',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		ticketId: uuid('ticket_id')
			.notNull()
			.references(() => ticket.id, { onDelete: 'cascade' }),
		businessId: uuid('business_id')
			.notNull()
			.references(() => business.id, { onDelete: 'cascade' }),
		fromQueueId: uuid('from_queue_id')
			.notNull()
			.references(() => queue.id, { onDelete: 'restrict' }),
		toQueueId: uuid('to_queue_id')
			.notNull()
			.references(() => queue.id, { onDelete: 'restrict' }),
		fromCounterId: uuid('from_counter_id').references(() => counter.id, {
			onDelete: 'set null'
		}),
		toCounterId: uuid('to_counter_id').references(() => counter.id, { onDelete: 'set null' }),
		reason: text('reason'),
		actorUserId: text('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [index('transfer_ticket_idx').on(t.ticketId)]
);

export const appointment = pgTable(
	'appointment',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		businessId: uuid('business_id')
			.notNull()
			.references(() => business.id, { onDelete: 'cascade' }),
		siteId: uuid('site_id')
			.notNull()
			.references(() => site.id, { onDelete: 'cascade' }),
		serviceId: uuid('service_id')
			.notNull()
			.references(() => service.id, { onDelete: 'restrict' }),
		guestUserId: text('guest_user_id').references(() => user.id, { onDelete: 'set null' }),
		guestName: text('guest_name'),
		phone: text('phone'),
		email: text('email'),
		startsAt: timestamp('starts_at').notNull(),
		endsAt: timestamp('ends_at').notNull(),
		checkInWindowMinutes: integer('check_in_window_minutes').notNull().default(30),
		status: appointmentStatusEnum('status').notNull().default('scheduled'),
		ticketId: uuid('ticket_id').references(() => ticket.id, { onDelete: 'set null' }),
		...timestamps
	},
	(t) => [
		index('appointment_business_idx').on(t.businessId),
		index('appointment_site_starts_idx').on(t.siteId, t.startsAt)
	]
);

export const displayDevice = pgTable(
	'display_device',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		businessId: uuid('business_id')
			.notNull()
			.references(() => business.id, { onDelete: 'cascade' }),
		siteId: uuid('site_id')
			.notNull()
			.references(() => site.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		type: displayDeviceTypeEnum('type').notNull().default('tv'),
		pairingCode: text('pairing_code').notNull().unique(),
		/** Station login user for agent desks (counter_agent). Null for TV/kiosk. */
		agentUserId: text('agent_user_id').references(() => user.id, { onDelete: 'set null' }),
		boundQueueIds: jsonb('bound_queue_ids').$type<string[]>().notNull().default([]),
		boundCounterIds: jsonb('bound_counter_ids').$type<string[]>().notNull().default([]),
		isActive: boolean('is_active').notNull().default(true),
		...timestamps
	},
	(t) => [
		index('display_device_site_idx').on(t.siteId),
		index('display_device_agent_user_idx').on(t.agentUserId)
	]
);

export const voiceProfile = pgTable(
	'voice_profile',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		businessId: uuid('business_id')
			.notNull()
			.references(() => business.id, { onDelete: 'cascade' }),
		/** Primary / fallback locale (first of announceLocales). */
		locale: text('locale').notNull().default('en'),
		/** Ordered locales spoken per ticket call (multi-language announce). */
		announceLocales: jsonb('announce_locales').$type<string[]>().notNull().default(['en']),
		/** How many times to run the full language sequence per call. */
		announceRepeat: integer('announce_repeat').notNull().default(1),
		ttsVoiceId: text('tts_voice_id'),
		templates: jsonb('templates')
			.$type<Record<string, string>>()
			.notNull()
			.default({
				now_serving: 'Now serving {number} at counter {counter}'
			}),
		isDefault: boolean('is_default').notNull().default(false),
		...timestamps
	},
	(t) => [index('voice_profile_business_idx').on(t.businessId)]
);

export const notificationOutbox = pgTable(
	'notification_outbox',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		businessId: uuid('business_id')
			.notNull()
			.references(() => business.id, { onDelete: 'cascade' }),
		channel: notificationChannelEnum('channel').notNull(),
		toAddress: text('to_address').notNull(),
		templateKey: text('template_key').notNull(),
		payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
		status: notificationStatusEnum('status').notNull().default('pending'),
		providerMessageId: text('provider_message_id'),
		errorMessage: text('error_message'),
		attempts: integer('attempts').notNull().default(0),
		scheduledAt: timestamp('scheduled_at').defaultNow().notNull(),
		sentAt: timestamp('sent_at'),
		...timestamps
	},
	(t) => [
		index('notification_outbox_status_idx').on(t.status, t.scheduledAt),
		index('notification_outbox_business_idx').on(t.businessId)
	]
);

export const auditLog = pgTable(
	'audit_log',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		actorUserId: text('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
		businessId: uuid('business_id').references(() => business.id, { onDelete: 'set null' }),
		action: text('action').notNull(),
		entityType: text('entity_type'),
		entityId: text('entity_id'),
		payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [index('audit_log_business_idx').on(t.businessId)]
);

export const platformAdmin = pgTable(
	'platform_admin',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.unique()
			.references(() => user.id, { onDelete: 'cascade' }),
		...timestamps
	},
	(t) => [index('platform_admin_user_idx').on(t.userId)]
);

// Relations
export const platformConfigProfileRelations = relations(platformConfigProfile, ({ many }) => ({
	businesses: many(business)
}));

export const industryPackRelations = relations(industryPack, ({ many }) => ({
	businesses: many(business)
}));

export const businessRelations = relations(business, ({ one, many }) => ({
	industryPack: one(industryPack, {
		fields: [business.industryPackId],
		references: [industryPack.id]
	}),
	config: one(platformConfigProfile, {
		fields: [business.configId],
		references: [platformConfigProfile.id]
	}),
	sites: many(site),
	memberships: many(membership),
	services: many(service),
	queues: many(queue),
	departments: many(department),
	destinations: many(destination)
}));

export const membershipRelations = relations(membership, ({ one, many }) => ({
	user: one(user, { fields: [membership.userId], references: [user.id] }),
	business: one(business, { fields: [membership.businessId], references: [business.id] }),
	sites: many(membershipSite)
}));

export const siteRelations = relations(site, ({ one, many }) => ({
	business: one(business, { fields: [site.businessId], references: [business.id] }),
	counters: many(counter),
	queues: many(queue),
	departments: many(department)
}));

export const departmentRelations = relations(department, ({ one, many }) => ({
	business: one(business, { fields: [department.businessId], references: [business.id] }),
	site: one(site, { fields: [department.siteId], references: [site.id] }),
	counters: many(counter)
}));

export const destinationRelations = relations(destination, ({ one }) => ({
	business: one(business, { fields: [destination.businessId], references: [business.id] }),
	targetDepartment: one(department, {
		fields: [destination.targetDepartmentId],
		references: [department.id]
	}),
	targetCounter: one(counter, {
		fields: [destination.targetCounterId],
		references: [counter.id]
	})
}));

export const serviceTimelineRelations = relations(serviceTimeline, ({ one, many }) => ({
	business: one(business, { fields: [serviceTimeline.businessId], references: [business.id] }),
	service: one(service, { fields: [serviceTimeline.serviceId], references: [service.id] }),
	steps: many(serviceTimelineStep)
}));

export const serviceTimelineStepRelations = relations(serviceTimelineStep, ({ one }) => ({
	timeline: one(serviceTimeline, {
		fields: [serviceTimelineStep.timelineId],
		references: [serviceTimeline.id]
	}),
	destination: one(destination, {
		fields: [serviceTimelineStep.destinationId],
		references: [destination.id]
	})
}));

export const counterRelations = relations(counter, ({ one, many }) => ({
	business: one(business, { fields: [counter.businessId], references: [business.id] }),
	site: one(site, { fields: [counter.siteId], references: [site.id] }),
	department: one(department, { fields: [counter.departmentId], references: [department.id] }),
	services: many(counterService)
}));

export const counterServiceRelations = relations(counterService, ({ one }) => ({
	counter: one(counter, { fields: [counterService.counterId], references: [counter.id] }),
	service: one(service, { fields: [counterService.serviceId], references: [service.id] })
}));

export const queueRelations = relations(queue, ({ one, many }) => ({
	business: one(business, { fields: [queue.businessId], references: [business.id] }),
	site: one(site, { fields: [queue.siteId], references: [site.id] }),
	service: one(service, { fields: [queue.serviceId], references: [service.id] }),
	tickets: many(ticket)
}));

export const ticketRelations = relations(ticket, ({ one, many }) => ({
	queue: one(queue, { fields: [ticket.queueId], references: [queue.id] }),
	counter: one(counter, { fields: [ticket.counterId], references: [counter.id] }),
	destination: one(destination, { fields: [ticket.destinationId], references: [destination.id] }),
	timelineStep: one(serviceTimelineStep, {
		fields: [ticket.timelineStepId],
		references: [serviceTimelineStep.id]
	}),
	events: many(ticketEvent),
	business: one(business, { fields: [ticket.businessId], references: [business.id] })
}));

export const ticketEventRelations = relations(ticketEvent, ({ one }) => ({
	ticket: one(ticket, { fields: [ticketEvent.ticketId], references: [ticket.id] })
}));
