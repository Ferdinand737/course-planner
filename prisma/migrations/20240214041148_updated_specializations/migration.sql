/*
  Warnings:

  - The values [Major,Minor] on the enum `SpecializationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SpecializationType_new" AS ENUM ('MAJOR', 'MINOR');
ALTER TABLE "Specialization" ALTER COLUMN "type" TYPE "SpecializationType_new" USING ("type"::text::"SpecializationType_new");
ALTER TYPE "SpecializationType" RENAME TO "SpecializationType_old";
ALTER TYPE "SpecializationType_new" RENAME TO "SpecializationType";
DROP TYPE "SpecializationType_old";
COMMIT;
