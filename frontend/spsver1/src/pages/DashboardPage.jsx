import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Chatbot from '../components/Chatbot';
import SalesChart from '../components/SalesChart';

const DashboardPage = () => {
  // Quản lý trạng thái Chatbot (Tái sử dụng logic cũ)
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [fefoData, setFefoData] = useState([]);
  const [isLoadingFefo, setIsLoadingFefo] = useState(true);
  const [fefoError, setFefoError] = useState('');
  const [summary, setSummary] = useState({
    stats: {
      expiring_products: 0,
      new_orders: 0,
      monthly_import: 0,
    },
    chart: {
      labels: [],
      values: [],
      label: 'Số lượng phát sinh theo ngày',
    },
    expiry_alerts: [],
  });
  const [summaryError, setSummaryError] = useState('');

  const BACKEND_URL =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL)
      ? import.meta.env.VITE_BACKEND_URL
      : 'http://localhost:5000';

  const AI_URL =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_AI_URL)
      ? import.meta.env.VITE_AI_URL
      : 'http://localhost:8000';

  const toggleChat = () => setIsChatOpen(!isChatOpen);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/dashboard/summary`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setSummary(data);
        setSummaryError('');
      } catch {
        setSummaryError('Không thể tải dữ liệu dashboard từ database.');
      }
    };

    const loadFefo = async () => {
      try {
        setIsLoadingFefo(true);
        setFefoError('');

        const response = await fetch(`${AI_URL}/api/v1/inventory-recommendation/from-db`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        setFefoData(result.recommendations || []);
      } catch {
        setFefoError('Không thể tải dữ liệu FEFO từ AI Service (localhost:8000).');
        setFefoData([]);
      } finally {
        setIsLoadingFefo(false);
      }
    };

    loadSummary();
    loadFefo();
  }, [BACKEND_URL, AI_URL]);

  const getRiskStyle = (riskLevel) => {
    if (riskLevel === 'EXPIRED') {
      return { backgroundColor: '#fdecea', color: '#c0392b' };
    }
    if (riskLevel === 'HIGH') {
      return { backgroundColor: '#ffe9e4', color: '#d35400' };
    }
    if (riskLevel === 'MEDIUM') {
      return { backgroundColor: '#fff6db', color: '#b7791f' };
    }
    return { backgroundColor: '#e8f7ee', color: '#1e8449' };
  };

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('vi-VN');
  };

  const formatCurrency = (value) => Number(value || 0).toLocaleString('vi-VN');

  const getAlertBadge = (riskLevel) => {
    if (riskLevel === 'EXPIRED' || riskLevel === 'HIGH') return 'badge badge-danger';
    if (riskLevel === 'MEDIUM') return 'badge badge-warning';
    return 'badge badge-success';
  };

  const getAlertLabel = (riskLevel, daysLeft) => {
    if (riskLevel === 'EXPIRED') return `Đã hết hạn (${Math.abs(daysLeft)} ngày)`;
    if (riskLevel === 'HIGH') return 'Gần hết hạn';
    if (riskLevel === 'MEDIUM') return 'Sắp hết hạn';
    return 'Ổn định';
  };

  return (
    <div className="admin-body">
      {/* Tái sử dụng Sidebar */}
      <Sidebar toggleChat={toggleChat} />

      <div className="main-admin">
        <div className="header-title" style={{ marginBottom: '25px' }}>
          <h1 style={{ color: 'var(--primary-blue)' }}>Tổng quan báo cáo</h1>
          <p style={{ color: 'var(--text-gray)', fontSize: '14px' }}>Cập nhật dữ liệu thời gian thực</p>
        </div>

        {/* Ba thẻ thống kê */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Sản phẩm sắp hết hạn</h3>
            <p style={{ color: 'var(--danger)' }}>{summary.stats.expiring_products}</p>
          </div>
          <div className="stat-card">
            <h3>Đơn hàng mới</h3>
            <p>{summary.stats.new_orders}</p>
          </div>
          <div className="stat-card">
            <h3>Nhập kho (Tháng)</h3>
            <p>{Number(summary.stats.monthly_import || 0).toLocaleString('vi-VN')} SP</p>
          </div>
        </div>

        {/* Biểu đồ */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '25px' }}>
          <h3 style={{ marginBottom: '15px', fontSize: '16px' }}>{summary.chart.label || 'Xu hướng theo tuần'}</h3>
          {summaryError && <p style={{ color: 'var(--danger)', marginBottom: '10px' }}>{summaryError}</p>}
          <SalesChart labels={summary.chart.labels} values={summary.chart.values} label={summary.chart.label} />
        </div>

        {/* Hai bảng dữ liệu */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px' }}>
          
          {/* Bảng 1: FEFO Priority */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginBottom: '15px', fontSize: '16px' }}><i className="fa fa-sort" style={{ color: 'var(--success)' }}></i> Ưu tiên xuất hàng (FEFO)</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Thứ tự</th>
                  <th>Tên thuốc</th>
                  <th>SL</th>
                  <th>Hạn dùng</th>
                  <th>Ngày còn lại</th>
                  <th>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingFefo && (
                  <tr>
                    <td colSpan="6">Đang tải dữ liệu FEFO...</td>
                  </tr>
                )}
                {!isLoadingFefo && fefoError && (
                  <tr>
                    <td colSpan="6" style={{ color: 'var(--danger)' }}>{fefoError}</td>
                  </tr>
                )}
                {!isLoadingFefo && !fefoError && fefoData.length === 0 && (
                  <tr>
                    <td colSpan="6">Không có lô hàng khả dụng để đề xuất FEFO.</td>
                  </tr>
                )}
                {!isLoadingFefo && !fefoError && fefoData.map((item) => (
                  <tr key={`${item.lot_id || item.product_id || item.priority}-${item.priority}`}>
                    <td>{item.priority}</td>
                    <td>{item.product_name}</td>
                    <td>{item.quantity}</td>
                    <td>{formatDate(item.expiry_date)}</td>
                    <td>{item.days_to_expiry}</td>
                    <td>
                      <span
                        style={{
                          ...getRiskStyle(item.risk_level),
                          borderRadius: '999px',
                          padding: '4px 10px',
                          fontWeight: 700,
                          fontSize: '12px',
                          display: 'inline-block',
                        }}
                      >
                        {item.risk_level}
                      </span>
                    </td>
                  </tr>
                ))}
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
                {summary.expiry_alerts.length === 0 && (
                  <tr>
                    <td colSpan="3">Không có cảnh báo hạn dùng.</td>
                  </tr>
                )}
                {summary.expiry_alerts.map((item) => (
                  <tr key={`alert-${item.product_id}`}>
                    <td>{item.product_name}</td>
                    <td>{formatDate(item.expiry_date)}</td>
                    <td><span className={getAlertBadge(item.risk_level)}>{getAlertLabel(item.risk_level, item.days_left)}</span></td>
                  </tr>
                ))}
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