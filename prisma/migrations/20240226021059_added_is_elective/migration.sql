-- CreateEnum
CREATE TYPE "ElectiveType" AS ENUM ('ELEC', 'CHOICE');

-- AlterTable
ALTER TABLE "PlannedCourse" ADD COLUMN     "electiveType" "ElectiveType",
ADD COLUMN     "isElective" BOOLEAN NOT NULL DEFAULT false;
