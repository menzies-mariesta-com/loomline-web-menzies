ALTER TABLE "voice_profile" ADD COLUMN "announce_locales" jsonb DEFAULT '["en"]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "voice_profile" ADD COLUMN "announce_repeat" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
UPDATE "voice_profile" SET "announce_locales" = jsonb_build_array("locale");--> statement-breakpoint
ALTER TABLE "notification_outbox" ALTER COLUMN "channel" TYPE text USING "channel"::text;--> statement-breakpoint
UPDATE "notification_outbox" SET "channel" = 'telegram' WHERE "channel" = 'whatsapp';--> statement-breakpoint
DROP TYPE "public"."notification_channel";--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('sms', 'telegram', 'viber', 'discord', 'email', 'push');--> statement-breakpoint
ALTER TABLE "notification_outbox" ALTER COLUMN "channel" TYPE "public"."notification_channel" USING "channel"::"public"."notification_channel";--> statement-breakpoint
ALTER TABLE "ticket_event" ALTER COLUMN "type" TYPE text USING "type"::text;--> statement-breakpoint
UPDATE "ticket_event" SET "type" = 'telegram_sent' WHERE "type" = 'whatsapp_sent';--> statement-breakpoint
DROP TYPE "public"."ticket_event_type";--> statement-breakpoint
CREATE TYPE "public"."ticket_event_type" AS ENUM('created', 'waiting', 'called', 'recalled', 'serving', 'held', 'completed', 'no_show', 'cancelled', 'transferred', 'redirected', 'sla_breach', 'almost_your_turn', 'sms_sent', 'telegram_sent', 'viber_sent', 'discord_sent', 'email_sent');--> statement-breakpoint
ALTER TABLE "ticket_event" ALTER COLUMN "type" TYPE "public"."ticket_event_type" USING "type"::"public"."ticket_event_type";--> statement-breakpoint
UPDATE "business"
SET "messaging_config" = (
	(COALESCE("messaging_config", '{}'::jsonb) - 'whatsappEnabled')
	|| jsonb_build_object(
		'telegramEnabled', COALESCE(("messaging_config" -> 'whatsappEnabled')::boolean, false),
		'viberEnabled', false,
		'discordEnabled', false
	)
)
WHERE "messaging_config" ? 'whatsappEnabled';
