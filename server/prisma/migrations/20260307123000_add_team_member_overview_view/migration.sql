DROP VIEW IF EXISTS `team_member_overview`;

CREATE VIEW `team_member_overview` AS
SELECT
  t.`id` AS `teamId`,
  t.`name` AS `teamName`,
  t.`orgId` AS `orgId`,
  t.`leaderId` AS `leaderId`,
  t.`isActive` AS `isActive`,
  tm.`id` AS `teamMemberId`,
  tm.`userId` AS `userId`,
  u.`name` AS `memberName`,
  u.`email` AS `memberEmail`,
  tm.`createdAt` AS `memberAddedAt`
FROM `Team` t
LEFT JOIN `TeamMember` tm ON tm.`teamId` = t.`id`
LEFT JOIN `User` u ON u.`id` = tm.`userId`
WHERE t.`deletedAt` IS NULL;
