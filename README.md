# SmartPharmaSystem

Hệ thống quản lý dược phẩm gồm 5 service chạy bằng Docker:
- Frontend React/Vite
- Backend Node.js/Express (xác thực bằng session)
- AI Service FastAPI (FEFO)
- SPS Agent Telegram
- MySQL 8.4

## 1. Kiến trúc hiện tại
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- AI Service: http://localhost:8000
- MySQL: 127.0.0.1:3306
- SPS Agent: chạy nội bộ qua service sps-agent

Luồng chính:
- Đăng nhập/quản lý dữ liệu qua Backend
- Dashboard staff lấy gợi ý FEFO từ AI Service
- Backend, AI Service và SPS Agent dùng chung DB MySQL

## 2. Chuẩn bị biến môi trường
Tạo file .env tại thư mục gốc (nếu chưa có) và cập nhật các giá trị cần thiết.

Biến quan trọng:
- MYSQL_ROOT_PASSWORD (mặc định root)
- MYSQL_USER (mặc định smartpharma)
- MYSQL_PASSWORD (mặc định smartpharma)
- DB_NAME (mặc định pharmacymanagement)
- SESSION_SECRET
- GEMINI_API_KEY
- TELEGRAM_BOT_TOKEN
- ADMIN_CHAT_ID

Lưu ý:
- docker-compose đọc biến từ file .env gốc.
- ai-service có file môi trường riêng: ai-service/.env

## 3. Chạy nhanh bằng Docker
Khởi động:

```bash
docker-compose up --build -d
```

Kiểm tra:

```bash
docker-compose ps
```

Dừng hệ thống:

```bash
docker-compose down
```

Reset toàn bộ dữ liệu DB (chạy init SQL lại từ đầu):

```bash
docker-compose down -v
docker-compose up --build -d
```

## 4. Tài khoản seed hiện tại
Dữ liệu khởi tạo từ file [docker/mysql/init/pharmacymanagement.sql](docker/mysql/init/pharmacymanagement.sql).

Mặc định có 2 tài khoản:
- manager: admin / admin123
- staff: hoangstaff / 123

## 5. Chức năng đã có trong phiên bản hiện tại
- Đăng nhập/đăng xuất bằng session cookie
- Tách giao diện theo role admin và staff
- Admin: quản lý user, danh mục, thống kê, backup/restore
- Staff: dashboard, FEFO, quản lý sản phẩm (thêm/sửa/xóa)
- Backend giữ logic thông báo đăng nhập Telegram
- AI Service cung cấp API FEFO từ DB

## 6. API FEFO chính
- GET /health
- POST /api/v1/inventory-recommendation
- GET /api/v1/inventory-lots
- GET /api/v1/inventory-recommendation/from-db

Mức rủi ro FEFO:
- EXPIRED: < 0
- HIGH: 0..30
- MEDIUM: 31..90
- LOW: > 90

## 7. SPS Agent
SPS Agent là bot Telegram chạy qua service sps-agent, đọc trực tiếp dữ liệu MySQL để trả lời nghiệp vụ kho.

Một số tool đang dùng:
- check_inventory
- get_system_logs
- get_login_action_logs
- get_import_history
- search_sku
- list_products
- list_imported_products_by_month
- describe_table_fields
- read_table_field_details
- get_product_full_profile

## 8. Lưu ý vận hành
- Volume mysql_data lưu dữ liệu DB, backend_uploads lưu ảnh upload.
- Nếu cập nhật file init SQL mà không thấy dữ liệu mới, cần down -v để re-init.
- Nếu login lỗi sau khi thay đổi seed, cần đối chiếu hash trong DB runtime (không chỉ file SQL).

## 9. Lỗi thường gặp
- Docker Desktop chưa chạy: không lên được container.
- MySQL chưa healthy: backend/ai-service chưa kết nối được DB.
- Sai FRONTEND_ORIGIN hoặc credential cookie: login được nhưng mất session.
- Frontend gọi sai endpoint auth: cần dùng backend :5000 cho auth.

