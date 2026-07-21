-- DropForeignKey
ALTER TABLE `organization` DROP FOREIGN KEY `organization_referredByPartnerId_fkey`;

UPDATE `organization` SET `referredByPartnerId` = NULL;

-- DropIndex
DROP INDEX `User_partnerReferralCode_key` ON `user`;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `isReferralPartner`,
    DROP COLUMN `partnerReferralCode`,
    ADD COLUMN `referredByPartnerId` INTEGER NULL;

-- CreateTable
CREATE TABLE `referral_partner` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(191) NULL,
    `partnerReferralCode` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `referral_partner_email_key`(`email`),
    UNIQUE INDEX `referral_partner_partnerReferralCode_key`(`partnerReferralCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `organization` ADD CONSTRAINT `organization_referredByPartnerId_fkey` FOREIGN KEY (`referredByPartnerId`) REFERENCES `referral_partner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_referredByPartnerId_fkey` FOREIGN KEY (`referredByPartnerId`) REFERENCES `referral_partner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

