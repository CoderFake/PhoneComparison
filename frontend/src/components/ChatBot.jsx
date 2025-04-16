import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { chatService } from '../services/chatService.jsx';
import ProductList from './ProductList';
import ProductDetail from './ProductDetail';
import ProductComparison from './ProductComparison';

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentView, setCurrentView] = useState('welcome');
  const [viewData, setViewData] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const newSessionId = localStorage.getItem('chatSessionId') || uuidv4();
    setSessionId(newSessionId);
    localStorage.setItem('chatSessionId', newSessionId);
    
    const loadChatHistory = async () => {
      try {
        const history = await chatService.getChatHistory(newSessionId);
        if (history && history.messages && history.messages.length > 0) {
          setMessages(history.messages);
          
          // Set initial view based on latest assistant message
          const latestAssistantMsg = [...history.messages]
            .reverse()
            .find(msg => msg.role === 'assistant');
            
          if (latestAssistantMsg) {
            updateViewFromMessage(latestAssistantMsg);
          }
        } else {
          setIsTyping(true);
          const response = await chatService.sendMessage(newSessionId, "");
          if (response && response.response) {
            setMessages([response.response]);
          }
          setIsTyping(false);
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
        setIsTyping(true);
        const response = await chatService.sendMessage(newSessionId, "");
        if (response && response.response) {
          setMessages([response.response]);
        }
        setIsTyping(false);
      }
    };
    
    loadChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isChatOpen]);
  
  const updateViewFromMessage = (message) => {
    if (!message) return;
    
    if (message.type === 'product_list' && message.metadata?.products) {
      setCurrentView('product_list');
      setViewData(message.metadata.products);
    } 
    else if (message.type === 'product_detail' && message.metadata?.product) {
      setCurrentView('product_detail');
      setViewData(message.metadata.product);
    } 
    else if (message.type === 'product_comparison' && message.metadata?.products) {
      setCurrentView('product_comparison');
      setViewData(message.metadata.products);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (input.trim() === '') return;
    
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
      const response = await chatService.sendMessage(sessionId, input);
      
      if (response && response.response) {
        setMessages(prev => [...prev, response.response]);
        updateViewFromMessage(response.response);
      }
    } catch (error) {
      console.error('Error sending message:', error);
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

  const renderMessage = (message) => {
    return <p>{message.content}</p>;
  };

  const renderChatButton = () => (
    <button
      onClick={() => setIsChatOpen(!isChatOpen)}
      className="bg-gradient-blue-purple w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
    >
      {isChatOpen ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      )}
    </button>
  );

  const renderChatWidget = () => (
    <div className="glass w-80 h-96 mb-4 flex flex-col rounded-xl overflow-hidden shadow-xl">
      <div className="bg-gradient-blue-purple p-3 flex justify-between items-center">
        <h3 className="text-white font-semibold">Trợ lý mua sắm</h3>
        <button 
          className="text-white hover:text-gray-200 transition-colors"
          onClick={() => setIsChatOpen(false)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`chat-bubble ${
              message.role === 'user' 
                ? 'chat-bubble-user bg-primary-500 text-white' 
                : 'chat-bubble-bot glass'
            } mb-3`}
          >
            {renderMessage(message)}
            <div className="text-xs opacity-70 mt-1 text-right">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="chat-bubble-bot glass mb-3">
            <div className="flex space-x-2">
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <input
            type="text"
            ref={inputRef}
            className="input flex-1 py-2"
            placeholder="Nhập tin nhắn..."
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
        </div>
      </form>
    </div>
  );

  const renderSuggestedPrompts = () => (
    <div className="glass p-6 mt-8">
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
  );

  const renderMainContent = () => {
    switch (currentView) {
      case 'product_list':
        return <ProductList initialProducts={viewData} isFromChat={true} />;
      case 'product_detail':
        return <ProductDetail productData={viewData} isFromChat={true} />;
      case 'product_comparison':
        return <ProductComparison productsData={viewData} isFromChat={true} />;
      default:
        return (
          <div className="fade-in">
            <div className="glass p-6 mb-8">
              <h1 className="text-3xl font-bold mb-2">Trợ lý mua sắm điện thoại</h1>
              <p className="text-gray-600 dark:text-gray-300">
                Hỏi tôi bất cứ điều gì về điện thoại, tôi sẽ giúp bạn tìm sản phẩm phù hợp nhất
              </p>
            </div>
            {renderSuggestedPrompts()}
          </div>
        );
    }
  };

  return (
    <>
      {/* Main content area */}
      {renderMainContent()}
      
      {/* Chat widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isChatOpen && renderChatWidget()}
        {renderChatButton()}
      </div>
    </>
  );
};

export default ChatBot;