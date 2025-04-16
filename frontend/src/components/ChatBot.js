import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService } from '../services/chatService';

const ChatBot = ({ isOpen, onToggle, onDataReceived }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    try {
      const savedSessionId = localStorage.getItem('chatSessionId');
      const newSessionId = savedSessionId || `session-${Date.now()}`;
      setSessionId(newSessionId);
      
      if (!savedSessionId) {
        localStorage.setItem('chatSessionId', newSessionId);
      }
      
      if (messages.length === 0) {
        setMessages([
          {
            role: 'assistant',
            content: 'Xin chào! Tôi là trợ lý ảo của hệ thống so sánh giá điện thoại. Bạn có thể hỏi tôi về bất kỳ sản phẩm nào hoặc yêu cầu tìm kiếm theo tiêu chí như giá, thương hiệu...',
            type: 'text'
          }
        ]);
      }
      
      if (savedSessionId) {
        loadChatHistory(savedSessionId);
      }
    } catch (error) {
      console.error("Error initializing chat session:", error);
      setError("Không thể khởi tạo phiên chat. Vui lòng tải lại trang.");
    }
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const loadChatHistory = async (sid) => {
    try {
      setIsLoading(true);
      const history = await chatService.getChatHistory(sid);
      
      if (history && history.messages && Array.isArray(history.messages)) {
        setMessages(history.messages);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    if (input.length > 500) {
      setError("Tin nhắn quá dài. Vui lòng giới hạn dưới 500 ký tự.");
      return;
    }
    
    setError(null);
    
    const userMessage = {
      role: 'user',
      content: input,
      type: 'text'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const response = await chatService.sendMessage(sessionId, input);
      
      if (response.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.response.content,
          type: 'text'
        }]);
        setError("Có lỗi xảy ra khi xử lý yêu cầu.");
        return;
      }
      
      if (!response.response || !response.response.content) {
        throw new Error("Invalid response format");
      }
      
      const assistantMessage = {
        role: 'assistant',
        content: response.response.content,
        type: response.response.type || 'text'
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      const messageData = {
        messageType: response.response.type,
      };
      
      if (response.data) {
        if (response.response.type === 'product_list' && response.data.products) {
          messageData.products = response.data.products;
        } else if (response.response.type === 'product_detail' && response.data.product) {
          messageData.product = response.data.product;
        } else if (response.response.type === 'product_comparison' && response.data.products) {
          messageData.products = response.data.products;
        }
        
        onDataReceived(messageData);
      }
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn:', error);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.',
        type: 'text'
      }]);
      
      setError("Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const MessageBubble = ({ message }) => {
    const isUser = message.role === 'user';
    
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className={`rounded-lg py-2 px-3 max-w-[80%] ${
          isUser ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          
          {message.type !== 'text' && (
            <div className="mt-1 text-xs italic">
              {message.type === 'product_list' && 'Danh sách sản phẩm đã được hiển thị'}
              {message.type === 'product_detail' && 'Chi tiết sản phẩm đã được hiển thị'}
              {message.type === 'product_comparison' && 'Bảng so sánh đã được hiển thị'}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleClearChat = async () => {
    try {
      setIsLoading(true);
      
      if (sessionId) {
        await chatService.deleteSession(sessionId);
      }
      
      const newSessionId = `session-${Date.now()}`;
      setSessionId(newSessionId);
      localStorage.setItem('chatSessionId', newSessionId);
      
      setMessages([
        {
          role: 'assistant',
          content: 'Lịch sử chat đã được xóa. Bạn có thể bắt đầu cuộc trò chuyện mới.',
          type: 'text'
        }
      ]);
      
      onDataReceived(null);
      
    } catch (error) {
      console.error("Error clearing chat history:", error);
      setError("Không thể xóa lịch sử chat. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Nút đóng/mở chatbot */}
      <button
        onClick={onToggle}
        className="absolute bottom-0 right-0 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
        aria-label={isOpen ? "Đóng chat" : "Mở chat"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          )}
        </svg>
      </button>

      {/* Chat container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute bottom-16 right-0 w-96 h-[480px] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="bg-blue-600 text-white py-3 px-4 flex items-center justify-between">
              <h3 className="font-medium">Trợ lý tìm kiếm sản phẩm</h3>
              <button 
                onClick={handleClearChat}
                className="text-xs bg-blue-700 hover:bg-blue-800 px-2 py-1 rounded text-white"
                disabled={isLoading}
              >
                Xóa lịch sử
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 text-xs">
                <p>{error}</p>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              {messages.map((message, index) => (
                <MessageBubble key={index} message={message} />
              ))}
              
              {isLoading && (
                <div className="flex justify-start mb-2">
                  <div className="bg-gray-200 text-gray-800 rounded-lg py-2 px-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-200 flex">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Nhập tin nhắn..."
                className="flex-1 border border-gray-300 rounded-l-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
                maxLength={500}
                aria-label="Nhập tin nhắn"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                className={`rounded-r-lg px-4 font-medium ${
                  isLoading || !input.trim()
                    ? 'bg-gray-300 text-gray-500'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                aria-label="Gửi tin nhắn"
              >
                Gửi
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatBot;