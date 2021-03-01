ALTER TABLE `daggout`.`receipt_item` 
CHANGE COLUMN `receiptId` `receiptId` INT(11) NOT NULL AFTER `quantity`,
CHANGE COLUMN `quantity` `quantity` INT(11) NOT NULL ,
CHANGE COLUMN `referenceId` `reference` VARCHAR(50) NOT NULL ;

ALTER TABLE `daggout`.`receipt` 
ADD COLUMN `brand` VARCHAR(30) NOT NULL AFTER `amount`;
