import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';
import { BACKEND_URL } from '../utils/api';

const Register = () => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!fullName || !username || !password || !confirmPassword) {
      setErrorMsg('Vui lòng điền đầy đủ thông tin!');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp!');
      return;
    }

    try {
      // Gọi API xuống Backend để lưu vào DB
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ full_name: fullName, username, password, role: 'staff' }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Đăng ký thành công! Nhấn OK để chuyển đến trang Đăng nhập.');
        navigate('/login');
      } else {
        // Hiển thị lỗi từ backend (ví dụ: Tài khoản đã tồn tại)
        setErrorMsg(data.message || 'Đăng ký thất bại!');
      }
    } catch (error) {
      console.error("Lỗi kết nối server:", error);
      setErrorMsg('Không thể kết nối đến máy chủ!');
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card" style={{ width: '400px' }}>
        <h2>Đăng ký Tài khoản</h2>
        <form onSubmit={handleRegister}>
          <input type="text" placeholder="Họ và tên" value={fullName} onChange={(e) => { setFullName(e.target.value); setErrorMsg(''); }} />
          <input type="text" placeholder="Tên đăng nhập" value={username} onChange={(e) => { setUsername(e.target.value); setErrorMsg(''); }} />
          <input type="password" placeholder="Mật khẩu" value={password} onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }} />
          <input type="password" placeholder="Xác nhận mật khẩu" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setErrorMsg(''); }} />
          
          {errorMsg && <p className="error-msg">{errorMsg}</p>}
          <button type="submit" style={{ marginTop: '10px' }}>Đăng ký</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
          Đã có tài khoản? <Link to="/login" style={{ color: 'var(--primary-blue)', textDecoration: 'none', fontWeight: 'bold' }}>Đăng nhập ngay</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;