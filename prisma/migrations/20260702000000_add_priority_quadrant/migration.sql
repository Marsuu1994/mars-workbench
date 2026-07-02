-- CreateEnum
CREATE TYPE "PriorityQuadrant" AS ENUM ('DO_FIRST', 'SCHEDULE', 'SQUEEZE_IN', 'MAYBE_LATER');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "quadrant" "PriorityQuadrant";

-- Backfill: every existing AD_HOC task gets the default quadrant (SCHEDULE =
-- Important / Not Urgent). Run scripts/one-time/check-adhoc-states.sql first
-- for a pre-migration snapshot of the rows the statements below touch.
UPDATE "tasks" SET "quadrant" = 'SCHEDULE' WHERE "type" = 'AD_HOC';

-- Backfill: normalize strays — non-DONE ad-hoc tasks still linked to a
-- COMPLETED plan (left behind by pre-matrix plan turnover) go back to the
-- matrix. Going forward, unlinkAdhocTasksFromPlan keeps DONE tasks on their
-- plan and returns non-DONE ones to the matrix as BACKLOG.
UPDATE "tasks" SET "plan_id" = NULL, "status" = 'BACKLOG'
WHERE "type" = 'AD_HOC'
  AND "status" <> 'DONE'
  AND "plan_id" IN (SELECT "id" FROM "plans" WHERE "status" = 'COMPLETED');

-- Backfill: unassigned ad-hoc tasks conform to the new uniform BACKLOG
-- semantics ("not yet on the board"); they were created as TODO/DOING before
-- the priority matrix existed. EXPIRED is included defensively — current sync
-- code never expires AD_HOC tasks, but historic rows may predate that rule.
UPDATE "tasks" SET "status" = 'BACKLOG'
WHERE "type" = 'AD_HOC'
  AND "plan_id" IS NULL
  AND "status" IN ('TODO', 'DOING', 'EXPIRED');
