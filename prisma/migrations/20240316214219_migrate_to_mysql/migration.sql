-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Password` (
    `hash` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Password_userId_key`(`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Degree` (
    `id` VARCHAR(191) NOT NULL,
    `degreeType` ENUM('BSc', 'BA') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Specialization` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `specializationType` ENUM('MAJOR', 'MINOR', 'HONOURS') NOT NULL,
    `discipline` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Requirement` (
    `id` VARCHAR(191) NOT NULL,
    `constraintType` ENUM('AT_LEAST') NOT NULL DEFAULT 'AT_LEAST',
    `credits` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `programSpecific` BOOLEAN NOT NULL DEFAULT false,
    `electiveCourseId` VARCHAR(191) NULL,
    `specializationId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CoursePlan` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `numTerms` INTEGER NOT NULL DEFAULT 16,
    `degreeId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlannedCourse` (
    `id` VARCHAR(191) NOT NULL,
    `term` INTEGER NOT NULL,
    `isElective` BOOLEAN NOT NULL DEFAULT false,
    `electiveType` ENUM('ELEC', 'CHOICE') NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `coursePlanId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Course` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isElectivePlaceholder` BOOLEAN NOT NULL DEFAULT false,
    `winterTerm1` BOOLEAN NOT NULL DEFAULT false,
    `winterTerm2` BOOLEAN NOT NULL DEFAULT false,
    `summerTerm1` BOOLEAN NOT NULL DEFAULT false,
    `summerTerm2` BOOLEAN NOT NULL DEFAULT false,
    `durationTerms` INTEGER NOT NULL DEFAULT 1,
    `credits` DOUBLE NOT NULL DEFAULT 3,
    `isHonours` BOOLEAN NOT NULL DEFAULT false,
    `faculty` ENUM('SCI', 'ART', 'OTHER') NOT NULL,
    `preRequisiteString` VARCHAR(191) NULL,
    `preRequisites` JSON NOT NULL,

    UNIQUE INDEX `Course_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_DegreeSpecializations` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_DegreeSpecializations_AB_unique`(`A`, `B`),
    INDEX `_DegreeSpecializations_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CourseRequirements` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_CourseRequirements_AB_unique`(`A`, `B`),
    INDEX `_CourseRequirements_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_PlannedCourseAlternatives` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_PlannedCourseAlternatives_AB_unique`(`A`, `B`),
    INDEX `_PlannedCourseAlternatives_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_EquivalentCourses` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_EquivalentCourses_AB_unique`(`A`, `B`),
    INDEX `_EquivalentCourses_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CoRequisites` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_CoRequisites_AB_unique`(`A`, `B`),
    INDEX `_CoRequisites_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ExcludedCourses` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_ExcludedCourses_AB_unique`(`A`, `B`),
    INDEX `_ExcludedCourses_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Password` ADD CONSTRAINT `Password_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Requirement` ADD CONSTRAINT `Requirement_electiveCourseId_fkey` FOREIGN KEY (`electiveCourseId`) REFERENCES `Course`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Requirement` ADD CONSTRAINT `Requirement_specializationId_fkey` FOREIGN KEY (`specializationId`) REFERENCES `Specialization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CoursePlan` ADD CONSTRAINT `CoursePlan_degreeId_fkey` FOREIGN KEY (`degreeId`) REFERENCES `Degree`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CoursePlan` ADD CONSTRAINT `CoursePlan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlannedCourse` ADD CONSTRAINT `PlannedCourse_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlannedCourse` ADD CONSTRAINT `PlannedCourse_coursePlanId_fkey` FOREIGN KEY (`coursePlanId`) REFERENCES `CoursePlan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DegreeSpecializations` ADD CONSTRAINT `_DegreeSpecializations_A_fkey` FOREIGN KEY (`A`) REFERENCES `Degree`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DegreeSpecializations` ADD CONSTRAINT `_DegreeSpecializations_B_fkey` FOREIGN KEY (`B`) REFERENCES `Specialization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CourseRequirements` ADD CONSTRAINT `_CourseRequirements_A_fkey` FOREIGN KEY (`A`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CourseRequirements` ADD CONSTRAINT `_CourseRequirements_B_fkey` FOREIGN KEY (`B`) REFERENCES `Requirement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PlannedCourseAlternatives` ADD CONSTRAINT `_PlannedCourseAlternatives_A_fkey` FOREIGN KEY (`A`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PlannedCourseAlternatives` ADD CONSTRAINT `_PlannedCourseAlternatives_B_fkey` FOREIGN KEY (`B`) REFERENCES `PlannedCourse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_EquivalentCourses` ADD CONSTRAINT `_EquivalentCourses_A_fkey` FOREIGN KEY (`A`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_EquivalentCourses` ADD CONSTRAINT `_EquivalentCourses_B_fkey` FOREIGN KEY (`B`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CoRequisites` ADD CONSTRAINT `_CoRequisites_A_fkey` FOREIGN KEY (`A`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CoRequisites` ADD CONSTRAINT `_CoRequisites_B_fkey` FOREIGN KEY (`B`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ExcludedCourses` ADD CONSTRAINT `_ExcludedCourses_A_fkey` FOREIGN KEY (`A`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ExcludedCourses` ADD CONSTRAINT `_ExcludedCourses_B_fkey` FOREIGN KEY (`B`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
