-- DropForeignKey
ALTER TABLE `post` DROP FOREIGN KEY `posts_orgId_fkey`;

-- AlterTable
ALTER TABLE `payment` ADD COLUMN `couponId` INTEGER NULL,
    ADD COLUMN `originalAmount` DOUBLE NULL;

-- AlterTable
ALTER TABLE `post` MODIFY `orgId` INTEGER NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS `coupon` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `discountType` ENUM('PERCENTAGE', 'FLAT_AMOUNT') NOT NULL,
    `discountValue` DOUBLE NOT NULL,
    `maxUses` INTEGER NULL,
    `usesCount` INTEGER NOT NULL DEFAULT 0,
    `assignedUserId` INTEGER NULL,
    `createdById` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `validUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `coupon_code_key`(`code`),
    INDEX `coupon_code_idx`(`code`),
    INDEX `coupon_assignedUserId_idx`(`assignedUserId`),
    INDEX `coupon_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Payment_couponId_idx` ON `payment`(`couponId`);

-- AddForeignKey
ALTER TABLE `payment` ADD CONSTRAINT `payment_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `coupon`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post` ADD CONSTRAINT `posts_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupon` ADD CONSTRAINT `coupon_assignedUserId_fkey` FOREIGN KEY (`assignedUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupon` ADD CONSTRAINT `coupon_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
