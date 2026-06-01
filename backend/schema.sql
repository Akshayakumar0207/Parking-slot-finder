-- ============================================================
--  ParkEase — MySQL Schema
--  Steps: File → Open SQL Script → select this file → Execute ⚡
-- ============================================================

CREATE DATABASE IF NOT EXISTS parkease
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE parkease;

-- ── Users ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(120) NOT NULL,
    email      VARCHAR(180) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    phone      VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── User Profile (location + vehicle) ─────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL UNIQUE,
    location_name VARCHAR(200),
    lat           DECIMAL(10,7) DEFAULT 12.9716000,
    lng           DECIMAL(10,7) DEFAULT 77.5946000,
    vehicle_type  ENUM('car','twoWheeler','heavy') DEFAULT 'car',
    vehicle_model VARCHAR(100),
    vehicle_number VARCHAR(20),
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Parking Lots ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_lots (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    lot_key        VARCHAR(60)   NOT NULL UNIQUE,
    name           VARCHAR(200)  NOT NULL,
    address        VARCHAR(300)  NOT NULL,
    lat            DECIMAL(10,7) NOT NULL,
    lng            DECIMAL(10,7) NOT NULL,
    distance_km    DECIMAL(5,2)  DEFAULT 0,
    rating         DECIMAL(3,1)  DEFAULT 0,
    is_open        TINYINT(1)    DEFAULT 1,
    is_city_center TINYINT(1)    DEFAULT 0,
    amenities      TEXT,
    owner_id       INT,
    pricing_tier   VARCHAR(20)   DEFAULT 'standard',
    created_at     DATETIME      DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ── Parking Slots ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_slots (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    lot_id       INT NOT NULL,
    vehicle_type ENUM('car','twoWheeler','heavy') NOT NULL,
    slot_number  INT NOT NULL,
    status       ENUM('available','occupied','reserved') DEFAULT 'available',
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE,
    UNIQUE KEY uq_slot (lot_id, vehicle_type, slot_number)
);

-- ── Pricing ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pricing (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    lot_id            INT NOT NULL UNIQUE,
    price_car         INT DEFAULT 100,
    price_two_wheeler INT DEFAULT 50,
    price_heavy       INT DEFAULT 200,
    FOREIGN KEY (lot_id) REFERENCES parking_lots(id) ON DELETE CASCADE
);

-- ── Bookings ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    booking_ref    VARCHAR(60)  NOT NULL UNIQUE,
    user_id        INT          NOT NULL,
    lot_id         INT          NOT NULL,
    slot_id        INT          NOT NULL,
    vehicle_type   ENUM('car','twoWheeler','heavy') NOT NULL,
    hours          INT          NOT NULL DEFAULT 1,
    rate_per_hour  INT          NOT NULL,
    total_amount   INT          NOT NULL,
    payment_method VARCHAR(30)  DEFAULT 'UPI',
    status         ENUM('confirmed','active','completed','cancelled') DEFAULT 'confirmed',
    check_in       DATETIME     NOT NULL,
    check_out      DATETIME     NOT NULL,
    created_at     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (lot_id)  REFERENCES parking_lots(id),
    FOREIGN KEY (slot_id) REFERENCES parking_slots(id)
);

-- ── Seed Lots (Bengaluru) ──────────────────────────────────
INSERT IGNORE INTO parking_lots
  (lot_key, name, address, lat, lng, distance_km, rating, is_open, is_city_center, amenities)
VALUES
  ('park_001','Nexus Mall Parking',    'Nexus Mall, Whitefield, Bengaluru',        12.9698000,77.7499000,0.4,4.5,1,0,'["CCTV","24/7","EV Charging"]'),
  ('park_002','Forum Value Mall',      'Whitefield Main Road, Bengaluru',          12.9715000,77.7408000,1.2,4.2,1,0,'["CCTV","Covered","Security"]'),
  ('park_003','EPIP Zone Parking Hub', 'EPIP Zone, Whitefield, Bengaluru',         12.9752000,77.7358000,1.8,3.9,1,0,'["Open Air","Budget"]'),
  ('park_004','Prestige Tech Park',    'Outer Ring Road, Marathahalli, Bengaluru', 12.9444000,77.7002000,2.5,4.7,0,0,'["CCTV","Covered","24/7","Valet"]'),
  ('park_005','Brookefield Smart Lot', 'Brookefield, Bengaluru',                   12.9825000,77.7215000,3.1,4.1,1,0,'["CCTV","Open Air"]'),
  ('park_006','MG Road Metro Parking', 'MG Road, Central Bengaluru',               12.9757000,77.6098000,4.0,4.3,1,1,'["CCTV","Covered","Metro Access"]');

