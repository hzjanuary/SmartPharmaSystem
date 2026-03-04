import React, { useState } from 'react';
import './Login.css'; // Import file CSS riêng cho trang đăng nhập

const Login = () => {
  // Khởi tạo state để lưu trữ giá trị input và trạng thái lỗi
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [hasError, setHasError] = useState(false);

  const handleLogin = () => {
    // Kiểm tra thông tin đăng nhập
    if (username === 'admin' && password === '123') {
      setHasError(false);
      // Nếu bạn dùng react-router-dom, chỗ này sẽ đổi thành navigate('/qlhh')
      window.location.href = '/qlhh'; 
    } else {
      setHasError(true);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        <h2>Đăng nhập Admin</h2>
        
        <input 
          type="text" 
          placeholder="Tài khoản (admin)" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        
        <input 
          type="password" 
          placeholder="Mật khẩu (123)" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        
        {/* Chỉ hiển thị thẻ p này nếu hasError là true */}
        {hasError && <p className="error-msg">Thông tin không chính xác!</p>}
        
        <button onClick={handleLogin}>Đăng nhập</button>
      </div>
    </div>
  );
};

export default Login;