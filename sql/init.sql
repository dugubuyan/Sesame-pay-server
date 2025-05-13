CREATE DATABASE IF NOT EXISTS sesame_pay;
USE sesame_pay;

DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'ID，主键，唯一，递增',
  `user_name` VARCHAR(128) DEFAULT '' NOT NULL,
  `address` VARCHAR(128) DEFAULT '' NOT NULL,
  `safe_account` VARCHAR(128) DEFAULT '' NOT NULL COMMENT '组织安全账户地址',
  `role` ENUM('signer', 'worker') DEFAULT 'worker' NOT NULL COMMENT '用户角色：signer-签名者,worker-普通成员',
  `user_status` TINYINT DEFAULT '0' NOT NULL COMMENT '0-正常,1-注销，2-暂停',
  `chain_id` bigint DEFAULT 0 NOT NULL COMMENT '链ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_address_chain` (`address`, `chain_id`),
  KEY `idx_safe_account` (`safe_account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `payroll`;
CREATE TABLE `payroll` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'ID，主键，唯一，递增',
  `name` VARCHAR(128) DEFAULT '' NOT NULL COMMENT '员工姓名',
  `address` VARCHAR(128) DEFAULT '' NOT NULL COMMENT '员工钱包地址',
  `safe_account` VARCHAR(128) DEFAULT '' NOT NULL COMMENT '组织安全账户地址',
  `base_salary` decimal(20,2) DEFAULT '0.00' NOT NULL COMMENT '基本工资',
  `bonus` decimal(20,2) DEFAULT '0.00' NOT NULL COMMENT '奖金',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_address_safe` (`address`, `safe_account`),
  KEY `idx_safe_account` (`safe_account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `transactions`;
CREATE TABLE `transactions` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'ID，主键，唯一，递增',
  `safe_account` VARCHAR(128) DEFAULT '' NOT NULL COMMENT '组织安全账户地址',
  `propose_address` VARCHAR(128) DEFAULT '' NOT NULL COMMENT '交易发起人钱包地址',
  `transaction_details` JSON NOT NULL COMMENT '交易详细信息，包含每笔交易的金额和说明',
  `total` decimal(20,6) DEFAULT '0.000000' NOT NULL COMMENT '交易总金额',
  `status` TINYINT DEFAULT '0' NOT NULL COMMENT '交易状态：0-待处理,1-已完成,2-失败，3-未知',
  `transaction_hash` VARCHAR(128) DEFAULT '' NOT NULL COMMENT '交易哈希',
  `chain_id` bigint DEFAULT 0 NOT NULL COMMENT '链ID',
  `commit_hash` VARCHAR(128) DEFAULT '' NOT NULL COMMENT '提交哈希',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_trans` (`transaction_hash`, `chain_id`),
  KEY `idx_safe_account` (`safe_account`),
  KEY `idx_propose_address` (`propose_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `tran_history`;
CREATE TABLE `tran_history` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'ID，主键，唯一，递增',
  `name` VARCHAR(128) DEFAULT '' NOT NULL COMMENT '员工姓名',
  `address` VARCHAR(128) DEFAULT '' NOT NULL COMMENT '员工钱包地址',
  `amount` decimal(20,2) DEFAULT '0.00' NOT NULL COMMENT '支付金额',
  `pay_time` datetime NOT NULL COMMENT '支付时间',
  `commit_hash` VARCHAR(128) DEFAULT '' NOT NULL COMMENT '提交哈希',
  `safe_account` VARCHAR(128) DEFAULT '' NOT NULL COMMENT '组织安全账户地址',
  `chain_id` bigint DEFAULT 0 NOT NULL COMMENT '链ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_address` (`address`,`safe_account`, `chain_id`),
  KEY `idx_pay_time` (`pay_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
