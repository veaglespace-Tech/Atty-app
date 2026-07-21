-- Add organization-level attendance timing configuration.
ALTER TABLE `organization`
  ADD COLUMN `attendanceStartTime` VARCHAR(191) NOT NULL DEFAULT '09:00',
  ADD COLUMN `attendanceEndTime` VARCHAR(191) NOT NULL DEFAULT '18:00',
  ADD COLUMN `lateGraceMinutes` INTEGER NOT NULL DEFAULT 0;

-- Keep archive table aligned for historical snapshots.
ALTER TABLE `archive_org`
  ADD COLUMN `attendanceStartTime` VARCHAR(191) NULL,
  ADD COLUMN `attendanceEndTime` VARCHAR(191) NULL,
  ADD COLUMN `lateGraceMinutes` INTEGER NULL;
