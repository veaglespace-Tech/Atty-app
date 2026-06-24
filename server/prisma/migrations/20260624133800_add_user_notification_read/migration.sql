-- CreateTable
CREATE TABLE `user_notification_read` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `notificationId` INTEGER NOT NULL,
    `readAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_notification_read_userId_idx`(`userId`),
    INDEX `user_notification_read_notificationId_idx`(`notificationId`),
    UNIQUE INDEX `user_notification_read_userId_notificationId_key`(`userId`, `notificationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_notification_read` ADD CONSTRAINT `user_notification_read_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_notification_read` ADD CONSTRAINT `user_notification_read_notificationId_fkey` FOREIGN KEY (`notificationId`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
