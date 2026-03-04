import React from 'react';

const Header = () => {
  return (
    <header>
      <div className="top-bar">
        <p>Hệ thống 1600+ nhà thuốc trên toàn quốc</p>
      </div>
      <div className="main-header">
        <div className="container">
          <div className="logo">Smart Pharma System</div>
          <div className="search-box">
            <input type="text" placeholder="Tên thuốc, thực phẩm chức năng..." />
            <button><i className="fa fa-search"></i></button>
          </div>
          <div className="header-icons">
            <div className="icon-item"><i className="fa fa-file-prescription"></i> <span>Gửi toa thuốc</span></div>
            <div className="icon-item"><i className="fa fa-shopping-cart"></i> <span>Giỏ hàng</span></div>
            
            <a href="/login" className="icon-item login-btn" style={{ textDecoration: 'none', color: 'white' }}>Đăng nhập</a>
            
            <a href="/qlhh" className="icon-item register-btn" style={{ textDecoration: 'none' }}>Đăng ký</a>
          </div>
        </div>
      </div>
      <nav>
        <ul className="container">
          <li><a href="#thuc-pham-chuc-nang">THỰC PHẨM CHỨC NĂNG</a></li>
          <li><a href="#duoc-my-pham">DƯỢC MỸ PHẨM</a></li>
          <li><a href="#cham-soc-ca-nhan">CHĂM SÓC CÁ NHÂN</a></li>
          <li><a href="#thiet-bi-y-te">THIẾT BỊ Y TẾ</a></li>
          <li><a href="#thuoc">THUỐC</a></li>
          <li><a href="#goc-suc-khoe">GÓC SỨC KHỎE</a></li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;