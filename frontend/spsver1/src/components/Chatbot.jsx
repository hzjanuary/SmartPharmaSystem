import React, { useState, useRef, useEffect } from 'react';

const Chatbot = ({ isOpen, toggleChat }) => {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Chào quản trị viên! Bạn muốn tìm kiếm hoặc cập nhật số lượng cho mã sản phẩm nào?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const chatBodyRef = useRef(null);

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSendMessage = () => {
    if (inputValue.trim() === '') return;

    // Thêm tin nhắn của User
    const newMessages = [...messages, { sender: 'user', text: inputValue }];
    setMessages(newMessages);
    setInputValue('');

    // Giả lập Bot phản hồi sau 0.8s
    setTimeout(() => {
      setMessages((prev) => [...prev, { sender: 'bot', text: 'Đang kiểm tra tồn kho...' }]);
    }, 800);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  return (
    <div id="chat-window" style={{ display: isOpen ? 'flex' : 'none' }}>
      <div className="chat-header">
        <span><i className="fa fa-robot"></i> Trợ lý SPS</span>
        <i className="fa fa-times" onClick={toggleChat} style={{ cursor: 'pointer' }}></i>
      </div>
      
      <div className="chat-body" ref={chatBodyRef}>
        {messages.map((msg, index) => (
          msg.sender === 'bot' ? (
            <div key={index} className="bot-msg">{msg.text}</div>
          ) : (
            <div key={index} style={{ textAlign: 'right', marginBottom: '10px' }}>
              <span style={{ background: 'var(--primary-blue)', color: 'white', padding: '8px 12px', borderRadius: '10px', display: 'inline-block', fontSize: '13px' }}>
                {msg.text}
              </span>
            </div>
          )
        ))}
      </div>

      <div className="chat-footer">
        <input 
          type="text" 
          placeholder="Nhập mã SKU..." 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button onClick={handleSendMessage} style={{ border: 'none', background: 'none', color: 'var(--primary-blue)', cursor: 'pointer', paddingLeft: '10px' }}>
          <i className="fa fa-paper-plane"></i>
        </button>
      </div>
    </div>
  );
};

export default Chatbot;