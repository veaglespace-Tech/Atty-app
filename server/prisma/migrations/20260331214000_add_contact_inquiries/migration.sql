CREATE TABLE `contact_inquiries` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `subject` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'NEW',
  `adminNotificationSentAt` DATETIME(3) NULL,
  `adminNotificationError` VARCHAR(191) NULL,
  `requesterNotificationSentAt` DATETIME(3) NULL,
  `requesterNotificationError` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `contact_inquiries_status_idx` (`status`),
  INDEX `contact_inquiries_createdAt_idx` (`createdAt`),
  INDEX `contact_inquiries_email_createdAt_idx` (`email`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
