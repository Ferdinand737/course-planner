/*
  Warnings:

  - You are about to drop the column `preRequisites` on the `Course` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PrerequisiteGroupType" AS ENUM ('AND', 'OR', 'N_OF');

-- CreateEnum
CREATE TYPE "PrerequisiteType" AS ENUM ('COURSE', 'YEAR', 'CREDITS', 'DEPARTMENT_PERMISSION');

-- AlterTable
ALTER TABLE "Course" DROP COLUMN "preRequisites";

-- CreateTable
CREATE TABLE "PrerequisiteGroup" (
    "id" TEXT NOT NULL,
    "courseId" TEXT,
    "type" "PrerequisiteGroupType" NOT NULL,
    "parentGroupId" TEXT,
    "minRequired" INTEGER,

    CONSTRAINT "PrerequisiteGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoursePrerequisite" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "type" "PrerequisiteType" NOT NULL,
    "value" TEXT NOT NULL,
    "courseId" TEXT,

    CONSTRAINT "CoursePrerequisite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CoRequisites" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CoRequisites_AB_unique" ON "_CoRequisites"("A", "B");

-- CreateIndex
CREATE INDEX "_CoRequisites_B_index" ON "_CoRequisites"("B");

-- AddForeignKey
ALTER TABLE "PrerequisiteGroup" ADD CONSTRAINT "PrerequisiteGroup_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrerequisiteGroup" ADD CONSTRAINT "PrerequisiteGroup_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "PrerequisiteGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePrerequisite" ADD CONSTRAINT "CoursePrerequisite_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PrerequisiteGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePrerequisite" ADD CONSTRAINT "CoursePrerequisite_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoRequisites" ADD CONSTRAINT "_CoRequisites_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoRequisites" ADD CONSTRAINT "_CoRequisites_B_fkey" FOREIGN KEY ("B") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
