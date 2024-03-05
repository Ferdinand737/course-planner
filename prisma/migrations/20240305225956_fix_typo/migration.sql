/*
  Warnings:

  - You are about to drop the column `isElectivePlacholder` on the `Course` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Course" DROP COLUMN "isElectivePlacholder",
ADD COLUMN     "isElectivePlaceholder" BOOLEAN NOT NULL DEFAULT false;
