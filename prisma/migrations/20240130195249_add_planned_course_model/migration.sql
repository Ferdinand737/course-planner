/*
  Warnings:

  - You are about to drop the `_CoursePlanCourse` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_CoursePlanCourse" DROP CONSTRAINT "_CoursePlanCourse_A_fkey";

-- DropForeignKey
ALTER TABLE "_CoursePlanCourse" DROP CONSTRAINT "_CoursePlanCourse_B_fkey";

-- AlterTable
ALTER TABLE "CoursePlan" ADD COLUMN     "numTerms" INTEGER NOT NULL DEFAULT 8;

-- DropTable
DROP TABLE "_CoursePlanCourse";

-- CreateTable
CREATE TABLE "PlannedCourse" (
    "id" TEXT NOT NULL,
    "term" INTEGER NOT NULL,
    "courseId" TEXT NOT NULL,
    "coursePlanId" TEXT NOT NULL,

    CONSTRAINT "PlannedCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EquivalentCourses" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ExcludedCourses" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_EquivalentCourses_AB_unique" ON "_EquivalentCourses"("A", "B");

-- CreateIndex
CREATE INDEX "_EquivalentCourses_B_index" ON "_EquivalentCourses"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ExcludedCourses_AB_unique" ON "_ExcludedCourses"("A", "B");

-- CreateIndex
CREATE INDEX "_ExcludedCourses_B_index" ON "_ExcludedCourses"("B");

-- AddForeignKey
ALTER TABLE "PlannedCourse" ADD CONSTRAINT "PlannedCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedCourse" ADD CONSTRAINT "PlannedCourse_coursePlanId_fkey" FOREIGN KEY ("coursePlanId") REFERENCES "CoursePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EquivalentCourses" ADD CONSTRAINT "_EquivalentCourses_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EquivalentCourses" ADD CONSTRAINT "_EquivalentCourses_B_fkey" FOREIGN KEY ("B") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExcludedCourses" ADD CONSTRAINT "_ExcludedCourses_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExcludedCourses" ADD CONSTRAINT "_ExcludedCourses_B_fkey" FOREIGN KEY ("B") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
