ALTER TABLE `Attendance`
  ADD COLUMN `punchInSelfieUrl` VARCHAR(191) NULL,
  ADD COLUMN `punchInSelfiePublicId` VARCHAR(191) NULL,
  ADD COLUMN `punchOutSelfieUrl` VARCHAR(191) NULL,
  ADD COLUMN `punchOutSelfiePublicId` VARCHAR(191) NULL;
