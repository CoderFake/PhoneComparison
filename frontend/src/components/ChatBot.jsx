import React, { useState, useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { v4 as uuidv4 } from 'uuid';
import { chatService } from '../services/chatService.jsx';
import { Link } from 'react-router-dom';

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Animation refs
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  // Initialize chat session
  useEffect(() => {
    const newSessionId = localStorage.getItem('chatSessionId') || uuidv4();
    setSessionId(newSessionId);
    localStorage.setItem('chatSessionId', newSessionId);
    
    const loadChatHistory = async () => {
      try {
        // Try to load chat history if session exists
        const history = await chatService.getChatHistory(newSessionId);
        if (history && history.messages && history.messages.length > 0) {
          setMessages(history.messages);
        } else {
          // If no history, send initial welcome message
          setIsTyping(true);
          const response = await chatService.sendMessage(newSessionId, "");
          if (response && response.response) {
            setMessages([response.response]);
          }
          setIsTyping(false);
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
        // If error loading history, start with welcome message
        setIsTyping(true);
        const response = await chatService.sendMessage(newSessionId, "");
        if (response && response.response) {
          setMessages([response.response]);
        }
        setIsTyping(false);
      }
    };
    
    loadChatHistory();
    
    // Focus the input field
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (input.trim() === '') return;
    
    // Add user message to UI immediately
    const userMessage = {
      role: 'user',
      content: input,
      type: 'text',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    
    try {
      // Send message to backend
      const response = await chatService.sendMessage(sessionId, input);
      
      if (response && response.response) {
        // Add assistant response to UI
        setMessages(prev => [...prev, response.response]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      const errorMessage = {
        role: 'assistant',
        content: 'Xin lỗi, đã xảy ra lỗi khi xử lý tin nhắn của bạn. Vui lòng thử lại sau.',
        type: 'text',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Render product list message
  const renderProductList = (message) => {
    if (!message.metadata || !message.metadata.products) {
      return <p>{message.content}</p>;
    }
    
    const products = message.metadata.products;
    
    return (
      <div>
        <p className="mb-4">{message.content}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {products.map((product, index) => (
            <div key={index} className="glass p-4 rounded-lg">
              <div className="flex items-center">
                {product.image_url && product.image_url.length > 0 && (
                  <img 
                    src={product.image_url[0]} 
                    alt={product.name} 
                    className="w-16 h-16 object-cover rounded-lg mr-3"
                  />
                )}
                <div>
                  <h4 className="font-medium">{product.name}</h4>
                  <p className="text-sm text-primary-600 dark:text-primary-400 font-bold">
                    {product.min_price.toLocaleString()} - {product.max_price.toLocaleString()} VND
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <Link 
                  to={`/product/${product.id}`} 
                  className="btn btn-primary text-sm w-full text-center"
                >
                  Xem chi tiết
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render product detail message
  const renderProductDetail = (message) => {
    if (!message.metadata || !message.metadata.product) {
      return <p>{message.content}</p>;
    }
    
    const product = message.metadata.product;
    
    return (
      <div>
        <p className="mb-4">{message.content}</p>
        <div className="glass p-4 rounded-lg">
          <div className="flex flex-col sm:flex-row">
            {product.image_url && product.image_url.length > 0 && (
              <img 
                src={product.image_url[0]} 
                alt={product.name} 
                className="w-full sm:w-32 h-32 object-cover rounded-lg mb-3 sm:mb-0 sm:mr-4"
              />
            )}
            <div>
              <h4 className="font-medium text-lg">{product.name}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{product.brand}</p>
              <p className="text-primary-600 dark:text-primary-400 font-bold mb-2">
                {product.min_price.toLocaleString()} - {product.max_price.toLocaleString()} VND
              </p>
              {product.specifications && (
                <div className="text-sm">
                  {product.specifications.display && (
                    <p>• Màn hình: {product.specifications.display}</p>
                  )}
                  {product.specifications.cpu && (
                    <p>• CPU: {product.specifications.cpu}</p>
                  )}
                  {product.specifications.ram && (
                    <p>• RAM: {product.specifications.ram}</p>
                  )}
                </div>
              )}
              <div className="mt-3">
                <Link 
                  to={`/product/${product.id}`} 
                  className="btn btn-primary text-sm"
                >
                  Xem chi tiết
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render product comparison message
  const renderProductComparison = (message) => {
    if (!message.metadata || !message.metadata.products || message.metadata.products.length < 2) {
      return <p>{message.content}</p>;
    }
    
    const products = message.metadata.products;
    
    return (
      <div>
        <p className="mb-4">{message.content}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="px-4 py-2">Thông số</th>
                {products.map((product, index) => (
                  <th key={index} className="px-4 py-2">{product.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-2 font-medium">Giá</td>
                {products.map((product, index) => (
                  <td key={index} className="px-4 py-2">
                    {product.min_price.toLocaleString()} - {product.max_price.toLocaleString()} VND
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium">Màn hình</td>
                {products.map((product, index) => (
                  <td key={index} className="px-4 py-2">
                    {product.specifications?.display || '-'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium">CPU</td>
                {products.map((product, index) => (
                  <td key={index} className="px-4 py-2">
                    {product.specifications?.cpu || '-'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium">RAM</td>
                {products.map((product, index) => (
                  <td key={index} className="px-4 py-2">
                    {product.specifications?.ram || '-'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium">Camera</td>
                {products.map((product, index) => (
                  <td key={index} className="px-4 py-2">
                    {product.specifications?.camera || '-'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium">Pin</td>
                {products.map((product, index) => (
                  <td key={index} className="px-4 py-2">
                    {product.specifications?.battery || '-'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-2 font-medium">Hành động</td>
                {products.map((product, index) => (
                  <td key={index} className="px-4 py-2">
                    <Link 
                      to={`/product/${product.id}`} 
                      className="btn btn-primary text-xs"
                    >
                      Xem chi tiết
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <Link 
            to="/compare" 
            className="btn btn-secondary text-sm"
            state={{ productIds: products.map(p => p.id) }}
          >
            So sánh đầy đủ
          </Link>
        </div>
      </div>
    );
  };

  // Render message based on type
  const renderMessage = (message) => {
    switch (message.type) {
      case 'product_list':
        return renderProductList(message);
      case 'product_detail':
        return renderProductDetail(message);
      case 'product_comparison':
        return renderProductComparison(message);
      default:
        return <p>{message.content}</p>;
    }
  };

  return (
    <div className="fade-in">
      <div className="glass p-6 mb-8">
        <h1 className="text-3xl font-bold mb-2">Trợ lý mua sắm điện thoại</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Hỏi tôi bất cứ điều gì về điện thoại, tôi sẽ giúp bạn tìm sản phẩm phù hợp nhất
        </p>
      </div>

      <div ref={ref} className={`glass p-6 mb-8 ${inView ? 'fade-in' : 'opacity-0'}`}>
        <div className="flex flex-col space-y-4 h-[500px] overflow-y-auto mb-4 p-2">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`chat-bubble ${
                message.role === 'user' 
                  ? 'chat-bubble-user bg-primary-500 text-white' 
                  : 'chat-bubble-bot glass'
              }`}
            >
              {renderMessage(message)}
              <div className="text-xs opacity-70 mt-1 text-right">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="chat-bubble-bot glass">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            ref={inputRef}
            className="input flex-1"
            placeholder="Nhập tin nhắn của bạn..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
          />
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isTyping || !input.trim()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </form>
      </div>

      <div className="glass p-6">
        <h2 className="text-xl font-bold mb-4">Gợi ý câu hỏi</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button 
            className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
            onClick={() => setInput("Điện thoại nào có camera tốt nhất dưới 15 triệu?")}
          >
            Điện thoại nào có camera tốt nhất dưới 15 triệu?
          </button>
          <button 
            className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
            onClick={() => setInput("So sánh iPhone 15 Pro và Samsung Galaxy S24 Ultra")}
          >
            So sánh iPhone 15 Pro và Samsung Galaxy S24 Ultra
          </button>
          <button 
            className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
            onClick={() => setInput("Điện thoại nào có pin trâu nhất hiện nay?")}
          >
            Điện thoại nào có pin trâu nhất hiện nay?
          </button>
          <button 
            className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
            onClick={() => setInput("Tôi cần một điện thoại chơi game tốt dưới 10 triệu")}
          >
            Tôi cần một điện thoại chơi game tốt dưới 10 triệu
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
