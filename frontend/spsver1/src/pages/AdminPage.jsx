import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import ProductTable from '../components/ProductTable';
import Chatbot from '../components/Chatbot';

const AdminPage = () => {
  // Quản lý trạng thái bật/tắt chatbot ở component cha
  const [isChatOpen, setIsChatOpen] = useState(false);

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  return (
    <div className="admin-body">
      <Sidebar toggleChat={toggleChat} />
      
      <div className="main-admin">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <h1 style={{ color: 'var(--primary-blue)' }}>Danh mục hàng hóa</h1>
          <button style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            + Thêm sản phẩm
          </button>
        </div>
        
        <ProductTable />
      </div>

      <Chatbot isOpen={isChatOpen} toggleChat={toggleChat} />
    </div>
  );
};

export default AdminPage;