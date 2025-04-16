import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const ProductDetail = ({ product }) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!product) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6 text-center">
        <p className="text-gray-500">Không có thông tin sản phẩm.</p>
      </div>
    );
  }

  // Đảm bảo image_url là mảng
  const imageUrls = Array.isArray(product.image_url) ? product.image_url : 
                  (product.image_url ? [product.image_url] : []);

  // Reset active image index nếu vượt quá số lượng ảnh
  useEffect(() => {
    if (activeImageIndex >= imageUrls.length) {
      setActiveImageIndex(0);
    }
  }, [imageUrls, activeImageIndex]);

  // Format giá tiền - xử lý giá trị không phải số
  const formatPrice = (price) => {
    // Đảm bảo price là số
    const numPrice = typeof price === 'number' ? price : parseFloat(price || 0);
    
    if (isNaN(numPrice)) {
      return 'Không có giá';
    }
    
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numPrice);
  };

  // Xử lý lỗi hình ảnh
  const handleImageError = (e) => {
    e.target.onerror = null; 
    e.target.src = 'https://via.placeholder.com/300?text=Không+có+hình';
  };

  // Xử lý thông số kỹ thuật
  const renderSpecifications = () => {
    // Kiểm tra specifications có tồn tại và là object không
    if (!product.specifications || typeof product.specifications !== 'object') {
      return null;
    }

    // Danh sách thông số muốn hiển thị
    const specFields = [
      { key: 'cpu', label: 'CPU' },
      { key: 'ram', label: 'RAM' },
      { key: 'storage', label: 'Bộ nhớ' },
      { key: 'display', label: 'Màn hình' },
      { key: 'camera', label: 'Camera' },
      { key: 'battery', label: 'Pin' },
      { key: 'os', label: 'Hệ điều hành' },
      { key: 'weight', label: 'Trọng lượng' },
      { key: 'dimensions', label: 'Kích thước' }
    ];

    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Thông số kỹ thuật</h2>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {specFields.map(field => {
              if (!product.specifications[field.key]) return null;
              
              return (
                <div key={field.key} className="flex">
                  <span className="w-1/3 font-medium">{field.label}:</span>
                  <span className="w-2/3">{product.specifications[field.key]}</span>
                </div>
              );
            })}
            
            {/* Xử lý đặc biệt cho color */}
            {product.specifications.color && 
             (Array.isArray(product.specifications.color) ? 
              product.specifications.color.length > 0 : 
              product.specifications.color) && (
              <div className="flex">
                <span className="w-1/3 font-medium">Màu sắc:</span>
                <span className="w-2/3">
                  {Array.isArray(product.specifications.color) 
                    ? product.specifications.color.join(', ')
                    : product.specifications.color}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Phần hình ảnh */}
        <div>
          <motion.div 
            className="h-64 md:h-80 bg-gray-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {imageUrls.length > 0 ? (
              <img
                src={imageUrls[activeImageIndex]}
                alt={product.name || 'Chi tiết sản phẩm'}
                className="max-h-full max-w-full object-contain"
                onError={handleImageError}
              />
            ) : (
              <div className="text-gray-400">Không có hình ảnh</div>
            )}
          </motion.div>
          
          {/* Hình ảnh nhỏ */}
          {imageUrls.length > 1 && (
            <div className="flex overflow-x-auto gap-2 pb-2">
              {imageUrls.map((img, index) => (
                <div 
                  key={index} 
                  className={`w-16 h-16 flex-shrink-0 bg-gray-100 rounded cursor-pointer border-2 ${
                    index === activeImageIndex ? 'border-blue-500' : 'border-transparent'
                  }`}
                  onClick={() => setActiveImageIndex(index)}
                >
                  <img
                    src={img}
                    alt={`${product.name || 'Sản phẩm'} - ${index + 1}`}
                    className="w-full h-full object-contain"
                    onError={handleImageError}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Phần thông tin sản phẩm */}
        <div>
          <h1 className="text-2xl font-bold mb-2">{product.name || 'Không có tên sản phẩm'}</h1>
          <p className="text-gray-600 mb-4">Thương hiệu: {product.brand || 'Không rõ'}</p>
          
          <div className="mb-6">
            <p className="text-3xl font-bold text-blue-600">{formatPrice(product.min_price)}</p>
            {product.max_price > product.min_price && (
              <p className="text-gray-500">đến {formatPrice(product.max_price)}</p>
            )}
          </div>
          
          {/* Mô tả sản phẩm */}
          {product.description && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Mô tả</h2>
              <p className="text-gray-700">{product.description}</p>
            </div>
          )}
          
          {/* Nguồn sản phẩm */}
          {product.sources && Array.isArray(product.sources) && product.sources.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Giá tại các cửa hàng</h2>
              <div className="space-y-2">
                {product.sources.map((source, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span>{source.name || 'Không rõ nguồn'}</span>
                    <div className="flex items-center">
                      <span className="font-medium text-blue-600 mr-2">
                        {formatPrice(source.price)}
                      </span>
                      {source.url && (
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm bg-blue-600 text-white py-1 px-2 rounded hover:bg-blue-700"
                        >
                          Xem
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Thông số kỹ thuật */}
      {renderSpecifications()}
    </div>
  );
};

export default ProductDetail;