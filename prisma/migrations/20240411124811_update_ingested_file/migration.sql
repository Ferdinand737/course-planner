/*
  Warnings:

  - You are about to drop the `DataFiles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `DataFiles`;

-- CreateTable
CREATE TABLE `IngestedFile` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `filePath` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `ingested` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
