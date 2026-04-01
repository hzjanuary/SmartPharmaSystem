-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th3 23, 2026 lúc 03:58 PM
-- Phiên bản máy phục vụ: 10.4.32-MariaDB
-- Phiên bản PHP: 8.1.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `pharmacymanagement`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `history_activity`
--

CREATE TABLE `history_activity` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action` varchar(20) NOT NULL,
  `entity` varchar(50) NOT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `history_activity`
--

INSERT INTO `history_activity` (`id`, `user_id`, `action`, `entity`, `entity_id`, `description`, `created_at`) VALUES
(1, 4, 'CREATE', 'product_category', 6, 'User admin created category \"Thuốc chóng say xe\" (category_id = 6)', '2026-03-23 21:25:28');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `history_import`
--

CREATE TABLE `history_import` (
  `history_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `purchase_price` decimal(10,2) DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `history_import`
--

INSERT INTO `history_import` (`history_id`, `product_id`, `product_name`, `category_id`, `unit`, `purchase_price`, `quantity`, `image`, `description`, `created_at`) VALUES
(1, 1, 'Paracetamol 500mg', 1, 'Hộp', 2000.00, 100, 'paracetamol.jpg', 'Nhập lô thuốc tháng 3', '2026-03-11 15:45:44'),
(2, 8, 'Cốm lợi khuẩn Lactomin Plus Novarex (30 gói)', 3, 'Hộp', 145000.00, 120, NULL, 'Nhập kho theo dữ liệu tham chiếu Long Châu', '2026-03-12 08:15:00'),
(3, 9, 'Pregnacare Max Omega 3 DHA (84 viên)', 3, 'Hộp', 470000.00, 60, NULL, 'Nhập kho theo dữ liệu tham chiếu Long Châu', '2026-03-12 08:20:00'),
(4, 10, 'PediaSure hương vani (800g)', 3, 'Hộp', 650000.00, 55, NULL, 'Nhập kho theo dữ liệu tham chiếu Long Châu', '2026-03-12 08:30:00'),
(5, 11, 'Ensure Original hương vani 237ml', 3, 'Chai', 32000.00, 300, NULL, 'Nhập kho theo dữ liệu tham chiếu Long Châu', '2026-03-12 08:35:00'),
(6, 12, 'Ensure Gold StrengthPro hương vani (380g)', 3, 'Hộp', 390000.00, 75, NULL, 'Nhập kho theo dữ liệu tham chiếu Long Châu', '2026-03-12 08:40:00'),
(7, 13, 'Anlene Total 10 hương vani (800g)', 3, 'Hộp', 535000.00, 48, NULL, 'Nhập kho theo dữ liệu tham chiếu Long Châu', '2026-03-12 08:45:00'),
(8, 14, 'Nutifood Varna Diabetes (850g)', 3, 'Hộp', 510000.00, 42, NULL, 'Nhập kho theo dữ liệu tham chiếu Long Châu', '2026-03-12 08:50:00'),
(9, 15, 'Nutifood Varna Colostrum (850g)', 3, 'Hộp', 530000.00, 46, NULL, 'Nhập kho theo dữ liệu tham chiếu Long Châu', '2026-03-12 08:55:00'),
(10, 16, 'Máy đo huyết áp Omron HEM 8712', 4, 'Hộp', 720000.00, 35, NULL, 'Nhập kho thiết bị y tế', '2026-03-12 09:05:00'),
(11, 17, 'Máy đo huyết áp Omron HEM 7383T1 Afib', 4, 'Hộp', 1980000.00, 18, NULL, 'Nhập kho thiết bị y tế', '2026-03-12 09:10:00'),
(12, 18, 'Máy đo đường huyết Accu Chek Instant', 4, 'Hộp', 810000.00, 33, NULL, 'Nhập kho thiết bị y tế', '2026-03-12 09:20:00'),
(13, 19, 'Máy đo đường huyết Accu Chek Guide', 4, 'Hộp', 1030000.00, 22, NULL, 'Nhập kho thiết bị y tế', '2026-03-12 09:25:00'),
(14, 20, 'Combo que thử Easy Max + máy đo', 4, 'Hộp', 545000.00, 40, NULL, 'Nhập kho thiết bị y tế', '2026-03-12 09:30:00'),
(15, 21, 'Máy xông khí dung Omron NE C106', 4, 'Hộp', 680000.00, 20, NULL, 'Nhập kho thiết bị y tế', '2026-03-12 09:40:00'),
(16, 22, 'Máy xông khí dung Yuwell M103', 4, 'Hộp', 980000.00, 16, NULL, 'Nhập kho thiết bị y tế', '2026-03-12 09:45:00'),
(17, 23, 'Nhiệt kế hồng ngoại Yuwell YT-1C', 4, 'Hộp', 490000.00, 28, NULL, 'Nhập kho thiết bị y tế', '2026-03-12 09:50:00'),
(18, 24, 'Xịt mũi ion muối Fujiwa 90ml', 4, 'Chai', 30000.00, 150, NULL, 'Nhập kho thiết bị y tế', '2026-03-12 09:55:00'),
(19, 25, 'Xịt mũi nano bạc Fujisalt 70ml', 4, 'Chai', 34000.00, 160, NULL, 'Nhập kho thiết bị y tế', '2026-03-12 10:00:00'),
(20, 26, 'Nước súc miệng ion muối Fujiwa 680ml', 4, 'Chai', 20000.00, 210, NULL, 'Nhập kho chăm sóc cá nhân', '2026-03-12 10:05:00'),
(21, 27, 'Khẩu trang Safefit 4 lớp (50 cái)', 4, 'Hộp', 42000.00, 180, NULL, 'Nhập kho vật tư y tế', '2026-03-12 10:10:00');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `product`
--

