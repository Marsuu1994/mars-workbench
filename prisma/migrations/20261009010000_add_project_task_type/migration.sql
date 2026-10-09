-- AlterEnum
-- Its own migration: Postgres can't use a new enum value inside the
-- transaction that adds it, so PROJECT must commit before anything uses it.
ALTER TYPE "TaskType" ADD VALUE 'PROJECT';
