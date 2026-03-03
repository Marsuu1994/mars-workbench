-- CreateEnum
CREATE TYPE "PlanMode" AS ENUM ('NORMAL', 'EXTREME');

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "mode" "PlanMode" NOT NULL DEFAULT 'NORMAL';
