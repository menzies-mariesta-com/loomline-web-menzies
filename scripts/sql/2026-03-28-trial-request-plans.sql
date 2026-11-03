-- Trial requests + business plan / trial fields
-- Apply via: npm run db:push  (or run this SQL against Neon)

DO $$ BEGIN
	CREATE TYPE "trial_request_status" AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	CREATE TYPE "trial_duration" AS ENUM ('7d', '2w', '1m');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TYPE "business_status" ADD VALUE IF NOT EXISTS 'inactive';
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TYPE "business_status" ADD VALUE IF NOT EXISTS 'trial_expired';
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "business" ADD COLUMN IF NOT EXISTS "plan_key" text;
ALTER TABLE "business" ADD COLUMN IF NOT EXISTS "service_mode" text;
ALTER TABLE "business" ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamp;
ALTER TABLE "business" ADD COLUMN IF NOT EXISTS "trial_duration" "trial_duration";

CREATE INDEX IF NOT EXISTS "business_trial_ends_at_idx" ON "business" ("trial_ends_at");

CREATE TABLE IF NOT EXISTS "trial_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"business_name" text NOT NULL,
	"business_website" text,
	"email" text NOT NULL,
	"message" text,
	"duration" "trial_duration" NOT NULL,
	"status" "trial_request_status" DEFAULT 'pending' NOT NULL,
	"business_id" uuid,
	"reviewed_by_user_id" text,
	"reviewed_at" timestamp,
	"review_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
	ALTER TABLE "trial_request"
		ADD CONSTRAINT "trial_request_business_id_business_id_fk"
		FOREIGN KEY ("business_id") REFERENCES "public"."business"("id")
		ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "trial_request"
		ADD CONSTRAINT "trial_request_reviewed_by_user_id_user_id_fk"
		FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id")
		ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "trial_request_status_idx" ON "trial_request" ("status");
CREATE INDEX IF NOT EXISTS "trial_request_email_idx" ON "trial_request" ("email");
CREATE INDEX IF NOT EXISTS "trial_request_created_idx" ON "trial_request" ("created_at");