CREATE TABLE `product` (
  `product_id` int(11) NOT NULL,
  `product_code` varchar(50) DEFAULT NULL,
  `product_name` varchar(200) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `purchase_price` decimal(10,2) DEFAULT NULL,
  `selling_price` decimal(10,2) DEFAULT NULL,
  `quantity` int(11) DEFAULT 0,
  `expiry_date` date DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` tinyint(4) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `product`
--

INSERT INTO `product` (`product_id`, `product_code`, `product_name`, `category_id`, `unit`, `purchase_price`, `selling_price`, `quantity`, `expiry_date`, `image`, `description`, `created_at`, `status`) VALUES
(8, 'LC0008', 'Cốm lợi khuẩn Lactomin Plus Novarex (30 gói)', 3, 'Hộp', 145000.00, 174000.00, 120, '2027-12-31', NULL, 'Sản phẩm tham chiếu từ nhathuoclongchau.com.vn', '2026-03-12 08:15:00', 1),
(9, 'LC0009', 'Pregnacare Max Omega 3 DHA (84 viên)', 3, 'Hộp', 470000.00, 550000.00, 60, '2028-06-30', NULL, 'Sản phẩm tham chiếu từ nhathuoclongchau.com.vn', '2026-03-12 08:20:00', 1),
(10, 'LC0010', 'PediaSure hương vani (800g)', 3, 'Hộp', 650000.00, 688000.00, 55, '2027-11-30', NULL, 'Sản phẩm dinh dưỡng', '2026-03-12 08:30:00', 1),
(11, 'LC0011', 'Ensure Original hương vani 237ml', 3, 'Chai', 32000.00, 41000.00, 300, '2027-10-31', NULL, 'Sản phẩm dinh dưỡng', '2026-03-12 08:35:00', 1),
(12, 'LC0012', 'Ensure Gold StrengthPro hương vani (380g)', 3, 'Hộp', 390000.00, 435000.00, 75, '2027-12-15', NULL, 'Sản phẩm dinh dưỡng', '2026-03-12 08:40:00', 1),
(13, 'LC0013', 'Anlene Total 10 hương vani (800g)', 3, 'Hộp', 535000.00, 629000.00, 48, '2028-01-31', NULL, 'Sản phẩm dinh dưỡng', '2026-03-12 08:45:00', 1),
(14, 'LC0014', 'Nutifood Varna Diabetes (850g)', 3, 'Hộp', 510000.00, 605000.00, 42, '2027-09-30', NULL, 'Sản phẩm dinh dưỡng cho người tiểu đường', '2026-03-12 08:50:00', 1),
(15, 'LC0015', 'Nutifood Varna Colostrum (850g)', 3, 'Hộp', 530000.00, 630000.00, 46, '2027-09-30', NULL, 'Sản phẩm hỗ trợ đề kháng', '2026-03-12 08:55:00', 1),
(16, 'LC0016', 'Máy đo huyết áp Omron HEM 8712', 4, 'Hộp', 720000.00, 940000.00, 35, '2030-12-31', NULL, 'Thiết bị y tế gia đình', '2026-03-12 09:05:00', 1),
(17, 'LC0017', 'Máy đo huyết áp Omron HEM 7383T1 Afib', 4, 'Hộp', 1980000.00, 2690000.00, 18, '2031-12-31', NULL, 'Thiết bị y tế gia đình', '2026-03-12 09:10:00', 1),
(18, 'LC0018', 'Máy đo đường huyết Accu Chek Instant', 4, 'Hộp', 810000.00, 1000000.00, 33, '2031-12-31', NULL, 'Thiết bị theo dõi đường huyết', '2026-03-12 09:20:00', 1),
(19, 'LC0019', 'Máy đo đường huyết Accu Chek Guide', 4, 'Hộp', 1030000.00, 1300000.00, 22, '2031-12-31', NULL, 'Thiết bị theo dõi đường huyết', '2026-03-12 09:25:00', 1),
(20, 'LC0020', 'Combo que thử Easy Max + máy đo', 4, 'Hộp', 545000.00, 699000.00, 40, '2031-12-31', NULL, 'Combo thiết bị đo đường huyết', '2026-03-12 09:30:00', 1),
(21, 'LC0021', 'Máy xông khí dung Omron NE C106', 4, 'Hộp', 680000.00, 830000.00, 20, '2031-12-31', NULL, 'Thiết bị hỗ trợ hô hấp', '2026-03-12 09:40:00', 1),
(22, 'LC0022', 'Máy xông khí dung Yuwell M103', 4, 'Hộp', 980000.00, 1190000.00, 16, '2031-12-31', NULL, 'Thiết bị hỗ trợ hô hấp', '2026-03-12 09:45:00', 1),
(23, 'LC0023', 'Nhiệt kế hồng ngoại Yuwell YT-1C', 4, 'Hộp', 490000.00, 590000.00, 28, '2031-12-31', NULL, 'Thiết bị đo thân nhiệt', '2026-03-12 09:50:00', 1),
(24, 'LC0024', 'Xịt mũi ion muối Fujiwa 90ml', 4, 'Chai', 30000.00, 42000.00, 150, '2028-03-31', NULL, 'Dung dịch hỗ trợ vệ sinh mũi', '2026-03-12 09:55:00', 1),
(25, 'LC0025', 'Xịt mũi nano bạc Fujisalt 70ml', 4, 'Chai', 34000.00, 45000.00, 160, '2028-03-31', NULL, 'Dung dịch hỗ trợ vệ sinh mũi', '2026-03-12 10:00:00', 1),
(26, 'LC0026', 'Nước súc miệng ion muối Fujiwa 680ml', 4, 'Chai', 20000.00, 27000.00, 210, '2028-07-31', NULL, 'Sản phẩm chăm sóc răng miệng', '2026-03-12 10:05:00', 1),
(27, 'LC0027', 'Khẩu trang Safefit 4 lớp (50 cái)', 4, 'Hộp', 42000.00, 50000.00, 180, '2030-12-31', NULL, 'Vật tư y tế tiêu hao', '2026-03-12 10:10:00', 1),
(28, 'LC0028', 'Khẩu trang Famapro Extra 4 lớp (50 cái)', 4, 'Hộp', 32000.00, 40000.00, 190, '2030-12-31', NULL, 'Vật tư y tế tiêu hao', '2026-03-12 10:15:00', 1),
(29, 'LC0029', 'Khẩu trang trẻ em Dolphin Mask 3D (10 cái)', 4, 'Hộp', 18000.00, 24000.00, 220, '2030-12-31', NULL, 'Khẩu trang trẻ em', '2026-03-12 10:20:00', 1),
(30, 'LC0030', 'Kem chống nắng La Roche-Posay UVMune 400 Oil Control 50ml', 3, 'Tuýp', 420000.00, 590000.00, 70, '2028-12-31', NULL, 'Dược mỹ phẩm tham chiếu Long Châu', '2026-03-12 10:30:00', 1),
(31, 'LC0031', 'Gel rửa mặt SVR Sebiaclear Gel Moussant 55ml', 3, 'Tuýp', 98000.00, 140000.00, 120, '2028-10-31', NULL, 'Dược mỹ phẩm tham chiếu Long Châu', '2026-03-12 10:35:00', 1),
(32, 'LC0032', 'Gel rửa mặt Uriage Hyséac Gel Nettoyant 150ml', 3, 'Tuýp', 275000.00, 395000.00, 80, '2028-10-31', NULL, 'Dược mỹ phẩm tham chiếu Long Châu', '2026-03-12 10:40:00', 1),
(33, 'LC0033', 'La Roche-Posay Cicaplast Baume B5+ 40ml', 3, 'Tuýp', 300000.00, 440000.00, 64, '2029-05-31', NULL, 'Dược mỹ phẩm phục hồi da', '2026-03-12 10:45:00', 1),
(34, 'LC0034', 'La Roche-Posay Cicaplast Baume B5+ 100ml', 3, 'Tuýp', 620000.00, 880000.00, 36, '2029-05-31', NULL, 'Dược mỹ phẩm phục hồi da', '2026-03-12 10:50:00', 1),
(35, 'LC0035', 'Vichy Liftactiv Collagen Specialist Day 50ml', 3, 'Hộp', 890000.00, 1260000.00, 32, '2029-06-30', NULL, 'Dược mỹ phẩm chăm sóc da', '2026-03-12 10:55:00', 1),
(36, 'LC0036', 'Vichy Mineral 89 Booster 50ml', 3, 'Hộp', 860000.00, 1215000.00, 30, '2029-06-30', NULL, 'Dược mỹ phẩm chăm sóc da', '2026-03-12 11:00:00', 1),
(37, 'LC0037', 'CeraVe Foaming Cleanser 236ml', 3, 'Chai', 245000.00, 350000.00, 100, '2028-11-30', NULL, 'Sữa rửa mặt da dầu', '2026-03-12 11:05:00', 1),
(38, 'LC0038', 'CeraVe Foaming Cleanser 473ml', 3, 'Chai', 340000.00, 490000.00, 76, '2028-11-30', NULL, 'Sữa rửa mặt da dầu', '2026-03-12 11:10:00', 1),
(39, 'LC0039', 'CeraVe Hydrating Cleanser 236ml', 3, 'Chai', 230000.00, 330000.00, 88, '2028-11-30', NULL, 'Sữa rửa mặt da khô', '2026-03-12 11:15:00', 1),
(40, 'LC0040', 'CeraVe Hydrating Cleanser 473ml', 3, 'Chai', 325000.00, 470000.00, 72, '2028-11-30', NULL, 'Sữa rửa mặt da khô', '2026-03-12 11:20:00', 1),
(41, 'LC0041', 'CeraVe Moisturising Cream 50ml', 3, 'Tuýp', 120000.00, 180000.00, 96, '2028-09-30', NULL, 'Kem dưỡng ẩm', '2026-03-12 11:25:00', 1),
(42, 'LC0042', 'CeraVe Moisturising Cream 340g', 3, 'Hũ', 315000.00, 450000.00, 54, '2028-09-30', NULL, 'Kem dưỡng ẩm', '2026-03-12 11:30:00', 1),
(43, 'LC0043', 'CeraVe Moisturising Cream 454g', 3, 'Hũ', 360000.00, 515000.00, 44, '2028-09-30', NULL, 'Kem dưỡng ẩm', '2026-03-12 11:35:00', 1),
(44, 'LC0044', 'Eucerin Spotless Brightening Cleansing Foam 50g', 3, 'Tuýp', 135000.00, 199000.00, 100, '2028-08-31', NULL, 'Dược mỹ phẩm làm sạch da', '2026-03-12 11:40:00', 1),
(45, 'LC0045', 'Eucerin pH5 Facial Cleanser Sensitive Skin 100ml', 3, 'Chai', 82000.00, 119000.00, 92, '2028-08-31', NULL, 'Dược mỹ phẩm làm sạch da', '2026-03-12 11:45:00', 1),
(46, 'LC0046', 'Sebamed Extreme Dry Skin Shampoo 5% Urea 200ml', 3, 'Chai', 235000.00, 338000.00, 58, '2028-07-31', NULL, 'Chăm sóc tóc cho da đầu khô', '2026-03-12 11:50:00', 1),
(47, 'LC0047', 'Thuốc Hoạt Huyết Trường Phúc (3 vỉ x 10 viên)', 5, 'Hộp', 78000.00, 99000.00, 68, '2029-12-31', NULL, 'Thuốc tham chiếu từ nhathuoclongchau.com.vn', '2026-03-12 11:55:00', 1);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `product_category`
--

CREATE TABLE `product_category` (
  `category_id` int(11) NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `product_category`
--

INSERT INTO `product_category` (`category_id`, `category_name`, `description`) VALUES
(1, 'Thuốc kháng sinh', 'Các loại thuốc tiêu diệt hoặc kìm hãm sự phát triển của vi khuẩn'),
(2, 'Thuốc giảm đau - hạ sốt', 'Danh mục các loại thuốc giảm đau và hạ sốt'),
(3, 'Thực phẩm chức năng', 'Vitamin và các loại thực phẩm bổ sung sức khỏe'),
(4, 'Dụng cụ y tế', 'Khẩu trang, bông băng, máy đo huyết áp'),
(5, 'Thuốc giảm đau', 'Các loại thuốc giảm đau'),
(6, 'Thuốc chóng say xe', 'Nhóm thuốc chóng say xe'),
(7, 'Thuốc cảm cúm', 'Nhóm thuốc hỗ trợ giảm triệu chứng cảm lạnh và cảm cúm'),
(8, 'Thuốc tiêu hóa', 'Nhóm thuốc và sản phẩm hỗ trợ hệ tiêu hóa, dạ dày, đường ruột'),
(9, 'Thuốc dị ứng', 'Nhóm thuốc hỗ trợ giảm triệu chứng dị ứng theo mùa và dị ứng da'),
(10, 'Chăm sóc mẹ và bé', 'Sản phẩm bổ sung và chăm sóc sức khỏe cho mẹ bầu, mẹ sau sinh và trẻ nhỏ'),
(11, 'Thiết bị xét nghiệm nhanh', 'Bộ kit và vật tư hỗ trợ xét nghiệm nhanh tại nhà hoặc cơ sở y tế'),
(12, 'Dược mỹ phẩm', 'Sản phẩm chăm sóc da, tóc và cơ thể theo định hướng dược mỹ phẩm');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `product_image`
--

CREATE TABLE `product_image` (
  `image_id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int(11) UNSIGNED NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `sessions`
--

INSERT INTO `sessions` (`session_id`, `expires`, `data`) VALUES
('6TnJHifO_S-txs97ifEJdELcDkFBWD4z', 1773921073, '{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2026-03-19T11:50:59.278Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"user\":{\"id\":7,\"username\":\"staff\",\"role\":\"staff\",\"full_name\":null}}'),
('bq3Y0fXRwq_tzgHPdOCJ9IYKV6dIp-jM', 1774363603, '{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2026-03-24T14:22:05.695Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"user\":{\"id\":4,\"username\":\"admin\",\"role\":\"admin\",\"full_name\":null}}'),
('eynCkWNbLI7iunC96z2wSZB_WoiUI9oR', 1773914028, '{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2026-03-19T07:38:48.127Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"user\":{\"id\":4,\"username\":\"admin\",\"role\":\"staff\",\"full_name\":null}}');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `supplier`
--

CREATE TABLE `supplier` (
  `supplier_id` int(11) NOT NULL,
  `supplier_name` varchar(150) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `supplier`
--

INSERT INTO `supplier` (`supplier_id`, `supplier_name`, `phone`, `email`, `address`) VALUES
(1, 'Dược phẩm Hậu Giang', '02923891433', 'dhgpharma@dhgpharma.com.vn', 'Cần Thơ, Việt Nam'),
(2, 'Traphaco', '18006612', 'info@traphaco.com.vn', 'Hoàng Mai, Hà Nội'),
(3, 'Phân phối Pharmadic', '02838330105', 'contact@pharmadic.vn', 'Quận 10, TP.HCM'),
(4, 'Thiết bị y tế Vinamed', '0243823567', 'vinamed@vnn.vn', 'Đống Đa, Hà Nội');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `user`
--

CREATE TABLE `user` (
  `user_id` int(11) NOT NULL,
  `username` varchar(50) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `full_name` varchar(150) DEFAULT NULL,
  `role` varchar(20) DEFAULT 'manager',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_login` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `user`
--

INSERT INTO `user` (`user_id`, `username`, `password`, `full_name`, `role`, `created_at`, `last_login`) VALUES
(4, 'admin', '$2b$10$q0IYCzN97AOllq1IOmBLb.7lxOXKZ6q.90N4y5Az9AlZGrvc7nr.C', 'System Manager', 'manager', '2026-03-09 09:50:32', NULL),
(10, 'hoangstaff', '$2b$10$I0s1JgIbMbT5LeJkJok8gOgNL5OePQ.MASWq47ghAZWckbPTzvC3m', 'Hoang Staff', 'staff', '2026-03-30 11:00:00', NULL);

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `history_activity`
--
ALTER TABLE `history_activity`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Chỉ mục cho bảng `history_import`
--
ALTER TABLE `history_import`
  ADD PRIMARY KEY (`history_id`);

--
-- Chỉ mục cho bảng `product`
--
ALTER TABLE `product`
  ADD PRIMARY KEY (`product_id`),
  ADD UNIQUE KEY `product_code` (`product_code`),
  ADD KEY `category_id` (`category_id`);

--
-- Chỉ mục cho bảng `product_category`
--
ALTER TABLE `product_category`
  ADD PRIMARY KEY (`category_id`);

--
-- Chỉ mục cho bảng `product_image`
--
ALTER TABLE `product_image`
  ADD PRIMARY KEY (`image_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Chỉ mục cho bảng `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`);

--
-- Chỉ mục cho bảng `supplier`
--
ALTER TABLE `supplier`
  ADD PRIMARY KEY (`supplier_id`);

--
-- Chỉ mục cho bảng `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `history_activity`
--
ALTER TABLE `history_activity`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT cho bảng `history_import`
--
ALTER TABLE `history_import`
  MODIFY `history_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT cho bảng `product`
--
ALTER TABLE `product`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT cho bảng `product_category`
--
ALTER TABLE `product_category`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT cho bảng `product_image`
--
ALTER TABLE `product_image`
  MODIFY `image_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `supplier`
--
ALTER TABLE `supplier`
  MODIFY `supplier_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `user`
--
ALTER TABLE `user`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Các ràng buộc cho các bảng đã đổ
--

--
-- Các ràng buộc cho bảng `history_activity`
--
ALTER TABLE `history_activity`
  ADD CONSTRAINT `history_activity_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE;

--
-- Các ràng buộc cho bảng `product`
--
ALTER TABLE `product`
  ADD CONSTRAINT `product_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `product_category` (`category_id`);

--
-- Các ràng buộc cho bảng `product_image`
--
ALTER TABLE `product_image`
  ADD CONSTRAINT `product_image_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `product` (`product_id`);

-- Chuan hoa tai khoan admin de demo voi role manager (khop middleware backend)
UPDATE `user`
SET `role` = 'manager',
  `password` = '$2b$10$q0IYCzN97AOllq1IOmBLb.7lxOXKZ6q.90N4y5Az9AlZGrvc7nr.C',
    `full_name` = COALESCE(`full_name`, 'System Manager')
WHERE `username` = 'admin';
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
