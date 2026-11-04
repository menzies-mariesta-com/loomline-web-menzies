ALTER TABLE "voice_profile" ADD COLUMN "announce_repeat_delay_ms" integer DEFAULT 2000 NOT NULL;--> statement-breakpoint
ALTER TABLE "voice_profile" ADD COLUMN "speech_settings" jsonb DEFAULT '{"rate":1,"pitch":1,"volume":1,"localeVoices":{}}'::jsonb NOT NULL;
