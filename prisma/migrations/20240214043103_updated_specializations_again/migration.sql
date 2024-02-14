/*
  Warnings:

  - You are about to drop the column `type` on the `Specialization` table. All the data in the column will be lost.
  - Added the required column `specializationType` to the `Specialization` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Specialization" DROP COLUMN "type",
ADD COLUMN     "specializationType" "SpecializationType" NOT NULL;
