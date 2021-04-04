ALTER TABLE `daggout`.`receipt_item` 
DROP COLUMN `details`,
ADD COLUMN `amount` FLOAT NOT NULL AFTER `id`,
ADD COLUMN `category` VARCHAR(45) NOT NULL AFTER `amount`,
ADD COLUMN `color` VARCHAR(45) NULL AFTER `category`,
ADD COLUMN `name` VARCHAR(100) NOT NULL AFTER `color`;