ALTER TYPE "membership_role" ADD VALUE IF NOT EXISTS 'business_admin';

CREATE TABLE IF NOT EXISTS "business_console_page" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"path" text NOT NULL,
	"label" text NOT NULL,
	"group_label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "business_user_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "business_user_group_page" (
	"user_group_id" uuid NOT NULL,
	"page_id" uuid NOT NULL,
	CONSTRAINT "business_user_group_page_pkey" PRIMARY KEY("user_group_id","page_id")
);

CREATE TABLE IF NOT EXISTS "membership_user_group" (
	"membership_id" uuid NOT NULL,
	"user_group_id" uuid NOT NULL,
	CONSTRAINT "membership_user_group_pkey" PRIMARY KEY("membership_id","user_group_id")
);

ALTER TABLE "business_console_page" ADD CONSTRAINT "business_console_page_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "business_user_group" ADD CONSTRAINT "business_user_group_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "business_user_group_page" ADD CONSTRAINT "business_user_group_page_user_group_id_business_user_group_id_fk" FOREIGN KEY ("user_group_id") REFERENCES "public"."business_user_group"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "business_user_group_page" ADD CONSTRAINT "business_user_group_page_page_id_business_console_page_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."business_console_page"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "membership_user_group" ADD CONSTRAINT "membership_user_group_membership_id_membership_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."membership"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "membership_user_group" ADD CONSTRAINT "membership_user_group_user_group_id_business_user_group_id_fk" FOREIGN KEY ("user_group_id") REFERENCES "public"."business_user_group"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "business_console_page_business_path_uidx" ON "business_console_page" USING btree ("business_id","path");
CREATE UNIQUE INDEX IF NOT EXISTS "business_user_group_business_name_uidx" ON "business_user_group" USING btree ("business_id","name");
CREATE INDEX IF NOT EXISTS "business_console_page_business_idx" ON "business_console_page" USING btree ("business_id");
CREATE INDEX IF NOT EXISTS "business_user_group_business_idx" ON "business_user_group" USING btree ("business_id");
