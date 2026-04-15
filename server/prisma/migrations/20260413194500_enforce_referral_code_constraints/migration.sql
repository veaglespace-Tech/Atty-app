-- Backfill missing referral codes using deterministic id-based values.
UPDATE `organization`
SET `referralCode` = CONCAT('REF-', LPAD(UPPER(HEX(`id`)), 8, '0'))
WHERE `referralCode` IS NULL OR `referralCode` = '';

-- Resolve accidental duplicates before adding a unique index.
UPDATE `organization` o
JOIN (
  SELECT `referralCode`, MIN(`id`) AS keepId
  FROM `organization`
  WHERE `referralCode` IS NOT NULL AND `referralCode` <> ''
  GROUP BY `referralCode`
  HAVING COUNT(*) > 1
) d
  ON o.`referralCode` = d.`referralCode`
 AND o.`id` <> d.`keepId`
SET o.`referralCode` = CONCAT('REF-', LPAD(UPPER(HEX(o.`id`)), 8, '0'));

-- Enforce schema constraints used by Prisma.
ALTER TABLE `organization` MODIFY `referralCode` VARCHAR(191) NOT NULL;
SET @has_referral_idx = (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'organization'
    AND index_name = 'Organization_referralCode_key'
);
SET @create_referral_idx_sql = IF(
  @has_referral_idx = 0,
  'CREATE UNIQUE INDEX `Organization_referralCode_key` ON `organization`(`referralCode`)',
  'SELECT 1'
);
PREPARE create_referral_idx_stmt FROM @create_referral_idx_sql;
EXECUTE create_referral_idx_stmt;
DEALLOCATE PREPARE create_referral_idx_stmt;
