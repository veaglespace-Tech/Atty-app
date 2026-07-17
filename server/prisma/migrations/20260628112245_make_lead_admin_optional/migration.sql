-- DropIndex
DROP INDEX `registration_lead_adminEmail_key` ON `registration_lead`;

-- AlterTable
ALTER TABLE `registration_lead` MODIFY `adminName` VARCHAR(191) NULL,
    MODIFY `adminEmail` VARCHAR(191) NULL;
