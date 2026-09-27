ALTER TABLE "display_device" ADD COLUMN "agent_user_id" text;--> statement-breakpoint
ALTER TABLE "display_device" ADD CONSTRAINT "display_device_agent_user_id_user_id_fk" FOREIGN KEY ("agent_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "display_device_agent_user_idx" ON "display_device" USING btree ("agent_user_id");
