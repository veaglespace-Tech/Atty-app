-- Add member profile fields to registration requests.
ALTER TABLE `registration_request`
  ADD COLUMN `emergencyContact` VARCHAR(191) NULL,
  ADD COLUMN `currentAddress` VARCHAR(191) NULL,
  ADD COLUMN `permanentAddress` VARCHAR(191) NULL;

-- Add member profile fields to users.
ALTER TABLE `user`
  ADD COLUMN `emergencyContact` VARCHAR(191) NULL,
  ADD COLUMN `currentAddress` VARCHAR(191) NULL,
  ADD COLUMN `permanentAddress` VARCHAR(191) NULL;
