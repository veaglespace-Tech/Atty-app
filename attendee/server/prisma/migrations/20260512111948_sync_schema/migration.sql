-- Consolidated PayU and Schema Sync Migration
-- 1. Add new generic columns to 'payment'
ALTER TABLE `payment`
  ADD COLUMN `paymentOrderId`     VARCHAR(191) NOT NULL DEFAULT 'MIGRATED',
  ADD COLUMN `paymentReferenceId` VARCHAR(191) NULL,
  ADD COLUMN `paymentSignature`   VARCHAR(191) NULL;

-- 2. Migrate existing data in 'payment'
UPDATE `payment` SET
  `paymentOrderId`     = COALESCE(`razorpayOrderId`, 'MIGRATED'),
  `paymentReferenceId` = `razorpayPaymentId`,
  `paymentSignature`   = `razorpaySignature`;

-- 3. Drop old razorpay columns from 'payment'
ALTER TABLE `payment`
  DROP COLUMN `razorpayOrderId`,
  DROP COLUMN `razorpayPaymentId`,
  DROP COLUMN `razorpaySignature`,
  MODIFY COLUMN `gateway` VARCHAR(191) NOT NULL DEFAULT 'PAYU';

-- 4. Final adjustments to 'payment' (from sync_schema)
ALTER TABLE `payment` ALTER COLUMN `paymentOrderId` DROP DEFAULT;

-- 5. Add columns to 'subscription'
ALTER TABLE `subscription`
  ADD COLUMN `paymentOrderId`     VARCHAR(191) NULL,
  ADD COLUMN `paymentReferenceId` VARCHAR(191) NULL,
  ADD COLUMN `paymentSignature`   VARCHAR(191) NULL;

-- 6. Migrate existing data in 'subscription'
UPDATE `subscription` SET
  `paymentOrderId`     = `razorpayOrderId`,
  `paymentReferenceId` = `razorpayPaymentId`,
  `paymentSignature`   = `razorpaySignature`;

-- 7. Drop old columns from 'subscription'
ALTER TABLE `subscription`
  DROP COLUMN `razorpayOrderId`,
  DROP COLUMN `razorpayPaymentId`,
  DROP COLUMN `razorpaySignature`,
  MODIFY COLUMN `paymentGateway` VARCHAR(191) NOT NULL DEFAULT 'PAYU';

-- 8. Add columns to 'subscription_renewal_intent'
ALTER TABLE `subscription_renewal_intent`
  ADD COLUMN `paymentOrderId`     VARCHAR(191) NULL,
  ADD COLUMN `paymentReferenceId` VARCHAR(191) NULL,
  ADD COLUMN `paymentSignature`   VARCHAR(191) NULL;

-- 9. Migrate data in 'subscription_renewal_intent'
UPDATE `subscription_renewal_intent` SET
  `paymentOrderId`     = `razorpayOrderId`,
  `paymentReferenceId` = `razorpayPaymentId`,
  `paymentSignature`   = `razorpaySignature`;

-- 10. Drop old columns from 'subscription_renewal_intent'
ALTER TABLE `subscription_renewal_intent`
  DROP COLUMN `razorpayOrderId`,
  DROP COLUMN `razorpayPaymentId`,
  DROP COLUMN `razorpaySignature`,
  MODIFY COLUMN `gateway` VARCHAR(191) NOT NULL DEFAULT 'PAYU';

-- 11. Add unique constraints
ALTER TABLE `subscription_renewal_intent`
  ADD CONSTRAINT `SubscriptionRenewalIntent_paymentOrderId_key` UNIQUE (`paymentOrderId`),
  ADD CONSTRAINT `SubscriptionRenewalIntent_paymentReferenceId_key` UNIQUE (`paymentReferenceId`);

-- 12. Create Indexes
CREATE INDEX `Payment_paymentOrderId_idx` ON `payment`(`paymentOrderId`);
CREATE INDEX `Subscription_paymentOrderId_idx` ON `subscription`(`paymentOrderId`);
