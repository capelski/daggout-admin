ALTER TABLE `receipt` 
CHANGE COLUMN `date` `purchaseDate` DATETIME NOT NULL ;

ALTER TABLE `receipt` 
ADD COLUMN `pictureId` VARCHAR(30) NOT NULL AFTER `brand`;
