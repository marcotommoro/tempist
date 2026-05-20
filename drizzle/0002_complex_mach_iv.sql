ALTER TABLE "calendar_account" ADD COLUMN "watch_webhook_token" text;--> statement-breakpoint
ALTER TABLE "calendar_account" ADD COLUMN "sync_token" text;--> statement-breakpoint
ALTER TABLE "calendar_account" ADD COLUMN "pull_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_event_link" ADD COLUMN "google_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;