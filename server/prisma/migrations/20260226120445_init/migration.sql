/*
  Warnings:

  - Made the column `startDate` on table `subscription` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX `Subscription_orgId_status_idx` ON `subscription`;

-- AlterTable
ALTER TABLE `subscription` MODIFY `startDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
