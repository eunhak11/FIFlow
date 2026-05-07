-- =============================================
-- FIFlow v2 MySQL 스키마
-- KT Cloud 서버에서 실행
-- =============================================

CREATE DATABASE IF NOT EXISTS fiflow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fiflow;

-- users 테이블
CREATE TABLE IF NOT EXISTS users (
  id         VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  kakao_id   VARCHAR(255) UNIQUE NOT NULL,
  email      VARCHAR(255),
  nickname   VARCHAR(255),
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- watchlist 테이블 (관심 종목)
CREATE TABLE IF NOT EXISTS watchlist (
  id          VARCHAR(36)  PRIMARY KEY DEFAULT (UUID()),
  user_id     VARCHAR(36)  NOT NULL,
  symbol      VARCHAR(20)  NOT NULL,
  name        VARCHAR(255) NOT NULL,
  is_favorite TINYINT(1)   DEFAULT 0,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_symbol (user_id, symbol)
);

-- index_data 테이블 (지수 실시간)
CREATE TABLE IF NOT EXISTS index_data (
  id          VARCHAR(36)   PRIMARY KEY DEFAULT (UUID()),
  index_name  VARCHAR(20)   UNIQUE NOT NULL,
  price       DECIMAL(12,2) NOT NULL DEFAULT 0,
  `change`    DECIMAL(12,2) NOT NULL DEFAULT 0,
  change_rate DECIMAL(8,4)  NOT NULL DEFAULT 0,
  updated_at  DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 초기 지수 데이터 (upsert 대상)
INSERT INTO index_data (index_name, price, `change`, change_rate)
VALUES ('KOSPI', 0, 0, 0), ('KOSDAQ', 0, 0, 0), ('KPI200', 0, 0, 0)
ON DUPLICATE KEY UPDATE index_name = index_name;

-- foreign_trading 테이블 (외국인 순매매)
CREATE TABLE IF NOT EXISTS foreign_trading (
  id         VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  symbol     VARCHAR(20) NOT NULL,
  trade_date DATE        NOT NULL,
  net_buy    BIGINT      NOT NULL,
  created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_symbol_date (symbol, trade_date)
);
