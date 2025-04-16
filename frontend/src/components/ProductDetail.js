import React, { useState } from 'react';
import { motion } from 'framer-motion';

const ProductDetail = ({ product }) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Format giá tiền
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  if (!product) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6 text-center">
        <p className="text-gray-500">Không có thông tin sản phẩm.</p>
      </div>
    );
  }

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
            {product.image_url && product.image_url.length > 0 ? (
              <img
                src={product.image_url[activeImageIndex]}
                alt={product.name}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="text-gray-400">Không có hình ảnh</div>
            )}
          </motion.div>
          
          {/* Hình ảnh nhỏ */}
          {product.image_url && product.image_url.length > 1 && (
            <div className="flex overflow-x-auto gap-2 pb-2">
              {product.image_url.map((img, index) => (
                <div 
                  key={index} 
                  className={`w-16 h-16 flex-shrink-0 bg-gray-100 rounded cursor-pointer border-2 ${
                    index === activeImageIndex ? 'border-blue-500' : 'border-transparent'
                  }`}
                  onClick={() => setActiveImageIndex(index)}
                >
                  <img
                    src={img}
                    alt={`${product.name} - ${index + 1}`}
                    className="w-full h-full object-contain"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Phần thông tin sản phẩm */}
        <div>
          <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
          <p className="text-gray-600 mb-4">Thương hiệu: {product.brand}</p>
          
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
          {product.sources && product.sources.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Giá tại các cửa hàng</h2>
              <div className="space-y-2">
                {product.sources.map((source, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span>{source.name}</span>
                    <div className="flex items-center">
                      <span className="font-medium text-blue-600 mr-2">{formatPrice(source.price)}</span>
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm bg-blue-600 text-white py-1 px-2 rounded hover:bg-blue-700"
                      >
                        Xem
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Thông số kỹ thuật */}
      {product.specifications && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Thông số kỹ thuật</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {product.specifications.cpu && (
                <div className="flex">
                  <span className="w-1/3 font-medium">CPU:</span>
                  <span className="w-2/3">{product.specifications.cpu}</span>
                </div>
              )}
              {product.specifications.ram && (
                <div className="flex">
                  <span className="w-1/3 font-medium">RAM:</span>
                  <span className="w-2/3">{product.specifications.ram}</span>
                </div>
              )}
              {product.specifications.storage && (
                <div className="flex">
                  <span className="w-1/3 font-medium">Bộ nhớ:</span>
                  <span className="w-2/3">{product.specifications.storage}</span>
                </div>
              )}
              {product.specifications.display && (
                <div className="flex">
                  <span className="w-1/3 font-medium">Màn hình:</span>
                  <span className="w-2/3">{product.specifications.display}</span>
                </div>
              )}
              {product.specifications.camera && (
                <div className="flex">
                  <span className="w-1/3 font-medium">Camera:</span>
                  <span className="w-2/3">{product.specifications.camera}</span>
                </div>
              )}
              {product.specifications.battery && (
                <div className="flex">
                  <span className="w-1/3 font-medium">Pin:</span>
                  <span className="w-2/3">{product.specifications.battery}</span>
                </div>
              )}
              {product.specifications.os && (
                <div className="flex">
                  <span className="w-1/3 font-medium">Hệ điều hành:</span>
                  <span className="w-2/3">{product.specifications.os}</span>
                </div>
              )}
              {product.specifications.weight && (
                <div className="flex">
                  <span className="w-1/3 font-medium">Trọng lượng:</span>
                  <span className="w-2/3">{product.specifications.weight}</span>
                </div>
              )}
              {product.specifications.dimensions && (
                <div className="flex">
                  <span className="w-1/3 font-medium">Kích thước:</span>
                  <span className="w-2/3">{product.specifications.dimensions}</span>
                </div>
              )}
              {product.specifications.color && product.specifications.color.length > 0 && (
                <div className="flex">
                  <span className="w-1/3 font-medium">Màu sắc:</span>
                  <span className="w-2/3">{product.specifications.color.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;