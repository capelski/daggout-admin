ALTER TABLE `daggout`.`receipt_item` 
DROP FOREIGN KEY `receipt_id`;
ALTER TABLE `daggout`.`receipt_item` 
CHANGE COLUMN `receipt_id` `receiptId` INT(11) NOT NULL ;
ALTER TABLE `daggout`.`receipt_item` 
ADD CONSTRAINT `receipt_id`
  FOREIGN KEY (`receiptId`)
  REFERENCES `daggout`.`receipt` (`id`)
  ON DELETE CASCADE
  ON UPDATE NO ACTION;
