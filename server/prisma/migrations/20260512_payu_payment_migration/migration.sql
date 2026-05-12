-- PayU Payment Migration
-- Rename razorpay-specific columns to generic payment columns
-- Handles existing data by migrating values across columns

-- ============================================================
-- TABLE: payment
-- ============================================================

-- 1. Add new generic columns
ALTER TABLE `payment`
  ADD COLUMN `paymentOrderId`     VARCHAR(191) NOT NULL DEFAULT 'MIGRATED',
  ADD COLUMN `paymentReferenceId` VARCHAR(191) NULL,
  ADD COLUMN `paymentSignature`   VARCHAR(191) NULL;

-- 2. Migrate existing data
UPDATE `payment` SET
  `paymentOrderId`     = COALESCE(`razorpayOrderId`, 'MIGRATED'),
  `paymentReferenceId` = `razorpayPaymentId`,
  `paymentSignature`   = `razorpaySignature`;

-- 3. Drop old razorpay columns
ALTER TABLE `payment`
  DROP INDEX `Payment_razorpayOrderId_idx`,
  DROP COLUMN `razorpayOrderId`,
  DROP COLUMN `razorpayPaymentId`,
  DROP COLUMN `razorpaySignature`;

-- 4. Update default gateway
ALTER TABLE `payment`
  MODIFY COLUMN `gateway` VARCHAR(191) NOT NULL DEFAULT 'PAYU';

-- 5. Add new index
CREATE INDEX `Payment_paymentOrderId_idx` ON `payment`(`paymentOrderId`);

-- ============================================================
-- TABLE: subscription
-- ============================================================

-- 1. Add new generic columns
ALTER TABLE `subscription`
  ADD COLUMN `paymentOrderId`     VARCHAR(191) NULL,
  ADD COLUMN `paymentReferenceId` VARCHAR(191) NULL,
  ADD COLUMN `paymentSignature`   VARCHAR(191) NULL;

-- 2. Migrate existing data
UPDATE `subscription` SET
  `paymentOrderId`     = `razorpayOrderId`,
  `paymentReferenceId` = `razorpayPaymentId`,
  `paymentSignature`   = `razorpaySignature`;

-- 3. Drop old razorpay columns
ALTER TABLE `subscription`
  DROP INDEX `Subscription_razorpayOrderId_idx`,
  DROP COLUMN `razorpayOrderId`,
  DROP COLUMN `razorpayPaymentId`,
  DROP COLUMN `razorpaySignature`;

-- 4. Update default gateway
ALTER TABLE `subscription`
  MODIFY COLUMN `paymentGateway` VARCHAR(191) NOT NULL DEFAULT 'PAYU';

-- 5. Add new index
CREATE INDEX `Subscription_paymentOrderId_idx` ON `subscription`(`paymentOrderId`);

-- ============================================================
-- TABLE: subscription_renewal_intent
-- ============================================================

-- 1. Add new generic columns (nullable first to handle existing data)
ALTER TABLE `subscription_renewal_intent`
  ADD COLUMN `paymentOrderId`     VARCHAR(191) NULL,
  ADD COLUMN `paymentReferenceId` VARCHAR(191) NULL,
  ADD COLUMN `paymentSignature`   VARCHAR(191) NULL;

-- 2. Migrate existing data
UPDATE `subscription_renewal_intent` SET
  `paymentOrderId`     = `razorpayOrderId`,
  `paymentReferenceId` = `razorpayPaymentId`,
  `paymentSignature`   = `razorpaySignature`;

-- 3. Drop old unique constraints and columns
ALTER TABLE `subscription_renewal_intent`
  DROP INDEX `SubscriptionRenewalIntent_razorpayOrderId_key`,
  DROP INDEX `SubscriptionRenewalIntent_razorpayPaymentId_key`,
  DROP COLUMN `razorpayOrderId`,
  DROP COLUMN `razorpayPaymentId`,
  DROP COLUMN `razorpaySignature`;

-- 4. Update default gateway
ALTER TABLE `subscription_renewal_intent`
  MODIFY COLUMN `gateway` VARCHAR(191) NOT NULL DEFAULT 'PAYU';

-- 5. Add unique constraints on new columns
ALTER TABLE `subscription_renewal_intent`
  ADD CONSTRAINT `SubscriptionRenewalIntent_paymentOrderId_key` UNIQUE (`paymentOrderId`),
  ADD CONSTRAINT `SubscriptionRenewalIntent_paymentReferenceId_key` UNIQUE (`paymentReferenceId`);
