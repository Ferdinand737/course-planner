/*
  Warnings:

  - A unique constraint covering the columns `[prerequisiteId]` on the table `Course` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[courseId]` on the table `PreRequisite` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "prerequisiteId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Course_prerequisiteId_key" ON "Course"("prerequisiteId");

-- CreateIndex
CREATE UNIQUE INDEX "PreRequisite_courseId_key" ON "PreRequisite"("courseId");
