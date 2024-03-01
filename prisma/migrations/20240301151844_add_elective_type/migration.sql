/*
  Warnings:

  - You are about to drop the column `electiveTypeId` on the `Requirement` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Requirement" DROP CONSTRAINT "Requirement_electiveTypeId_fkey";

-- AlterTable
ALTER TABLE "Requirement" DROP COLUMN "electiveTypeId",
ADD COLUMN     "electiveCourseId" TEXT;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_electiveCourseId_fkey" FOREIGN KEY ("electiveCourseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
