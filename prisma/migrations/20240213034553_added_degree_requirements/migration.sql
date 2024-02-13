/*
  Warnings:

  - Added the required column `degreeId` to the `CoursePlan` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DegreeType" AS ENUM ('BA', 'BSc');

-- CreateEnum
CREATE TYPE "RequirementType" AS ENUM ('AT_LEAST');

-- AlterTable
ALTER TABLE "CoursePlan" ADD COLUMN     "degreeId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Degree" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "degreeType" "DegreeType" NOT NULL,
    "discipline" TEXT NOT NULL,

    CONSTRAINT "Degree_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL,
    "constraintType" "RequirementType" NOT NULL DEFAULT 'AT_LEAST',
    "credits" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "programSpecific" BOOLEAN NOT NULL DEFAULT false,
    "degreeId" TEXT NOT NULL,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CourseRequirements" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CourseRequirements_AB_unique" ON "_CourseRequirements"("A", "B");

-- CreateIndex
CREATE INDEX "_CourseRequirements_B_index" ON "_CourseRequirements"("B");

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_degreeId_fkey" FOREIGN KEY ("degreeId") REFERENCES "Degree"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePlan" ADD CONSTRAINT "CoursePlan_degreeId_fkey" FOREIGN KEY ("degreeId") REFERENCES "Degree"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseRequirements" ADD CONSTRAINT "_CourseRequirements_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseRequirements" ADD CONSTRAINT "_CourseRequirements_B_fkey" FOREIGN KEY ("B") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