INSERT IGNORE INTO pricing (lot_id,price_car,price_two_wheeler,price_heavy)
  SELECT id,100,50,200  FROM parking_lots WHERE lot_key='park_001';
INSERT IGNORE INTO pricing (lot_id,price_car,price_two_wheeler,price_heavy)
  SELECT id,80,40,180   FROM parking_lots WHERE lot_key='park_002';
INSERT IGNORE INTO pricing (lot_id,price_car,price_two_wheeler,price_heavy)
  SELECT id,60,30,150   FROM parking_lots WHERE lot_key='park_003';
INSERT IGNORE INTO pricing (lot_id,price_car,price_two_wheeler,price_heavy)
  SELECT id,120,60,250  FROM parking_lots WHERE lot_key='park_004';
INSERT IGNORE INTO pricing (lot_id,price_car,price_two_wheeler,price_heavy)
  SELECT id,70,35,160   FROM parking_lots WHERE lot_key='park_005';
INSERT IGNORE INTO pricing (lot_id,price_car,price_two_wheeler,price_heavy)
  SELECT id,140,70,0    FROM parking_lots WHERE lot_key='park_006';

DROP PROCEDURE IF EXISTS seed_slots;
DELIMITER $$
CREATE PROCEDURE seed_slots()
BEGIN
  DECLARE done INT DEFAULT 0;
  DECLARE v_lot_id INT;
  DECLARE v_key VARCHAR(60);
  DECLARE v_car INT; DECLARE v_tw INT; DECLARE v_hv INT;
  DECLARE i INT;
  DROP TEMPORARY TABLE IF EXISTS _caps;
  CREATE TEMPORARY TABLE _caps (k VARCHAR(60), c INT, t INT, h INT);
  INSERT INTO _caps VALUES
    ('park_001',40,80,5),('park_002',60,100,8),
    ('park_003',25,50,3),('park_004',120,200,15),
    ('park_005',30,60,4),('park_006',50,90,0);
  BEGIN
    DECLARE cur CURSOR FOR
      SELECT p.id,c.k,c.c,c.t,c.h FROM _caps c JOIN parking_lots p ON p.lot_key=c.k;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
    OPEN cur;
    lp: LOOP
      FETCH cur INTO v_lot_id,v_key,v_car,v_tw,v_hv;
      IF done THEN LEAVE lp; END IF;
      SET i=1; WHILE i<=v_car DO
        INSERT IGNORE INTO parking_slots(lot_id,vehicle_type,slot_number,status)
        VALUES(v_lot_id,'car',i,IF(RAND()<0.45,'occupied','available')); SET i=i+1; END WHILE;
      SET i=1; WHILE i<=v_tw DO
        INSERT IGNORE INTO parking_slots(lot_id,vehicle_type,slot_number,status)
        VALUES(v_lot_id,'twoWheeler',i,IF(RAND()<0.35,'occupied','available')); SET i=i+1; END WHILE;
      SET i=1; WHILE i<=v_hv DO
        INSERT IGNORE INTO parking_slots(lot_id,vehicle_type,slot_number,status)
        VALUES(v_lot_id,'heavy',i,IF(RAND()<0.30,'occupied','available')); SET i=i+1; END WHILE;
    END LOOP; CLOSE cur;
  END;
  DROP TEMPORARY TABLE IF EXISTS _caps;
END$$
DELIMITER ;
CALL seed_slots();
DROP PROCEDURE IF EXISTS seed_slots;
SELECT CONCAT('✅ Done — lots:', COUNT(*)) AS status FROM parking_lots;
