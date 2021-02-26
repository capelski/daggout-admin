CREATE TABLE `daggout`.`receipt` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `address` VARCHAR(100) NOT NULL,
  `amount` FLOAT NOT NULL,
  `date` DATETIME NOT NULL,
  `reference` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id`));

CREATE TABLE `daggout`.`receipt_item` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `details` VARCHAR(100) NULL,
  `quantity` INT NULL,
  `referenceId` VARCHAR(50) NULL,
  `size` VARCHAR(25) NULL,
  `receipt_id` INT NULL,
  PRIMARY KEY (`id`),
  INDEX `receipt_id_idx` (`receipt_id` ASC),
  CONSTRAINT `receipt_id`
    FOREIGN KEY (`receipt_id`)
    REFERENCES `daggout`.`receipt` (`id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION);