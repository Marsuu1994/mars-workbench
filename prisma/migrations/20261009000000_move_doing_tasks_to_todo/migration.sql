-- Week model Phase 1: the board drops its Doing column (Todo · Done), so work
-- in progress lives in Todo. Move every DOING task to TODO; doneAt is already
-- null for these rows and planId is untouched.
--
-- The 'DOING' enum value itself stays: Postgres can only drop an enum value by
-- recreating the type, which waits for the Phase 2 cleanup. The app no longer
-- writes it (the move / track / undo schemas accept Todo and Done only).
UPDATE "tasks" SET "status" = 'TODO' WHERE "status" = 'DOING';
