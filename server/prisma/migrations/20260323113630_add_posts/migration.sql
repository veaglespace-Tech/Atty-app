/*
  Warnings:

  - You are about to drop the `verificationsession` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[orgAdminId]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `organization` ADD COLUMN `orgAdminId` INTEGER NULL;

-- DropTable
DROP TABLE `verificationsession`;

-- CreateTable
CREATE TABLE `archieve_org` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orgId` INTEGER NULL,
    `name` VARCHAR(191) NULL,
    `organizationCode` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `phoneCountryCode` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `attendanceRadius` INTEGER NULL,
    `subscriptionStatus` VARCHAR(191) NULL,
    `subscriptionExpiry` DATETIME(3) NULL,
    `planId` INTEGER NULL,
    `subscriptionId` INTEGER NULL,
    `isActive` BOOLEAN NULL,
    `isBlocked` BOOLEAN NULL,
    `deletedAt` DATETIME(3) NULL,
    `archivedById` INTEGER NULL,
    `archiveReason` VARCHAR(191) NOT NULL DEFAULT '',
    `archivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `originalCreatedAt` DATETIME(3) NULL,
    `originalUpdatedAt` DATETIME(3) NULL,
    `metadata` JSON NULL,

    INDEX `archieve_org_orgId_idx`(`orgId`),
    INDEX `archieve_org_organizationCode_idx`(`organizationCode`),
    INDEX `archieve_org_email_idx`(`email`),
    INDEX `archieve_org_archivedAt_idx`(`archivedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `archieve_user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `orgId` INTEGER NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `mobile` VARCHAR(191) NULL,
    `mobileCountryCode` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `role` VARCHAR(191) NULL,
    `permissions` JSON NULL,
    `status` VARCHAR(191) NULL,
    `isActive` BOOLEAN NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdById` INTEGER NULL,
    `deletedAt` DATETIME(3) NULL,
    `archivedById` INTEGER NULL,
    `archiveReason` VARCHAR(191) NOT NULL DEFAULT '',
    `archivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `originalCreatedAt` DATETIME(3) NULL,
    `originalUpdatedAt` DATETIME(3) NULL,
    `metadata` JSON NULL,

    INDEX `archieve_user_userId_idx`(`userId`),
    INDEX `archieve_user_orgId_role_idx`(`orgId`, `role`),
    INDEX `archieve_user_email_idx`(`email`),
    INDEX `archieve_user_archivedAt_idx`(`archivedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `free_trial_claim` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orgEmail` VARCHAR(191) NOT NULL,
    `adminEmail` VARCHAR(191) NOT NULL,
    `adminPhone` VARCHAR(191) NOT NULL,
    `planCode` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `claimedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `orgName` VARCHAR(191) NULL,
    `adminName` VARCHAR(191) NULL,

    UNIQUE INDEX `free_trial_claim_orgEmail_key`(`orgEmail`),
    UNIQUE INDEX `free_trial_claim_adminEmail_key`(`adminEmail`),
    UNIQUE INDEX `free_trial_claim_adminPhone_key`(`adminPhone`),
    INDEX `free_trial_claim_claimedAt_idx`(`claimedAt`),
    INDEX `free_trial_claim_endDate_idx`(`endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `posts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orgId` INTEGER NOT NULL,
    `authorId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'NOTIFICATION',
    `metadata` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `posts_orgId_isActive_idx`(`orgId`, `isActive`),
    INDEX `posts_authorId_idx`(`authorId`),
    INDEX `posts_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Organization_orgAdminId_key` ON `Organization`(`orgAdminId`);

-- CreateIndex
CREATE INDEX `Organization_orgAdminId_idx` ON `Organization`(`orgAdminId`);

-- AddForeignKey
ALTER TABLE `Organization` ADD CONSTRAINT `Organization_orgAdminId_fkey` FOREIGN KEY (`orgAdminId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
