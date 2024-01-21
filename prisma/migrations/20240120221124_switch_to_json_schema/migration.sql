/*
  Warnings:

  - You are about to drop the column `prerequisiteId` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the `PreRequisite` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PreRequisite" DROP CONSTRAINT "PreRequisite_courseId_fkey";

-- DropForeignKey
ALTER TABLE "PreRequisite" DROP CONSTRAINT "PreRequisite_parentId_fkey";

-- DropIndex
DROP INDEX "Course_prerequisiteId_key";

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "prerequisiteId",
ADD COLUMN     "preRequisites" JSONB NOT NULL DEFAULT '{}';

-- DropTable
DROP TABLE "PreRequisite";

-- DropEnum
DROP TYPE "PreReqType";
