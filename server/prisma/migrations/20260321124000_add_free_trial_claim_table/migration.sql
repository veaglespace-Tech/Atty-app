CREATE TABLE `free_trial_claim` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `orgEmail` VARCHAR(191) NOT NULL,
  `adminEmail` VARCHAR(191) NOT NULL,
  `adminPhone` VARCHAR(191) NOT NULL,
  `planCode` VARCHAR(191) NOT NULL,
  `startDate` DATETIME(3) NOT NULL,
  `endDate` DATETIME(3) NOT NULL,
  `claimedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `orgName` VARCHAR(191) NULL,
  `adminName` VARCHAR(191) NULL,

  UNIQUE INDEX `free_trial_claim_orgEmail_key`(`orgEmail`),
  UNIQUE INDEX `free_trial_claim_adminEmail_key`(`adminEmail`),
  UNIQUE INDEX `free_trial_claim_adminPhone_key`(`adminPhone`),
  INDEX `free_trial_claim_claimedAt_idx`(`claimedAt`),
  INDEX `free_trial_claim_endDate_idx`(`endDate`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
