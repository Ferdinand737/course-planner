/*
  Warnings:

  - You are about to drop the column `discipline` on the `Degree` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Degree` table. All the data in the column will be lost.
  - You are about to drop the column `degreeId` on the `Requirement` table. All the data in the column will be lost.
  - Added the required column `faculty` to the `Course` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SpecializationType" AS ENUM ('Major', 'Minor');

-- CreateEnum
CREATE TYPE "Faculty" AS ENUM ('SCI', 'ART', 'OTHER');

-- DropForeignKey
ALTER TABLE "Requirement" DROP CONSTRAINT "Requirement_degreeId_fkey";

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "faculty" "Faculty" NOT NULL;

-- AlterTable
ALTER TABLE "Degree" DROP COLUMN "discipline",
DROP COLUMN "name";

-- AlterTable
ALTER TABLE "Requirement" DROP COLUMN "degreeId",
ADD COLUMN     "specializationId" TEXT;

-- CreateTable
CREATE TABLE "Specialization" (
    "id" TEXT NOT NULL,
    "type" "SpecializationType" NOT NULL,
    "discipline" TEXT NOT NULL,

    CONSTRAINT "Specialization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DegreeSpecializations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_DegreeSpecializations_AB_unique" ON "_DegreeSpecializations"("A", "B");

-- CreateIndex
CREATE INDEX "_DegreeSpecializations_B_index" ON "_DegreeSpecializations"("B");

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "Specialization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DegreeSpecializations" ADD CONSTRAINT "_DegreeSpecializations_A_fkey" FOREIGN KEY ("A") REFERENCES "Degree"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DegreeSpecializations" ADD CONSTRAINT "_DegreeSpecializations_B_fkey" FOREIGN KEY ("B") REFERENCES "Specialization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
