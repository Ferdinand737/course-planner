/*
  Warnings:

  - You are about to drop the `_PlannedCourseAlternatives` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_PlannedCourseAlternatives` DROP FOREIGN KEY `_PlannedCourseAlternatives_A_fkey`;

-- DropForeignKey
ALTER TABLE `_PlannedCourseAlternatives` DROP FOREIGN KEY `_PlannedCourseAlternatives_B_fkey`;

-- DropTable
DROP TABLE `_PlannedCourseAlternatives`;
