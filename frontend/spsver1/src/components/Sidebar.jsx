import React from 'react';
import { Link } from 'react-router-dom'; // Lệnh import phải nằm ở dòng trên cùng này

// Nhận prop toggleChat để mở chatbot và activePage để làm sáng menu
const Sidebar = ({ toggleChat, activePage }) => {
  return (
    <div className="sidebar">
      <h2>Smart Pharma System</h2>
      
      {/* Đã thay <a> thành <Link to="..."> và giữ nguyên logic đổi màu */}
      <Link to="/dashboard" className={`menu-item ${activePage === 'dashboard' ? 'active' : ''}`}>
        <i className="fa fa-chart-line"></i> Dashboard
      </Link>
      
      <Link to="/qlhh" className={`menu-item ${activePage === 'qlhh' ? 'active' : ''}`}>
        <i className="fa fa-box"></i> Quản lý hàng hóa
      </Link>
      
      <hr style={{ opacity: 0.1, margin: '15px 0' }} />
      
      <Link to="/" className="menu-item" style={{ color: 'var(--danger)' }}>
        <i className="fa fa-sign-out-alt"></i> Thoát hệ thống
      </Link>

      <div className="menu-item chatbot-btn" onClick={toggleChat} style={{ cursor: 'pointer' }}>
        <i className="fa fa-robot"></i> Hỗ trợ quản lý
      </div>
    </div>
  );
};

export default Sidebar;