-- CreateTable
CREATE TABLE `UserNotificationRead` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `notificationId` INTEGER NOT NULL,
    `readAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserNotificationRead_userId_idx`(`userId`),
    INDEX `UserNotificationRead_notificationId_idx`(`notificationId`),
    UNIQUE INDEX `UserNotificationRead_userId_notificationId_key`(`userId`, `notificationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserNotificationRead` ADD CONSTRAINT `UserNotificationRead_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserNotificationRead` ADD CONSTRAINT `UserNotificationRead_notificationId_fkey` FOREIGN KEY (`notificationId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
