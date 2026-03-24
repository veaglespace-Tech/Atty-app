ALTER TABLE `Organization`
  ADD COLUMN `orgAdminId` INTEGER NULL;

CREATE UNIQUE INDEX `Organization_orgAdminId_key` ON `Organization`(`orgAdminId`);
CREATE INDEX `Organization_orgAdminId_idx` ON `Organization`(`orgAdminId`);

ALTER TABLE `Organization`
  ADD CONSTRAINT `Organization_orgAdminId_fkey`
  FOREIGN KEY (`orgAdminId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
