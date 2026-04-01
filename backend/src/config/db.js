const mysql = require('mysql2');
require('dotenv').config(); // Nạp các biến từ file .env vào process.env

// Tạo một pool kết nối
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  charset: 'utf8mb4_unicode_ci',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Chuyển pool sang dạng promise để dùng được async/await (rất tiện sau này)
const database = pool.promise();

// Kiểm tra kết nối khi khởi động
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Lỗi kết nối MySQL:', err.message);
  } else {
    connection.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    console.log('✅ Kết nối MySQL (XAMPP) thành công qua Pool!');
    connection.release(); // Trả kết nối lại cho pool
  }
});

module.exports = database;