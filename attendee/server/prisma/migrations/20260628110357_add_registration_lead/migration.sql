-- CreateTable
CREATE TABLE IF NOT EXISTS `registration_lead` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organizationName` VARCHAR(191) NOT NULL,
    `organizationEmail` VARCHAR(191) NOT NULL,
    `organizationPhone` VARCHAR(191) NULL,
    `adminName` VARCHAR(191) NOT NULL,
    `adminEmail` VARCHAR(191) NOT NULL,
    `adminPhone` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `registration_lead_organizationEmail_key`(`organizationEmail`),
    UNIQUE INDEX `registration_lead_adminEmail_key`(`adminEmail`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
