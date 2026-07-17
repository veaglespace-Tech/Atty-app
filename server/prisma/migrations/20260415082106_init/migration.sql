-- CreateTable
CREATE TABLE `archive_org` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orgId` INTEGER NULL,
    `planId` INTEGER NULL,
    `subscriptionId` INTEGER NULL,
    `name` VARCHAR(191) NULL,
    `organizationCode` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `phoneCountryCode` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `attendanceRadius` INTEGER NULL,
    `subscriptionStatus` ENUM('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED') NULL,
    `subscriptionExpiry` DATETIME(3) NULL,
    `isActive` BOOLEAN NULL,
    `isBlocked` BOOLEAN NULL,
    `archiveReason` VARCHAR(191) NOT NULL DEFAULT '',
    `metadata` JSON NULL,
    `archivedById` INTEGER NULL,
    `archivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `originalCreatedAt` DATETIME(3) NULL,
    `originalUpdatedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `archive_org_archivedAt_idx`(`archivedAt`),
    INDEX `archive_org_email_idx`(`email`),
    INDEX `archive_org_orgId_idx`(`orgId`),
    INDEX `archive_org_organizationCode_idx`(`organizationCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `archive_user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `orgId` INTEGER NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `mobile` VARCHAR(191) NULL,
    `mobileCountryCode` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `role` ENUM('SUPER_ADMIN', 'ORG_ADMIN', 'SUB_ADMIN', 'TEAM_LEADER', 'MEMBER') NULL,
    `permissions` JSON NULL,
    `status` ENUM('APPROVED', 'PENDING', 'REJECTED', 'BLOCKED') NULL,
    `isActive` BOOLEAN NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `archiveReason` VARCHAR(191) NOT NULL DEFAULT '',
    `metadata` JSON NULL,
    `createdById` INTEGER NULL,
    `archivedById` INTEGER NULL,
    `archivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `originalCreatedAt` DATETIME(3) NULL,
    `originalUpdatedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `archive_user_archivedAt_idx`(`archivedAt`),
    INDEX `archive_user_email_idx`(`email`),
    INDEX `archive_user_orgId_role_idx`(`orgId`, `role`),
    INDEX `archive_user_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orgId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `teamId` INTEGER NULL,
    `markedById` INTEGER NULL,
    `date` VARCHAR(191) NOT NULL,
    `punchInAt` DATETIME(3) NULL,
    `punchOutAt` DATETIME(3) NULL,
    `punchInLatitude` DOUBLE NULL,
    `punchInLongitude` DOUBLE NULL,
    `punchOutLatitude` DOUBLE NULL,
    `punchOutLongitude` DOUBLE NULL,
    `punchInDistanceMeters` DOUBLE NULL,
    `punchOutDistanceMeters` DOUBLE NULL,
    `isPunchInValid` BOOLEAN NOT NULL DEFAULT false,
    `isPunchOutValid` BOOLEAN NOT NULL DEFAULT false,
    `totalMinutesWorked` INTEGER NOT NULL DEFAULT 0,
    `lateMinutes` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('PRESENT', 'ABSENT', 'HALF_DAY') NOT NULL DEFAULT 'PRESENT',
    `notes` VARCHAR(191) NOT NULL DEFAULT '',
    `punchInLocationMeta` JSON NULL,
    `punchOutLocationMeta` JSON NULL,
    `punchInSelfieUrl` VARCHAR(191) NULL,
    `punchInSelfiePublicId` VARCHAR(191) NULL,
    `punchOutSelfieUrl` VARCHAR(191) NULL,
    `punchOutSelfiePublicId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Attendance_markedById_fkey`(`markedById`),
    INDEX `Attendance_orgId_date_idx`(`orgId`, `date`),
    INDEX `Attendance_orgId_status_date_idx`(`orgId`, `status`, `date`),
    INDEX `Attendance_orgId_teamId_date_idx`(`orgId`, `teamId`, `date`),
    INDEX `Attendance_teamId_fkey`(`teamId`),
    INDEX `Attendance_userId_date_idx`(`userId`, `date`),
    UNIQUE INDEX `Attendance_orgId_userId_date_key`(`orgId`, `userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contact_inquiry` (
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
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `contact_inquiry_createdAt_idx`(`createdAt`),
    INDEX `contact_inquiry_email_createdAt_idx`(`email`, `createdAt`),
    INDEX `contact_inquiry_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `free_trial_claim` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orgName` VARCHAR(191) NULL,
    `orgEmail` VARCHAR(191) NOT NULL,
    `adminName` VARCHAR(191) NULL,
    `adminEmail` VARCHAR(191) NOT NULL,
    `adminPhone` VARCHAR(191) NOT NULL,
    `planCode` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `claimedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `free_trial_claim_orgEmail_key`(`orgEmail`),
    UNIQUE INDEX `free_trial_claim_adminEmail_key`(`adminEmail`),
    UNIQUE INDEX `free_trial_claim_adminPhone_key`(`adminPhone`),
    INDEX `free_trial_claim_claimedAt_idx`(`claimedAt`),
    INDEX `free_trial_claim_endDate_idx`(`endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orgAdminId` INTEGER NULL,
    `planId` INTEGER NULL,
    `subscriptionId` INTEGER NULL,
    `name` VARCHAR(191) NOT NULL,
    `organizationCode` VARCHAR(191) NOT NULL,
    `referralCode` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `phoneCountryCode` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'India',
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `attendanceRadius` INTEGER NOT NULL DEFAULT 25,
    `subscriptionStatus` ENUM('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'TRIAL',
    `subscriptionExpiry` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isBlocked` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Organization_orgAdminId_key`(`orgAdminId`),
    UNIQUE INDEX `Organization_subscriptionId_key`(`subscriptionId`),
    UNIQUE INDEX `Organization_organizationCode_key`(`organizationCode`),
    UNIQUE INDEX `Organization_referralCode_key`(`referralCode`),
    UNIQUE INDEX `Organization_email_key`(`email`),
    INDEX `Organization_isActive_isBlocked_deletedAt_idx`(`isActive`, `isBlocked`, `deletedAt`),
    INDEX `Organization_planId_idx`(`planId`),
    INDEX `Organization_subscriptionStatus_subscriptionExpiry_idx`(`subscriptionStatus`, `subscriptionExpiry`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organizationmember` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `orgId` INTEGER NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ORG_ADMIN', 'SUB_ADMIN', 'TEAM_LEADER', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `organizationmember_orgId_role_idx`(`orgId`, `role`),
    INDEX `organizationmember_userId_idx`(`userId`),
    UNIQUE INDEX `organizationmember_userId_orgId_key`(`userId`, `orgId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orgId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `subscriptionId` INTEGER NOT NULL,
    `planName` VARCHAR(191) NOT NULL,
    `planCode` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `gateway` VARCHAR(191) NOT NULL DEFAULT 'RAZORPAY',
    `razorpayOrderId` VARCHAR(191) NOT NULL,
    `razorpayPaymentId` VARCHAR(191) NULL,
    `razorpaySignature` VARCHAR(191) NULL,
    `status` ENUM('CREATED', 'SUCCESS', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'CREATED',
    `failureReason` VARCHAR(191) NOT NULL DEFAULT '',
    `rawResponse` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Payment_orgId_createdAt_idx`(`orgId`, `createdAt`),
    INDEX `Payment_orgId_idx`(`orgId`),
    INDEX `Payment_planCode_status_createdAt_idx`(`planCode`, `status`, `createdAt`),
    INDEX `Payment_razorpayOrderId_idx`(`razorpayOrderId`),
    INDEX `Payment_status_idx`(`status`),
    INDEX `Payment_subscriptionId_idx`(`subscriptionId`),
    INDEX `Payment_userId_fkey`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL DEFAULT '',
    `price` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `durationInDays` INTEGER NOT NULL,
    `features` JSON NOT NULL,
    `maxUsers` INTEGER NOT NULL DEFAULT 0,
    `maxTeams` INTEGER NOT NULL DEFAULT 0,
    `maxLocations` INTEGER NOT NULL DEFAULT 0,
    `memberLimit` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Plan_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `post` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orgId` INTEGER NOT NULL,
    `authorId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `type` ENUM('NOTIFICATION', 'NEWS', 'ARTICLE', 'POLL', 'TOURNAMENT_CARD') NOT NULL DEFAULT 'NOTIFICATION',
    `metadata` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `posts_authorId_idx`(`authorId`),
    INDEX `posts_orgId_isActive_idx`(`orgId`, `isActive`),
    INDEX `posts_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orgId` INTEGER NOT NULL,
    `planId` INTEGER NULL,
    `createdById` INTEGER NOT NULL,
    `planName` VARCHAR(191) NOT NULL,
    `planCode` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `status` ENUM('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `startDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endDate` DATETIME(3) NULL,
    `activeKey` VARCHAR(191) NULL,
    `paymentGateway` VARCHAR(191) NOT NULL DEFAULT 'RAZORPAY',
    `razorpayOrderId` VARCHAR(191) NULL,
    `razorpayPaymentId` VARCHAR(191) NULL,
    `razorpaySignature` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Subscription_activeKey_key`(`activeKey`),
    INDEX `Subscription_createdById_idx`(`createdById`),
    INDEX `Subscription_orgId_createdAt_idx`(`orgId`, `createdAt`),
    INDEX `Subscription_orgId_status_endDate_idx`(`orgId`, `status`, `endDate`),
    INDEX `Subscription_planCode_status_idx`(`planCode`, `status`),
    INDEX `Subscription_planId_fkey`(`planId`),
    INDEX `Subscription_razorpayOrderId_idx`(`razorpayOrderId`),
    INDEX `Subscription_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `registration_request` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orgId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(191) NOT NULL,
    `mobileCountryCode` VARCHAR(191) NULL,
    `emergencyContact` VARCHAR(191) NULL,
    `currentAddress` VARCHAR(191) NULL,
    `permanentAddress` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `gender` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `reviewedById` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNote` VARCHAR(191) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `RegistrationRequest_orgId_status_idx`(`orgId`, `status`),
    INDEX `RegistrationRequest_email_idx`(`email`),
    INDEX `RegistrationRequest_expiresAt_idx`(`expiresAt`),
    UNIQUE INDEX `RegistrationRequest_orgId_email_key`(`orgId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_ticket` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orgId` INTEGER NULL,
    `userId` INTEGER NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ORG_ADMIN', 'SUB_ADMIN', 'TEAM_LEADER', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `subject` VARCHAR(191) NOT NULL DEFAULT 'Support Query',
    `message` TEXT NOT NULL,
    `status` ENUM('OPEN', 'CLOSED', 'IN_PROGRESS') NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `support_tickets_orgId_idx`(`orgId`),
    INDEX `support_tickets_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orgId` INTEGER NOT NULL,
    `leaderId` INTEGER NULL,
    `createdById` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL DEFAULT '',
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `attendanceRadius` INTEGER NOT NULL DEFAULT 25,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Team_createdById_idx`(`createdById`),
    INDEX `Team_leaderId_idx`(`leaderId`),
    INDEX `Team_orgId_deletedAt_idx`(`orgId`, `deletedAt`),
    UNIQUE INDEX `Team_orgId_name_key`(`orgId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teammember` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teamId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TeamMember_userId_idx`(`userId`),
    UNIQUE INDEX `TeamMember_teamId_userId_key`(`teamId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orgId` INTEGER NULL,
    `createdById` INTEGER NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(191) NOT NULL,
    `mobileCountryCode` VARCHAR(191) NULL,
    `emergencyContact` VARCHAR(191) NULL,
    `currentAddress` VARCHAR(191) NULL,
    `permanentAddress` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ORG_ADMIN', 'SUB_ADMIN', 'TEAM_LEADER', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `permissions` JSON NULL,
    `resetTokenHash` VARCHAR(191) NULL,
    `resetTokenExpiry` DATETIME(3) NULL,
    `status` ENUM('APPROVED', 'PENDING', 'REJECTED', 'BLOCKED') NOT NULL DEFAULT 'APPROVED',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `profileImageUrl` VARCHAR(191) NULL,
    `profileImagePublicId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_createdById_idx`(`createdById`),
    INDEX `User_orgId_deletedAt_idx`(`orgId`, `deletedAt`),
    INDEX `User_orgId_role_idx`(`orgId`, `role`),
    INDEX `User_orgId_status_idx`(`orgId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verificationsession` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purpose` VARCHAR(191) NOT NULL DEFAULT 'MEMBER_REGISTRATION',
    `email` VARCHAR(191) NOT NULL,
    `phoneE164` VARCHAR(191) NOT NULL,
    `countryCode` VARCHAR(191) NULL,
    `nationalNumber` VARCHAR(191) NOT NULL,
    `status` ENUM('CONTACT_PENDING', 'EMAIL_PENDING', 'VERIFIED', 'CONSUMED', 'EXPIRED') NOT NULL DEFAULT 'CONTACT_PENDING',
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

    INDEX `VerificationSession_consumedAt_idx`(`consumedAt`),
    INDEX `VerificationSession_email_idx`(`email`),
    INDEX `VerificationSession_expiresAt_idx`(`expiresAt`),
    INDEX `VerificationSession_phoneE164_idx`(`phoneE164`),
    INDEX `VerificationSession_purpose_idx`(`purpose`),
    INDEX `VerificationSession_status_expiresAt_idx`(`status`, `expiresAt`),
    INDEX `VerificationSession_status_idx`(`status`),
    INDEX `verification_lookup_idx`(`email`, `phoneE164`, `purpose`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `Attendance_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `Attendance_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `Attendance_markedById_fkey` FOREIGN KEY (`markedById`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `Attendance_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization` ADD CONSTRAINT `Organization_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `plan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization` ADD CONSTRAINT `Organization_orgAdminId_fkey` FOREIGN KEY (`orgAdminId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization` ADD CONSTRAINT `Organization_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `subscription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organizationmember` ADD CONSTRAINT `organizationmember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organizationmember` ADD CONSTRAINT `organizationmember_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment` ADD CONSTRAINT `Payment_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment` ADD CONSTRAINT `Payment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment` ADD CONSTRAINT `Payment_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `subscription`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post` ADD CONSTRAINT `posts_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post` ADD CONSTRAINT `posts_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription` ADD CONSTRAINT `Subscription_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription` ADD CONSTRAINT `Subscription_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `plan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription` ADD CONSTRAINT `Subscription_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE `registration_request` ADD CONSTRAINT `registration_request_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team` ADD CONSTRAINT `Team_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team` ADD CONSTRAINT `Team_leaderId_fkey` FOREIGN KEY (`leaderId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team` ADD CONSTRAINT `Team_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teammember` ADD CONSTRAINT `TeamMember_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teammember` ADD CONSTRAINT `TeamMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `User_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `User_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
