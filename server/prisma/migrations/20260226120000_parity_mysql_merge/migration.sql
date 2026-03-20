-- Add parity columns and indexes for MySQL backend behavior compatibility

ALTER TABLE `Organization`
  ADD COLUMN `phoneCountryCode` VARCHAR(191) NULL,
  ADD COLUMN `subscriptionId` INTEGER NULL,
  ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE `User`
  ADD COLUMN `mobileCountryCode` VARCHAR(191) NULL,
  ADD COLUMN `permissions` JSON NULL;

ALTER TABLE `Team`
  ADD COLUMN `leaderId` INTEGER NULL;

ALTER TABLE `Attendance`
  ADD COLUMN `teamId` INTEGER NULL,
  ADD COLUMN `punchInLocationMeta` JSON NULL,
  ADD COLUMN `punchOutLocationMeta` JSON NULL;

ALTER TABLE `Plan`
  ADD COLUMN `memberLimit` INTEGER NOT NULL DEFAULT 0;

ALTER TABLE `Subscription`
  ADD COLUMN `planId` INTEGER NULL,
  MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE';

-- Verification workflow table
CREATE TABLE `VerificationSession` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `purpose` VARCHAR(191) NOT NULL DEFAULT 'MEMBER_REGISTRATION',
  `email` VARCHAR(191) NOT NULL,
  `phoneE164` VARCHAR(191) NOT NULL,
  `countryCode` VARCHAR(191) NULL,
  `nationalNumber` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'CONTACT_PENDING',
  `contactOtpHash` VARCHAR(191) NULL,
  `contactOtpExpiresAt` DATETIME(3) NOT NULL,
  `contactOtpAttempts` INTEGER NOT NULL DEFAULT 0,
  `contactOtpLastSentAt` DATETIME(3) NULL,
  `contactVerifiedAt` DATETIME(3) NULL,
  `emailOtpHash` VARCHAR(191) NULL,
  `emailOtpExpiresAt` DATETIME(3) NULL,
  `emailOtpAttempts` INTEGER NOT NULL DEFAULT 0,
  `emailOtpLastSentAt` DATETIME(3) NULL,
  `emailVerifiedAt` DATETIME(3) NULL,
  `consumedAt` DATETIME(3) NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Indexes
CREATE UNIQUE INDEX `Organization_subscriptionId_key` ON `Organization`(`subscriptionId`);
CREATE UNIQUE INDEX `Organization_email_key` ON `Organization`(`email`);
CREATE INDEX `Organization_subscriptionStatus_subscriptionExpiry_idx` ON `Organization`(`subscriptionStatus`, `subscriptionExpiry`);
CREATE INDEX `Organization_isActive_isBlocked_deletedAt_idx` ON `Organization`(`isActive`, `isBlocked`, `deletedAt`);

CREATE INDEX `User_orgId_status_idx` ON `User`(`orgId`, `status`);
CREATE INDEX `User_orgId_deletedAt_idx` ON `User`(`orgId`, `deletedAt`);

CREATE INDEX `Team_leaderId_idx` ON `Team`(`leaderId`);
CREATE INDEX `Team_orgId_deletedAt_idx` ON `Team`(`orgId`, `deletedAt`);

CREATE INDEX `Attendance_orgId_teamId_date_idx` ON `Attendance`(`orgId`, `teamId`, `date`);
CREATE INDEX `Attendance_userId_date_idx` ON `Attendance`(`userId`, `date`);

CREATE INDEX `Subscription_orgId_status_endDate_idx` ON `Subscription`(`orgId`, `status`, `endDate`);
CREATE INDEX `Subscription_planCode_status_idx` ON `Subscription`(`planCode`, `status`);
CREATE INDEX `Subscription_razorpayOrderId_idx` ON `Subscription`(`razorpayOrderId`);

CREATE INDEX `Payment_orgId_createdAt_idx` ON `Payment`(`orgId`, `createdAt`);

CREATE INDEX `VerificationSession_purpose_idx` ON `VerificationSession`(`purpose`);
CREATE INDEX `VerificationSession_email_idx` ON `VerificationSession`(`email`);
CREATE INDEX `VerificationSession_phoneE164_idx` ON `VerificationSession`(`phoneE164`);
CREATE INDEX `VerificationSession_status_idx` ON `VerificationSession`(`status`);
CREATE INDEX `VerificationSession_consumedAt_idx` ON `VerificationSession`(`consumedAt`);
CREATE INDEX `VerificationSession_expiresAt_idx` ON `VerificationSession`(`expiresAt`);
CREATE INDEX `verification_lookup_idx` ON `VerificationSession`(`email`, `phoneE164`, `purpose`, `createdAt`);

-- Foreign keys
ALTER TABLE `Organization`
  ADD CONSTRAINT `Organization_subscriptionId_fkey`
  FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Team`
  ADD CONSTRAINT `Team_leaderId_fkey`
  FOREIGN KEY (`leaderId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Attendance`
  ADD CONSTRAINT `Attendance_teamId_fkey`
  FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Subscription`
  ADD CONSTRAINT `Subscription_planId_fkey`
  FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;