-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'DRAFT_PLAN');

-- AlterTable
ALTER TABLE "chats" ADD COLUMN     "plan_id" UUID,
ALTER COLUMN "title" DROP NOT NULL;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "type" "MessageType" NOT NULL DEFAULT 'TEXT';

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
