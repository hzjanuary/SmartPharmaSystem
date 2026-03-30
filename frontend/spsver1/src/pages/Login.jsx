import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';
import { saveSessionUser } from '../utils/session';
import { BACKEND_URL } from '../utils/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const navigate = useNavigate();

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setHasError(false);
        saveSessionUser(data.user);
        const redirectPath = data?.user?.role === 'manager' ? '/admin' : '/staff';
        navigate(redirectPath);
      } else {
        setHasError(true);
        setErrorMsg(data.message || 'Thông tin không chính xác!');
      }
    } catch (error) {
      setHasError(true);
      setErrorMsg('Không thể kết nối đến máy chủ!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        <p className="login-eyebrow">Smart Pharma System</p>
        <h2>Đăng nhập hệ thống</h2>
        <p className="login-subtitle">Hệ thống tự động điều hướng sang trang admin hoặc staff theo vai trò.</p>
        
        <input 
          type="text" 
          placeholder="Tài khoản" 
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            if(hasError) setHasError(false);
          }}
        />
        
        <input 
          type="password" 
          placeholder="Mật khẩu" 
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if(hasError) setHasError(false);
          }}
        />
        
        {hasError && <p className="error-msg">{errorMsg}</p>}
        
        <button onClick={handleLogin} disabled={isLoading}>{isLoading ? 'Đang xử lý...' : 'Đăng nhập'}</button>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
          Chưa có tài khoản? <Link to="/register" style={{ color: 'var(--primary-blue)', textDecoration: 'none', fontWeight: 'bold' }}>Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;