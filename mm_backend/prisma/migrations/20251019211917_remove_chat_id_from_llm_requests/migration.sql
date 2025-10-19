/*
  Warnings:

  - You are about to drop the column `chat_id` on the `llm_requests` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."llm_requests" DROP CONSTRAINT "llm_requests_chat_id_fkey";

-- AlterTable
ALTER TABLE "public"."llm_requests" DROP COLUMN "chat_id";
