/*
  Warnings:

  - Made the column `start_time` on table `llm_requests` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `llm_requests` required. This step will fail if there are existing NULL values in that column.
  - Made the column `system_prompt` on table `llm_requests` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user_message` on table `llm_requests` required. This step will fail if there are existing NULL values in that column.
  - Made the column `temperature` on table `llm_requests` required. This step will fail if there are existing NULL values in that column.
  - Made the column `max_tokens` on table `llm_requests` required. This step will fail if there are existing NULL values in that column.
  - Made the column `implementation_mode` on table `llm_requests` required. This step will fail if there are existing NULL values in that column.
  - Made the column `run_id` on table `llm_requests` required. This step will fail if there are existing NULL values in that column.
  - Made the column `llm_request_id` on table `llm_responses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `input_tokens` on table `llm_responses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `output_tokens` on table `llm_responses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_tokens` on table `llm_responses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `estimated_cost` on table `llm_responses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `llm_responses` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."llm_requests" ALTER COLUMN "http_method" DROP DEFAULT,
ALTER COLUMN "start_time" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "system_prompt" SET NOT NULL,
ALTER COLUMN "user_message" SET NOT NULL,
ALTER COLUMN "temperature" SET NOT NULL,
ALTER COLUMN "max_tokens" SET NOT NULL,
ALTER COLUMN "implementation_mode" SET NOT NULL,
ALTER COLUMN "run_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."llm_responses" ALTER COLUMN "llm_request_id" SET NOT NULL,
ALTER COLUMN "input_tokens" SET NOT NULL,
ALTER COLUMN "input_tokens" DROP DEFAULT,
ALTER COLUMN "output_tokens" SET NOT NULL,
ALTER COLUMN "output_tokens" DROP DEFAULT,
ALTER COLUMN "total_tokens" SET NOT NULL,
ALTER COLUMN "total_tokens" DROP DEFAULT,
ALTER COLUMN "estimated_cost" SET NOT NULL,
ALTER COLUMN "estimated_cost" DROP DEFAULT,
ALTER COLUMN "created_at" SET NOT NULL;
