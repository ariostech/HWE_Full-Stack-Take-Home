CREATE TABLE "idempotency_keys" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"response" jsonb NOT NULL,
	"status_code" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"value" numeric(18, 6) NOT NULL,
	"unit" varchar(20) DEFAULT 'kg' NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"source" varchar(50) DEFAULT 'sensor' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"batch_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"processed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"location" varchar(500) NOT NULL,
	"emission_limit" numeric(18, 6) NOT NULL,
	"total_emissions_to_date" numeric(18, 6) DEFAULT '0' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_measurements_site_id" ON "measurements" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "idx_measurements_timestamp" ON "measurements" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_measurements_batch_id" ON "measurements" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "idx_measurements_site_timestamp" ON "measurements" USING btree ("site_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_outbox_unprocessed" ON "outbox_events" USING btree ("processed","created_at");