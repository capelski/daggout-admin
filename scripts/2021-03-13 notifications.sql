ALTER TABLE `receipt` 
ADD COLUMN `devolutionPeriod` INT(11) NULL AFTER `brand`,
ADD COLUMN `notificationAdvance` INT(11) NULL AFTER `devolutionPeriod`,
ADD COLUMN `notificationDate` DATETIME NULL AFTER `notificationAdvance`;
