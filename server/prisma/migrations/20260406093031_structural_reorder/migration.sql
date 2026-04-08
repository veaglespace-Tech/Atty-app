-- Custom Migration: Physically reorder columns in the database for better visualization
-- Standardized as: ID -> FKs -> Identity -> Logic/Status -> Metadata -> Audit

-- Reorder 'user' table
ALTER TABLE `user` 
  MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
  MODIFY `orgId` INTEGER NULL AFTER `id`,
  MODIFY `createdById` INTEGER NULL AFTER `orgId`,
  MODIFY `name` VARCHAR(191) NOT NULL AFTER `createdById`,
  MODIFY `email` VARCHAR(191) NOT NULL AFTER `name`,
  MODIFY `mobile` VARCHAR(191) NOT NULL AFTER `email`,
  MODIFY `mobileCountryCode` VARCHAR(191) NULL AFTER `mobile`,
  MODIFY `password` VARCHAR(191) NOT NULL AFTER `mobileCountryCode`,
  MODIFY `role` ENUM('SUPER_ADMIN', 'ORG_ADMIN', 'SUB_ADMIN', 'TEAM_LEADER', 'MEMBER') NOT NULL DEFAULT 'MEMBER' AFTER `password`,
  MODIFY `permissions` JSON NULL AFTER `role`,
  MODIFY `resetTokenHash` VARCHAR(191) NULL AFTER `permissions`,
  MODIFY `resetTokenExpiry` DATETIME(3) NULL AFTER `resetTokenHash`,
  MODIFY `status` ENUM('APPROVED', 'PENDING', 'REJECTED', 'BLOCKED') NOT NULL DEFAULT 'APPROVED' AFTER `resetTokenExpiry`,
  MODIFY `isActive` BOOLEAN NOT NULL DEFAULT true AFTER `status`,
  MODIFY `lastLoginAt` DATETIME(3) NULL AFTER `isActive`,
  MODIFY `profileImageUrl` VARCHAR(191) NULL AFTER `lastLoginAt`,
  MODIFY `profileImagePublicId` VARCHAR(191) NULL AFTER `profileImageUrl`,
  MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) AFTER `profileImagePublicId`,
  MODIFY `updatedAt` DATETIME(3) NOT NULL AFTER `createdAt`,
  MODIFY `deletedAt` DATETIME(3) NULL AFTER `updatedAt`;

-- Reorder 'organization' table
ALTER TABLE `organization` 
  MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
  MODIFY `orgAdminId` INTEGER NULL AFTER `id`,
  MODIFY `planId` INTEGER NULL AFTER `orgAdminId`,
  MODIFY `subscriptionId` INTEGER NULL AFTER `planId`,
  MODIFY `name` VARCHAR(191) NOT NULL AFTER `subscriptionId`,
  MODIFY `organizationCode` VARCHAR(191) NOT NULL AFTER `name`,
  MODIFY `email` VARCHAR(191) NOT NULL AFTER `organizationCode`,
  MODIFY `phone` VARCHAR(191) NOT NULL AFTER `email`,
  MODIFY `phoneCountryCode` VARCHAR(191) NULL AFTER `phone`,
  MODIFY `address` VARCHAR(191) NULL AFTER `phoneCountryCode`,
  MODIFY `city` VARCHAR(191) NULL AFTER `address`,
  MODIFY `state` VARCHAR(191) NULL AFTER `city`,
  MODIFY `country` VARCHAR(191) NOT NULL DEFAULT 'India' AFTER `state`,
  MODIFY `latitude` DOUBLE NOT NULL AFTER `country`,
  MODIFY `longitude` DOUBLE NOT NULL AFTER `latitude`,
  MODIFY `attendanceRadius` INTEGER NOT NULL DEFAULT 25 AFTER `longitude`,
  MODIFY `subscriptionStatus` ENUM('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'TRIAL' AFTER `attendanceRadius`,
  MODIFY `subscriptionExpiry` DATETIME(3) NULL AFTER `subscriptionStatus`,
  MODIFY `isActive` BOOLEAN NOT NULL DEFAULT true AFTER `subscriptionExpiry`,
  MODIFY `isBlocked` BOOLEAN NOT NULL DEFAULT false AFTER `isActive`,
  MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) AFTER `isBlocked`,
  MODIFY `updatedAt` DATETIME(3) NOT NULL AFTER `createdAt`,
  MODIFY `deletedAt` DATETIME(3) NULL AFTER `updatedAt`;