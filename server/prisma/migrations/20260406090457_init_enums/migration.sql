/*
  Warnings:

  - You are about to alter the column `status` on the `attendance` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(3))`.
  - You are about to alter the column `subscriptionStatus` on the `organization` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(8))`.
  - You are about to alter the column `status` on the `payment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(6))`.
  - You are about to alter the column `status` on the `subscription` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(8))`.
  - You are about to alter the column `role` on the `user` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(11))`.
  - You are about to alter the column `status` on the `user` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(12))`.
  - You are about to drop the `archieve_org` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `archieve_user` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `contact_inquiries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `posts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `support_tickets` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `posts` DROP FOREIGN KEY `posts_authorId_fkey`;

-- DropForeignKey
ALTER TABLE `posts` DROP FOREIGN KEY `posts_orgId_fkey`;

-- AlterTable
ALTER TABLE `attendance` MODIFY `status` ENUM('PRESENT', 'ABSENT', 'HALF_DAY') NOT NULL DEFAULT 'PRESENT';

-- AlterTable
ALTER TABLE `organization` MODIFY `subscriptionStatus` ENUM('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'TRIAL';

-- AlterTable
ALTER TABLE `payment` MODIFY `status` ENUM('CREATED', 'SUCCESS', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'CREATED';

-- AlterTable
ALTER TABLE `subscription` MODIFY `status` ENUM('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE `user` ADD COLUMN `resetTokenExpiry` DATETIME(3) NULL,
    ADD COLUMN `resetTokenHash` VARCHAR(191) NULL,
    MODIFY `role` ENUM('SUPER_ADMIN', 'ORG_ADMIN', 'SUB_ADMIN', 'TEAM_LEADER', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    MODIFY `status` ENUM('APPROVED', 'PENDING', 'REJECTED', 'BLOCKED') NOT NULL DEFAULT 'APPROVED';

-- DropTable
DROP TABLE `archieve_org`;

-- DropTable
DROP TABLE `archieve_user`;

-- DropTable
DROP TABLE `contact_inquiries`;

-- DropTable
DROP TABLE `posts`;

-- DropTable
DROP TABLE `support_tickets`;

-- CreateTable
CREATE TABLE `archive_org` (
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
    `subscriptionStatus` ENUM('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED') NULL,
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

    INDEX `archive_org_archivedAt_idx`(`archivedAt`),
    INDEX `archive_org_email_idx`(`email`),
    INDEX `archive_org_orgId_idx`(`orgId`),
    INDEX `archive_org_organizationCode_idx`(`organizationCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `archive_user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `orgId` INTEGER NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `mobile` VARCHAR(191) NULL,
    `mobileCountryCode` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `role` ENUM('SUPER_ADMIN', 'ORG_ADMIN', 'SUB_ADMIN', 'TEAM_LEADER', 'MEMBER') NULL,
    `permissions` JSON NULL,
    `status` ENUM('APPROVED', 'PENDING', 'REJECTED', 'BLOCKED') NULL,
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

    INDEX `archive_user_archivedAt_idx`(`archivedAt`),
    INDEX `archive_user_email_idx`(`email`),
    INDEX `archive_user_orgId_role_idx`(`orgId`, `role`),
    INDEX `archive_user_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contact_inquiry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'NEW',
    `adminNotificationSentAt` DATETIME(3) NULL,
    `adminNotificationError` VARCHAR(191) NULL,
    `requesterNotificationSentAt` DATETIME(3) NULL,
    `requesterNotificationError` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `contact_inquiry_createdAt_idx`(`createdAt`),
    INDEX `contact_inquiry_email_createdAt_idx`(`email`, `createdAt`),
    INDEX `contact_inquiry_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organizationmember` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `orgId` INTEGER NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ORG_ADMIN', 'SUB_ADMIN', 'TEAM_LEADER', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `organizationmember_orgId_role_idx`(`orgId`, `role`),
    INDEX `organizationmember_userId_idx`(`userId`),
    UNIQUE INDEX `organizationmember_userId_orgId_key`(`userId`, `orgId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `post` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orgId` INTEGER NOT NULL,
    `authorId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `type` ENUM('NOTIFICATION', 'NEWS', 'POLL') NOT NULL DEFAULT 'NOTIFICATION',
    `metadata` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `posts_authorId_idx`(`authorId`),
    INDEX `posts_orgId_isActive_idx`(`orgId`, `isActive`),
    INDEX `posts_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_ticket` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ORG_ADMIN', 'SUB_ADMIN', 'TEAM_LEADER', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `subject` VARCHAR(191) NOT NULL DEFAULT 'Support Query',
    `message` TEXT NOT NULL,
    `status` ENUM('OPEN', 'CLOSED', 'IN_PROGRESS') NOT NULL DEFAULT 'OPEN',
    `orgId` INTEGER NULL,
    `userId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `support_tickets_orgId_idx`(`orgId`),
    INDEX `support_tickets_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verificationsession` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purpose` VARCHAR(191) NOT NULL DEFAULT 'MEMBER_REGISTRATION',
    `email` VARCHAR(191) NOT NULL,
    `phoneE164` VARCHAR(191) NOT NULL,
    `countryCode` VARCHAR(191) NULL,
    `nationalNumber` VARCHAR(191) NOT NULL,
    `status` ENUM('CONTACT_PENDING', 'EMAIL_PENDING', 'VERIFIED', 'CONSUMED', 'EXPIRED') NOT NULL DEFAULT 'CONTACT_PENDING',
    `contactOtpHash` VARCHAR(191) NULL,
    `contactOtpExpiresAt` DATETIME(3) NOT NULL,
    `contactOtpAttempts` INTEGER NOT NULL DEFAULT 0,
    `contactOtpLastSentAt` DATETIME(3) NULL,
    `contactVerifiedAt` DATETIME(3) NULL,
    `emailOtpHash` VARCHAR(191) NULL,
    `emailOtpExpiresAt` DATETIME(3) NULL,
    `emailOtpAttempts` INTEGER NOT NULL DEFAULT 0,
    `emailOtpLastSentAt` DATETIME(3) NULL,
    `emailVerifiedAt` DATETIME(3) NULL,
    `consumedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `VerificationSession_consumedAt_idx`(`consumedAt`),
    INDEX `VerificationSession_email_idx`(`email`),
    INDEX `VerificationSession_expiresAt_idx`(`expiresAt`),
    INDEX `VerificationSession_phoneE164_idx`(`phoneE164`),
    INDEX `VerificationSession_purpose_idx`(`purpose`),
    INDEX `VerificationSession_status_expiresAt_idx`(`status`, `expiresAt`),
    INDEX `VerificationSession_status_idx`(`status`),
    INDEX `verification_lookup_idx`(`email`, `phoneE164`, `purpose`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `organizationmember` ADD CONSTRAINT `organizationmember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organizationmember` ADD CONSTRAINT `organizationmember_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post` ADD CONSTRAINT `posts_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post` ADD CONSTRAINT `posts_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
