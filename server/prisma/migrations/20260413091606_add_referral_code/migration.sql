-- AlterTable
ALTER TABLE `organization` ADD COLUMN `referralCode` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `registration_request` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orgId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(191) NOT NULL,
    `mobileCountryCode` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `gender` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `reviewedById` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNote` VARCHAR(191) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `RegistrationRequest_orgId_status_idx`(`orgId`, `status`),
    INDEX `RegistrationRequest_email_idx`(`email`),
    INDEX `RegistrationRequest_expiresAt_idx`(`expiresAt`),
    UNIQUE INDEX `RegistrationRequest_orgId_email_key`(`orgId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `registration_request` ADD CONSTRAINT `registration_request_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
