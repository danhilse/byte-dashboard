ALTER TABLE "notes" DROP CONSTRAINT "one_parent_only";--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "one_parent_only" CHECK ((
        (CASE WHEN "notes"."workflow_execution_id" IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN "notes"."contact_id" IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN "notes"."task_id" IS NOT NULL THEN 1 ELSE 0 END)
      ) = 1);