-- Subscription active-key safety for one active subscription per organization.
ALTER TABLE `Subscription`
  ADD COLUMN `activeKey` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `Subscription_activeKey_key` ON `Subscription`(`activeKey`);

-- Performance indexes for high-frequency filters.
CREATE INDEX `Subscription_orgId_createdAt_idx` ON `Subscription`(`orgId`, `createdAt`);
CREATE INDEX `Subscription_status_createdAt_idx` ON `Subscription`(`status`, `createdAt`);

CREATE INDEX `Attendance_orgId_status_date_idx` ON `Attendance`(`orgId`, `status`, `date`);
CREATE INDEX `Payment_planCode_status_createdAt_idx` ON `Payment`(`planCode`, `status`, `createdAt`);
CREATE INDEX `VerificationSession_status_expiresAt_idx` ON `VerificationSession`(`status`, `expiresAt`);

