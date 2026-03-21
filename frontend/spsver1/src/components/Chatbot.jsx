import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const Chatbot = ({ isOpen, toggleChat }) => {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Chào quản trị viên! Tôi là Trợ lý dược phẩm SPS. Bạn cần tra cứu tồn kho, SKU, hoặc hạn sử dụng sản phẩm nào?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatBodyRef = useRef(null);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, isOpen, isLoading]);

  const handleSendMessage = async () => {
    const trimmedInput = inputValue.trim();
    if (trimmedInput === '' || isLoading) return;

    const newMessages = [...messages, { sender: 'user', text: trimmedInput }];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ message: trimmedInput })
      });

      const payload = await response.json().catch(() => ({}));
      const fallbackMessage = 'Tôi chưa thể trả lời lúc này. Vui lòng thử lại sau.';

      if (!response.ok) {
        const errorMessage = payload.message || payload.detail || fallbackMessage;
        setMessages((prev) => [...prev, { sender: 'bot', text: errorMessage }]);
        return;
      }

      const botReply = payload.reply || fallbackMessage;
      setMessages((prev) => [...prev, { sender: 'bot', text: botReply }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: `Không kết nối được hệ thống chat: ${error.message}` }
      ]);
    } finally {
      setIsLoading(false);
    }
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
            <div key={index} className="bot-msg">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
            </div>
          ) : (
            <div key={index} style={{ textAlign: 'right', marginBottom: '10px' }}>
              <span style={{ background: 'var(--primary-blue)', color: 'white', padding: '8px 12px', borderRadius: '10px', display: 'inline-block', fontSize: '13px' }}>
                {msg.text}
              </span>
            </div>
          )
        ))}
        {isLoading && (
          <div className="bot-msg">Bot đang trả lời...</div>
        )}
      </div>

      <div className="chat-footer">
        <input 
          type="text" 
          placeholder="Nhập câu hỏi tồn kho / hạn sử dụng..." 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
        />
        <button onClick={handleSendMessage} style={{ border: 'none', background: 'none', color: 'var(--primary-blue)', cursor: isLoading ? 'not-allowed' : 'pointer', paddingLeft: '10px' }} disabled={isLoading}>
          <i className="fa fa-paper-plane"></i>
        </button>
      </div>
    </div>
  );
};

export default Chatbot;