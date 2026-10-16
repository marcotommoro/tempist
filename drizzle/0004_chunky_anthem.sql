CREATE TABLE "project_fee_payment" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"due_on" date NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "annual_fee_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "annual_fee_next_due_on" date;--> statement-breakpoint
ALTER TABLE "project_fee_payment" ADD CONSTRAINT "project_fee_payment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_fee_payment" ADD CONSTRAINT "project_fee_payment_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_fee_payment_org_paid_idx" ON "project_fee_payment" USING btree ("organization_id","paid_at");--> statement-breakpoint
CREATE INDEX "project_fee_payment_project_idx" ON "project_fee_payment" USING btree ("project_id");