DROP TRIGGER IF EXISTS subscription_set_end_date_before_update;
CREATE TRIGGER subscription_set_end_date_before_update
BEFORE UPDATE ON subscription
FOR EACH ROW
SET NEW.endDate = IF(
  NEW.startDate <> OLD.startDate,
  DATE_ADD(
    NEW.startDate,
    INTERVAL IFNULL((SELECT durationInDays FROM plan WHERE id = NEW.planId LIMIT 1), 30) DAY
  ),
  NEW.endDate
);
