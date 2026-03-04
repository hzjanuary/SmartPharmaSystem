import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Chatbot from '../components/Chatbot';
import SalesChart from '../components/SalesChart';

const DashboardPage = () => {
  // Quản lý trạng thái Chatbot (Tái sử dụng logic cũ)
  const [isChatOpen, setIsChatOpen] = useState(false);
  const toggleChat = () => setIsChatOpen(!isChatOpen);

  return (
    <div className="admin-body">
      {/* Tái sử dụng Sidebar */}
      <Sidebar toggleChat={toggleChat} />

      <div className="main-admin">
        <div className="header-title" style={{ marginBottom: '25px' }}>
          <h1 style={{ color: 'var(--primary-blue)' }}>Tổng quan báo cáo</h1>
          <p style={{ color: 'var(--text-gray)', fontSize: '14px' }}>Cập nhật dữ liệu thời gian thực</p>
        </div>

        {/* Bốn thẻ thống kê */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Doanh thu tuần</h3>
            <p>450.200.000đ</p>
          </div>
          <div className="stat-card">
            <h3>Sản phẩm sắp hết hạn</h3>
            <p style={{ color: 'var(--danger)' }}>12</p>
          </div>
          <div className="stat-card">
            <h3>Đơn hàng mới</h3>
            <p>38</p>
          </div>
          <div className="stat-card">
            <h3>Nhập kho (Tháng)</h3>
            <p>1.540 SP</p>
          </div>
        </div>

        {/* Biểu đồ */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '25px' }}>
          <h3 style={{ marginBottom: '15px', fontSize: '16px' }}>Lượng hàng đã bán theo tuần</h3>
          <SalesChart />
        </div>

        {/* Hai bảng dữ liệu */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px' }}>
          
          {/* Bảng 1: Lịch sử nhập */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginBottom: '15px', fontSize: '16px' }}><i className="fa fa-history" style={{ color: 'var(--success)' }}></i> Lịch sử nhập hàng mới</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ngày nhập</th>
                  <th>Tên thuốc</th>
                  <th>SL</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>28/02/2026</td><td>Panadol Extra</td><td>500</td><td>15.000.000đ</td></tr>
                <tr><td>27/02/2026</td><td>Vitamin C 500mg</td><td>200</td><td>8.400.000đ</td></tr>
                <tr><td>25/02/2026</td><td>Dầu cá Omega-3</td><td>150</td><td>32.000.000đ</td></tr>
              </tbody>
            </table>
          </div>

          {/* Bảng 2: Cảnh báo */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginBottom: '15px', fontSize: '16px' }}><i className="fa fa-clock" style={{ color: 'var(--warning)' }}></i> Cảnh báo hạn dùng</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Hạn dùng</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Paracetamol</td>
                  <td>15/03/2026</td>
                  <td><span className="badge badge-danger">Gần hết hạn</span></td>
                </tr>
                <tr>
                  <td>Cetaphil 500ml</td>
                  <td>20/05/2026</td>
                  <td><span className="badge badge-warning">Sắp hết hạn</span></td>
                </tr>
                <tr>
                  <td>Bio-Acimin</td>
                  <td>12/06/2026</td>
                  <td><span className="badge badge-warning">Sắp hết hạn</span></td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* Tái sử dụng Chatbot */}
      <Chatbot isOpen={isChatOpen} toggleChat={toggleChat} />
    </div>
  );
};

export default DashboardPage;