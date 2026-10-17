-- Drop the in-app AI chat's tables: AI planning goes through Claude over MCP,
-- and no code reads or writes chats / messages. Their rows are deleted.

-- DropForeignKey
ALTER TABLE "chats" DROP CONSTRAINT "chats_plan_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_chat_id_fkey";

-- DropTable
DROP TABLE "chats";

-- DropTable
DROP TABLE "messages";

-- DropEnum
DROP TYPE "MessageRole";

-- DropEnum
DROP TYPE "MessageType";
