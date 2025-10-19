/*
  Warnings:

  - You are about to drop the column `from_user` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `to_user` on the `messages` table. All the data in the column will be lost.
  - Added the required column `from_user_id` to the `messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `to_user_id` to the `messages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."messages" DROP COLUMN "from_user",
DROP COLUMN "to_user",
ADD COLUMN     "from_user_id" INTEGER NOT NULL,
ADD COLUMN     "to_user_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
