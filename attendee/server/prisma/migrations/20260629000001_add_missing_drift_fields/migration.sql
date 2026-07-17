-- AlterTable
ALTER TABLE `organization` ADD COLUMN `referredByPartnerId` INTEGER NULL;

-- AlterTable
ALTER TABLE `post` ADD COLUMN `teamId` INTEGER NULL;

-- AlterTable
ALTER TABLE `registration_lead` ADD COLUMN `organizationAddress` VARCHAR(191) NULL,
    ADD COLUMN `organizationCity` VARCHAR(191) NULL,
    ADD COLUMN `organizationCountry` VARCHAR(191) NULL,
    ADD COLUMN `organizationState` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `organization_referredByPartnerId_fkey` ON `organization`(`referredByPartnerId`);

-- CreateIndex
CREATE INDEX `posts_teamId_idx` ON `post`(`teamId`);

-- AddForeignKey
ALTER TABLE `organization` ADD CONSTRAINT `organization_referredByPartnerId_fkey` FOREIGN KEY (`referredByPartnerId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post` ADD CONSTRAINT `posts_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
