-- Add user_id to tasks (nullable for now). Existing rows are backfilled by a
-- one-time manual script (scripts/one-time/backfill-user.sql); a follow-up
-- migration tightens user_id to NOT NULL once the backfill has run.
ALTER TABLE "tasks" ADD COLUMN "user_id" UUID;

-- CreateIndex
CREATE INDEX "idx_tasks_user_id_status" ON "tasks"("user_id", "status");
