-- CreateTable
CREATE TABLE IF NOT EXISTS `email_sender_usage` (
    `usageDate` DATE NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `sentCount` INTEGER NOT NULL DEFAULT 0,
    `lastSentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `email_sender_usage_email_idx`(`email`),
    INDEX `email_sender_usage_usageDate_idx`(`usageDate`),
    PRIMARY KEY (`usageDate`, `email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
