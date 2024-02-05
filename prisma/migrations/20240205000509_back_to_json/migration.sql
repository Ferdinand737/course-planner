/*
  Warnings:

  - You are about to drop the `CoursePrerequisite` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PrerequisiteGroup` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CoursePrerequisite" DROP CONSTRAINT "CoursePrerequisite_courseId_fkey";

-- DropForeignKey
ALTER TABLE "CoursePrerequisite" DROP CONSTRAINT "CoursePrerequisite_groupId_fkey";

-- DropForeignKey
ALTER TABLE "PrerequisiteGroup" DROP CONSTRAINT "PrerequisiteGroup_courseId_fkey";

-- DropForeignKey
ALTER TABLE "PrerequisiteGroup" DROP CONSTRAINT "PrerequisiteGroup_parentGroupId_fkey";

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "preRequisites" JSONB NOT NULL DEFAULT '{}';

-- DropTable
DROP TABLE "CoursePrerequisite";

-- DropTable
DROP TABLE "PrerequisiteGroup";

-- DropEnum
DROP TYPE "PrerequisiteGroupType";

-- DropEnum
DROP TYPE "PrerequisiteType";
