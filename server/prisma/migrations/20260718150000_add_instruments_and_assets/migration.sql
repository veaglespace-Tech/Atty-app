-- CreateTable
CREATE TABLE `instrument` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orgId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `instrument_orgId_idx`(`orgId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_instrument` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `instrumentId` INTEGER NOT NULL,
    `assetId` VARCHAR(191) NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_instrument_userId_idx`(`userId`),
    INDEX `user_instrument_instrumentId_idx`(`instrumentId`),
    UNIQUE INDEX `user_instrument_userId_instrumentId_key`(`userId`, `instrumentId`),
    UNIQUE INDEX `user_instrument_instrumentId_assetId_key`(`instrumentId`, `assetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `instrument` ADD CONSTRAINT `instrument_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_instrument` ADD CONSTRAINT `user_instrument_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_instrument` ADD CONSTRAINT `user_instrument_instrumentId_fkey` FOREIGN KEY (`instrumentId`) REFERENCES `instrument`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

