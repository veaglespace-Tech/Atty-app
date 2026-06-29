-- AlterTable
ALTER TABLE `user` ADD COLUMN `isReferralPartner` BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN `partnerReferralCode` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_partnerReferralCode_key` ON `user`(`partnerReferralCode`);
