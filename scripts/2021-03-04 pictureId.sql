ALTER TABLE `daggout`.`receipt` 
CHANGE COLUMN `date` `purchaseDate` DATETIME NOT NULL ;

ALTER TABLE `daggout`.`receipt` 
ADD COLUMN `pictureId` VARCHAR(30) NOT NULL AFTER `brand`;
