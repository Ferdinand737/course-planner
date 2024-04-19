/*
  Warnings:

  - You are about to drop the column `electiveCourseId` on the `Requirement` table. All the data in the column will be lost.
  - You are about to drop the `_CourseRequirements` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `requirementId` to the `PlannedCourse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `alternativeQuery` to the `Requirement` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Requirement` DROP FOREIGN KEY `Requirement_electiveCourseId_fkey`;

-- DropForeignKey
ALTER TABLE `_CourseRequirements` DROP FOREIGN KEY `_CourseRequirements_A_fkey`;

-- DropForeignKey
ALTER TABLE `_CourseRequirements` DROP FOREIGN KEY `_CourseRequirements_B_fkey`;

-- AlterTable
ALTER TABLE `PlannedCourse` ADD COLUMN `requirementId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Requirement` DROP COLUMN `electiveCourseId`,
    ADD COLUMN `alternativeQuery` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `_CourseRequirements`;

-- AddForeignKey
ALTER TABLE `PlannedCourse` ADD CONSTRAINT `PlannedCourse_requirementId_fkey` FOREIGN KEY (`requirementId`) REFERENCES `Requirement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
