# SmartPharmaSystemVersion01

Hệ thống quản lý dược phẩm gồm:
- Frontend React (Vite)
- Backend Node.js/Express (Auth + Product API)
- AI Service FastAPI (FEFO recommendation + Gemini chatbot)
- MySQL (XAMPP)

## 1. Kiến trúc và cổng dịch vụ
- Frontend: `http://localhost:3000`
- Backend (Auth/API): `http://localhost:5000`
- AI Service (FEFO): `http://localhost:8000`
- MySQL host (XAMPP): `127.0.0.1:3306`

Luồng chính:
- `Login/Register` gọi Backend `:5000`
- Dashboard FEFO gọi AI Service `:8000`
- Chatbot gọi Backend `:5000/api/chat/message`, Backend proxy sang AI Service `:8000/api/v1/chat`
- Backend + AI cùng đọc chung DB XAMPP để đồng bộ với phpMyAdmin

## 2. Cấu hình Google LLM API Key cho AI Service
Mục tiêu: cấp `GEMINI_API_KEY` để endpoint chatbot hoạt động.

1. Tạo file môi trường cho AI Service từ file mẫu:
```bash
cp ai-service/.env.example ai-service/.env
```

2. Mở file `ai-service/.env` và điền API key thật:
```env
GEMINI_API_KEY=YOUR_REAL_GOOGLE_API_KEY
```

3. (Tuỳ chọn) chọn model nếu muốn override:
```env
GEMINI_MODEL=gemini-flash-latest
```

4. Khởi động lại AI service sau khi cập nhật `.env`:
```bash
docker compose up -d --build ai-service
```

Lưu ý:
- `docker-compose.yml` đã dùng `env_file: ./ai-service/.env` cho service `ai-service`.
- Nếu thiếu key, endpoint `POST /api/v1/chat` sẽ trả lỗi 500 (`GEMINI_API_KEY is not configured`).

## 2.1 Chạy nhanh bằng Docker (khuyến nghị)
Yêu cầu:
- Docker Desktop đang chạy

Lệnh chạy:
```bash
docker compose up --build -d
```

Kiểm tra:
```bash
docker compose ps
```

Dừng hệ thống:
```bash
docker compose down
```

Xóa cả volume DB (reset dữ liệu):
```bash
docker compose down -v
```

### Quick Demo Script (1 minute)
Chạy nhanh từ đầu:
```bash
docker compose down
docker compose up --build -d
docker compose ps
```

Kiểm tra nhanh API sau khi container đã `Up`:
```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/inventory-recommendation/from-db
```

Mở UI:
- `http://localhost:3000`
- Đăng ký tài khoản mới tại `/register`, sau đó đăng nhập tại `/login`

## 3. Chạy thủ công không Docker
### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend/spsver1
npm install
npm run dev 
```

### AI Service
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## 4. FEFO AI API
### `POST /api/v1/inventory-recommendation`
Input:
```json
{
	"items": [
		{
			"lot_id": "L001",
			"product_id": 1,
			"product_name": "Paracetamol 500mg",
			"batch_no": "BATCH-01",
			"quantity": 100,
			"expiry_date": "2026-03-21"
		}
	]
}
```

Output:
- Sắp xếp FEFO (hạn gần nhất trước)
- Có `days_to_expiry` và `risk_level`

### `GET /api/v1/inventory-lots`
- Đọc lô hàng từ bảng `product` (đang hoạt động, còn hàng, có hạn dùng)

### `GET /api/v1/inventory-recommendation/from-db`
- Đọc trực tiếp từ DB rồi trả danh sách FEFO

Risk level:
- `EXPIRED`: `< 0`
- `HIGH`: `0..30`
- `MEDIUM`: `31..90`
- `LOW`: `> 90`

## 4.1 Chatbot AI API
### `POST /api/v1/chat` (AI Service)
- Nhận tin nhắn từ backend và trả lời tiếng Việt theo vai trò Trợ lý dược phẩm SPS.
- Có function-calling để truy vấn dữ liệu thật từ bảng `product` (SKU, tồn kho, hạn dùng, ngày nhập `created_at`).

Input:
```json
{
	"message": "Ton kho va ngay nhap hang cua P001"
}
```

Output:
```json
{
	"reply": "..."
}
```

### `POST /api/chat/message` (Backend)
- Route dành cho frontend chat.
- Bắt buộc đã đăng nhập (session/cookie).
- Backend sẽ proxy request sang `http://ai-service:8000/api/v1/chat` trong môi trường Docker.

## 5. CORS và bảo mật demo
- AI Service chỉ cho phép origin: `http://localhost:3000`
- Backend CORS dùng biến `FRONTEND_ORIGIN` (mặc định `http://localhost:3000`)

## 6. Cấu hình môi trường
### AI Service
- File mẫu: `ai-service/.env.example`
- Biến chính:
	- `GEMINI_API_KEY`
	- `GEMINI_MODEL` (tuỳ chọn)
	- `DATABASE_URL`
	- `CORS_ORIGIN`

### Backend
- File mẫu: `backend/.env.example`
- Biến chính:
	- `PORT`
	- `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, `DB_PORT`
	- `SESSION_SECRET`
	- `FRONTEND_ORIGIN`

## 7. Lưu ý khi dùng XAMPP MySQL
- DB được dùng trực tiếp từ XAMPP, không có container DB riêng.
- Đảm bảo MySQL trong XAMPP đang chạy trước khi `docker compose up`.
- Tên DB mặc định trong compose: `pharmacymanagement`.
- Nếu root trong XAMPP có mật khẩu, cập nhật lại trong `docker-compose.yml`:
	- `DB_PASS` (backend)
	- `DATABASE_URL` (ai-service)

## 8. Lỗi thường gặp
### `failed to connect to dockerDesktopLinuxEngine`
- Docker Desktop chưa mở. Hãy mở Docker Desktop rồi chạy lại compose.

### `ECONNREFUSED` đến MySQL
- Kiểm tra MySQL của XAMPP đã start chưa.
- Kiểm tra user/password/db name trong compose có đúng không.

### `POST /api/auth/login 404` trên AI logs
- Frontend gửi nhầm auth qua `:8000`.
- Bản hiện tại đã tách đúng:
	- Auth: `:5000`
	- FEFO AI: `:8000`

### Backend báo thiếu bảng `user`
- Chưa init DB schema. Chạy lại mục reset DB hoặc apply script SQL thủ công.

