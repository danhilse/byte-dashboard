CREATE TABLE "rate_limit_counters" (
	"policy" text NOT NULL,
	"identifier" text NOT NULL,
	"window_start_ms" bigint NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rate_limit_counters_policy_identifier_window_start_ms_pk" PRIMARY KEY("policy","identifier","window_start_ms")
);
--> statement-breakpoint
CREATE INDEX "idx_rate_limit_counters_expires" ON "rate_limit_counters" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX "idx_rate_limit_counters_identifier" ON "rate_limit_counters" USING btree ("identifier");
