ALTER TABLE `receipt` 
ADD COLUMN `userId` VARCHAR(30) NOT NULL AFTER `reference`;
