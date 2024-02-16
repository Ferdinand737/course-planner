/*
  Warnings:

  - Added the required column `name` to the `Specialization` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Specialization" ADD COLUMN     "name" TEXT NOT NULL;
