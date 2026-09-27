-- Platform config profiles + business image/config FKs
-- Apply via: npm run db:push  (or run this SQL against Neon)

CREATE TABLE IF NOT EXISTS "platform_config_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'Asia/Yangon' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"date_format" text DEFAULT 'MMM d, yyyy' NOT NULL,
	"time_format" text DEFAULT 'HH:mm' NOT NULL,
	"currency" text DEFAULT 'MMK' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "business" ADD COLUMN IF NOT EXISTS "config_id" uuid;
ALTER TABLE "business" ADD COLUMN IF NOT EXISTS "image_url" text;

DO $$ BEGIN
	ALTER TABLE "business"
		ADD CONSTRAINT "business_config_id_platform_config_profile_id_fk"
		FOREIGN KEY ("config_id") REFERENCES "public"."platform_config_profile"("id")
		ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
