-- AlterTable
ALTER TABLE "Requirement" ADD COLUMN     "electiveTypeId" TEXT;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_electiveTypeId_fkey" FOREIGN KEY ("electiveTypeId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
