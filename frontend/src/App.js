import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProductList from './components/ProductList';
import ProductDetail from './components/ProductDetail';
import ProductComparison from './components/ProductComparison';
import ChatBot from './components/ChatBot';
import './styles/main.css';

function App() {
  const [previewData, setPreviewData] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  // Xử lý dữ liệu từ chatbot
  const handleChatbotData = (data) => {
    if (!data) return;
    
    if (data.products && data.messageType === 'product_list') {
      setPreviewData({
        type: 'product_list',
        data: data.products
      });
    } else if (data.product && data.messageType === 'product_detail') {
      setPreviewData({
        type: 'product_detail',
        data: data.product
      });
    } else if (data.products && data.messageType === 'product_comparison') {
      setPreviewData({
        type: 'product_comparison',
        data: data.products
      });
    }
  };

  // Render component dựa trên loại dữ liệu
  const renderPreview = () => {
    if (!previewData) return null;
    
    switch (previewData.type) {
      case 'product_list':
        return <ProductList products={previewData.data} />;
      case 'product_detail':
        return <ProductDetail product={previewData.data} />;
      case 'product_comparison':
        return <ProductComparison products={previewData.data} />;
      default:
        return null;
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-blue-600 shadow-lg">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-white">So Sánh Giá Điện Thoại Việt Nam</h1>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row">
            <div className="flex-1 px-4 sm:px-0">
              {previewData ? (
                renderPreview()
              ) : (
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="text-center py-12">
                    <h2 className="text-xl font-medium text-gray-900 mb-4">
                      Chào mừng đến với hệ thống so sánh giá điện thoại
                    </h2>
                    <p className="text-gray-600 mb-6">
                      Hãy chat với trợ lý ảo để tìm kiếm sản phẩm điện thoại bạn quan tâm
                    </p>
                    <button
                      onClick={() => setChatOpen(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Mở chat với trợ lý
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className={`fixed bottom-0 right-0 z-10 transition-all duration-300 ${chatOpen ? 'w-96' : 'w-16'}`}>
              <ChatBot 
                isOpen={chatOpen} 
                onToggle={() => setChatOpen(!chatOpen)} 
                onDataReceived={handleChatbotData}
              />
            </div>
          </div>
        </main>
        
        <footer className="bg-white">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 border-t border-gray-200">
            <p className="text-center text-gray-500 text-sm">
              © 2025 So Sánh Giá Điện Thoại Việt Nam. Tất cả các quyền được bảo lưu.
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;