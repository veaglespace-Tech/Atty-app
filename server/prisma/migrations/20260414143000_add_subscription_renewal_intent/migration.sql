-- CreateTable
CREATE TABLE `subscription_renewal_intent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orgId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `planId` INTEGER NULL,
    `currentSubscriptionId` INTEGER NULL,
    `appliedSubscriptionId` INTEGER NULL,
    `planName` VARCHAR(191) NOT NULL,
    `planCode` VARCHAR(191) NOT NULL,
    `currentPlanName` VARCHAR(191) NULL,
    `currentPlanCode` VARCHAR(191) NULL,
    `mode` ENUM('RENEW', 'EXTEND', 'UPGRADE_NOW', 'DOWNGRADE_SCHEDULED') NOT NULL,
    `status` ENUM('CREATED', 'VERIFIED', 'APPLIED', 'FAILED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'CREATED',
    `payableAmount` DOUBLE NOT NULL,
    `creditAmount` DOUBLE NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `remainingDays` INTEGER NOT NULL DEFAULT 0,
    `expectedStartDate` DATETIME(3) NOT NULL,
    `expectedEndDate` DATETIME(3) NOT NULL,
    `gateway` VARCHAR(191) NOT NULL DEFAULT 'RAZORPAY',
    `razorpayOrderId` VARCHAR(191) NULL,
    `razorpayPaymentId` VARCHAR(191) NULL,
    `razorpaySignature` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `appliedAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SubscriptionRenewalIntent_razorpayOrderId_key`(`razorpayOrderId`),
    UNIQUE INDEX `SubscriptionRenewalIntent_razorpayPaymentId_key`(`razorpayPaymentId`),
    INDEX `SubscriptionRenewalIntent_orgId_status_createdAt_idx`(`orgId`, `status`, `createdAt`),
    INDEX `SubscriptionRenewalIntent_orgId_mode_status_idx`(`orgId`, `mode`, `status`),
    INDEX `SubscriptionRenewalIntent_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `SubscriptionRenewalIntent_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `subscription_renewal_intent` ADD CONSTRAINT `SubscriptionRenewalIntent_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription_renewal_intent` ADD CONSTRAINT `SubscriptionRenewalIntent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription_renewal_intent` ADD CONSTRAINT `SubscriptionRenewalIntent_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `plan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription_renewal_intent` ADD CONSTRAINT `SubscriptionRenewalIntent_currentSubscriptionId_fkey` FOREIGN KEY (`currentSubscriptionId`) REFERENCES `subscription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription_renewal_intent` ADD CONSTRAINT `SubscriptionRenewalIntent_appliedSubscriptionId_fkey` FOREIGN KEY (`appliedSubscriptionId`) REFERENCES `subscription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
