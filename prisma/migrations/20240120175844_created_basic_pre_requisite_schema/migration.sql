/*
  Warnings:

  - You are about to drop the column `description` on the `CoursePlan` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PreReqType" AS ENUM ('YEAR_STANDING', 'COURSE', 'AND', 'OR');

-- AlterTable
ALTER TABLE "CoursePlan" DROP COLUMN "description";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "winterTerm1" BOOLEAN NOT NULL DEFAULT false,
    "winterTerm2" BOOLEAN NOT NULL DEFAULT false,
    "summerTerm1" BOOLEAN NOT NULL DEFAULT false,
    "summerTerm2" BOOLEAN NOT NULL DEFAULT false,
    "durationTerms" INTEGER NOT NULL DEFAULT 1,
    "credits" INTEGER NOT NULL DEFAULT 3,
    "isHonours" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreRequisite" (
    "id" TEXT NOT NULL,
    "type" "PreReqType" NOT NULL DEFAULT 'COURSE',
    "courseId" TEXT,
    "yearStanding" INTEGER,
    "parentId" TEXT,

    CONSTRAINT "PreRequisite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CoursePlanCourse" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CoursePlanCourse_AB_unique" ON "_CoursePlanCourse"("A", "B");

-- CreateIndex
CREATE INDEX "_CoursePlanCourse_B_index" ON "_CoursePlanCourse"("B");

-- AddForeignKey
ALTER TABLE "PreRequisite" ADD CONSTRAINT "PreRequisite_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreRequisite" ADD CONSTRAINT "PreRequisite_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PreRequisite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoursePlanCourse" ADD CONSTRAINT "_CoursePlanCourse_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoursePlanCourse" ADD CONSTRAINT "_CoursePlanCourse_B_fkey" FOREIGN KEY ("B") REFERENCES "CoursePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
