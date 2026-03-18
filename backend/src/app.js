require('dotenv').config();
const express = require("express");
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session); // Thêm dòng này
const cookieParser = require('cookie-parser');
const cors = require("cors");
const db = require('./config/db'); // Đảm bảo đường dẫn tới file config DB của bạn đúng
const route = require("./route/index");

const app = express();
const port = process.env.PORT ;
const frontendOrigin = process.env.FRONTEND_ORIGIN ;

const path = require('path');
// ... các dòng require khác

// Thêm dòng này bên dưới các dòng app.use khác
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 1. Cấu hình Store để lưu Session vào MySQL thay vì RAM
const sessionStore = new MySQLStore({
    clearExpired: true,              // Tự động xóa session hết hạn
    checkExpirationInterval: 900000, // 15 phút quét rác một lần (ms)
    expiration: 86400000,            // Session sống tối đa 1 ngày (ms)
    createDatabaseTable: true        // Tự tạo bảng session khi chạy mới trong Docker
}, db);

// 2. Cấu hình CORS (Cho phép Frontend Vite/React truy cập)
app.use(cors({
    origin: frontendOrigin,
    credentials: true                // BẮT BUỘC: Để gửi/nhận cookie
}));

app.use(express.json());
app.use(cookieParser());

// 3. Thiết lập Middleware Session
app.use(session({
    key: 'pharmacy_sid',             // Tên cookie sẽ hiển thị ở Browser
    secret: process.env.SESSION_SECRET, 
    store: sessionStore,             // Sử dụng MySQL để lưu trữ
    resave: false,
    saveUninitialized: false,        // Chỉ tạo session khi user thực sự login
    rolling: true,                   // <<-- Cực kỳ quan trọng: Tự động reset thời gian sống mỗi khi user thao tác
    cookie: {
        secure: false,               // Để false vì đang chạy localhost (http)
        httpOnly: true,              // Bảo mật: Không cho JS phía client đọc cookie
        maxAge: 24 * 60 * 60 * 1000, // Thời gian sống ban đầu: 1 ngày
        sameSite: 'lax'              // Hỗ trợ gửi cookie giữa localhost khác port
    }
}));

// Khởi tạo các Route
route(app);

app.listen(port, () => {
    console.log(`🚀 Server pharmacy chạy tại http://localhost:${port}`);
});