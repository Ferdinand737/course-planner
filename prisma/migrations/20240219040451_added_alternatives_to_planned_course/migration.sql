-- AlterEnum
ALTER TYPE "SpecializationType" ADD VALUE 'HONOURS';

-- CreateTable
CREATE TABLE "_PlannedCourseAlternatives" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_PlannedCourseAlternatives_AB_unique" ON "_PlannedCourseAlternatives"("A", "B");

-- CreateIndex
CREATE INDEX "_PlannedCourseAlternatives_B_index" ON "_PlannedCourseAlternatives"("B");

-- AddForeignKey
ALTER TABLE "_PlannedCourseAlternatives" ADD CONSTRAINT "_PlannedCourseAlternatives_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlannedCourseAlternatives" ADD CONSTRAINT "_PlannedCourseAlternatives_B_fkey" FOREIGN KEY ("B") REFERENCES "PlannedCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
