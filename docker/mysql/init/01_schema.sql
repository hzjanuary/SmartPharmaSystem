CREATE TABLE IF NOT EXISTS user (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_category (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product (
  product_id INT AUTO_INCREMENT PRIMARY KEY,
  product_code VARCHAR(100) UNIQUE,
  product_name VARCHAR(255) NOT NULL,
  category_id INT NULL,
  unit VARCHAR(50) NULL,
  purchase_price DECIMAL(15,2) DEFAULT 0,
  selling_price DECIMAL(15,2) DEFAULT 0,
  quantity INT NOT NULL DEFAULT 0,
  expiry_date DATE NULL,
  image VARCHAR(255) NULL,
  description TEXT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_category
    FOREIGN KEY (category_id) REFERENCES product_category(category_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS history_import (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  category_id INT NULL,
  unit VARCHAR(50) NULL,
  purchase_price DECIMAL(15,2) DEFAULT 0,
  quantity INT NOT NULL DEFAULT 0,
  image VARCHAR(255) NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_product
    FOREIGN KEY (product_id) REFERENCES product(product_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_history_category
    FOREIGN KEY (category_id) REFERENCES product_category(category_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

INSERT INTO user (username, password, full_name, role)
SELECT 'admin', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'System Manager', 'manager'
WHERE NOT EXISTS (SELECT 1 FROM user WHERE username = 'admin');

INSERT INTO product_category (category_name, description)
SELECT 'Giam dau', 'Nhom thuoc giam dau, ha sot thong dung'
WHERE NOT EXISTS (SELECT 1 FROM product_category WHERE category_name = 'Giam dau');

INSERT INTO product_category (category_name, description)
SELECT 'Vitamin', 'Nhom vitamin va thuc pham bo sung'
WHERE NOT EXISTS (SELECT 1 FROM product_category WHERE category_name = 'Vitamin');

INSERT INTO product_category (category_name, description)
SELECT 'Tim mach', 'Nhom thuoc tim mach co ban'
WHERE NOT EXISTS (SELECT 1 FROM product_category WHERE category_name = 'Tim mach');

INSERT INTO product (product_code, product_name, quantity, expiry_date, status)
SELECT 'P001', 'Paracetamol 500mg', 120, DATE_ADD(CURDATE(), INTERVAL 8 DAY), 1
WHERE NOT EXISTS (SELECT 1 FROM product WHERE product_code = 'P001');

INSERT INTO product (product_code, product_name, quantity, expiry_date, status)
SELECT 'P002', 'Vitamin C 500mg', 200, DATE_ADD(CURDATE(), INTERVAL 45 DAY), 1
WHERE NOT EXISTS (SELECT 1 FROM product WHERE product_code = 'P002');

INSERT INTO product (product_code, product_name, quantity, expiry_date, status)
SELECT 'P003', 'Omega-3', 90, DATE_ADD(CURDATE(), INTERVAL 95 DAY), 1
WHERE NOT EXISTS (SELECT 1 FROM product WHERE product_code = 'P003');

UPDATE product
SET category_id = (SELECT category_id FROM product_category WHERE category_name = 'Giam dau' LIMIT 1)
WHERE product_code = 'P001' AND category_id IS NULL;

UPDATE product
SET category_id = (SELECT category_id FROM product_category WHERE category_name = 'Vitamin' LIMIT 1)
WHERE product_code = 'P002' AND category_id IS NULL;

UPDATE product
SET category_id = (SELECT category_id FROM product_category WHERE category_name = 'Tim mach' LIMIT 1)
WHERE product_code = 'P003' AND category_id IS NULL;

INSERT INTO history_import (product_id, product_name, category_id, unit, purchase_price, quantity, image, description)
SELECT p.product_id, p.product_name, p.category_id, 'hop', 15000, 120, NULL, 'Nhap kho khoi tao'
FROM product p
WHERE p.product_code = 'P001'
  AND NOT EXISTS (
    SELECT 1 FROM history_import h WHERE h.product_id = p.product_id
  );

INSERT INTO history_import (product_id, product_name, category_id, unit, purchase_price, quantity, image, description)
SELECT p.product_id, p.product_name, p.category_id, 'chai', 45000, 200, NULL, 'Nhap kho khoi tao'
FROM product p
WHERE p.product_code = 'P002'
  AND NOT EXISTS (
    SELECT 1 FROM history_import h WHERE h.product_id = p.product_id
  );

INSERT INTO history_import (product_id, product_name, category_id, unit, purchase_price, quantity, image, description)
SELECT p.product_id, p.product_name, p.category_id, 'hop', 60000, 90, NULL, 'Nhap kho khoi tao'
FROM product p
WHERE p.product_code = 'P003'
  AND NOT EXISTS (
    SELECT 1 FROM history_import h WHERE h.product_id = p.product_id
  );
