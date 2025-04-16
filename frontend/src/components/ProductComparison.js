import React from 'react';
import { motion } from 'framer-motion';

const ProductComparison = ({ products = [] }) => {
  const safeProducts = Array.isArray(products) ? products : [];
  
  const formatPrice = (price) => {
    const numPrice = typeof price === 'number' ? price : parseFloat(price || 0);
    
    if (isNaN(numPrice)) {
      return 'Không có giá';
    }
    
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numPrice);
  };

  const handleImageError = (e) => {
    e.target.onerror = null; 
    e.target.src = 'https://via.placeholder.com/150?text=Không+có+hình';
  };

  if (safeProducts.length < 2) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6 text-center">
        <p className="text-gray-500">Cần ít nhất 2 sản phẩm để so sánh.</p>
      </div>
    );
  }

  const specFields = [
    { key: 'cpu', label: 'CPU' },
    { key: 'ram', label: 'RAM' },
    { key: 'storage', label: 'Bộ nhớ' },
    { key: 'display', label: 'Màn hình' },
    { key: 'camera', label: 'Camera' },
    { key: 'battery', label: 'Pin' },
    { key: 'os', label: 'Hệ điều hành' },
    { key: 'weight', label: 'Trọng lượng' },
    { key: 'dimensions', label: 'Kích thước' },
    { key: 'color', label: 'Màu sắc' }
  ];

  return (
    <motion.div 
      className="bg-white shadow-md rounded-lg p-6 overflow-x-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-2xl font-semibold mb-6">So sánh sản phẩm</h2>
      
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
              Đặc điểm
            </th>
            {safeProducts.map((product, index) => (
              <th 
                key={index} 
                className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                style={{ width: `${75 / safeProducts.length}%` }}
              >
                {product.name || 'Không có tên'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {/* Hình ảnh */}
          <tr>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              Hình ảnh
            </td>
            {safeProducts.map((product, index) => (
              <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="h-32 flex items-center justify-center">
                  {product.image_url && Array.isArray(product.image_url) && product.image_url.length > 0 ? (
                    <img
                      src={product.image_url[0]}
                      alt={product.name || 'Sản phẩm'}
                      className="max-h-full max-w-full object-contain"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="text-gray-400">Không có hình</div>
                  )}
                </div>
              </td>
            ))}
          </tr>
          
          {/* Thương hiệu */}
          <tr>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              Thương hiệu
            </td>
            {safeProducts.map((product, index) => (
              <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {product.brand || 'Không rõ'}
              </td>
            ))}
          </tr>
          
          {/* Giá */}
          <tr>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              Giá
            </td>
            {safeProducts.map((product, index) => (
              <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="font-bold text-blue-600">{formatPrice(product.min_price)}</div>
                {product.max_price > product.min_price && (
                  <div className="text-xs">đến {formatPrice(product.max_price)}</div>
                )}
              </td>
            ))}
          </tr>
          
          {/* Thông số kỹ thuật */}
          {specFields.map((field) => {
            const hasField = safeProducts.some(
              product => product.specifications && 
                         typeof product.specifications === 'object' && 
                         product.specifications[field.key]
            );
            
            if (!hasField) return null;
            
            return (
              <tr key={field.key}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {field.label}
                </td>
                {safeProducts.map((product, index) => {
                  const specs = product.specifications && typeof product.specifications === 'object' ? 
                             product.specifications : {};
                             
                  const value = specs[field.key];
                  let displayValue = value || '-';
                  
                  if (Array.isArray(value)) {
                    displayValue = value.length > 0 ? value.join(', ') : '-';
                  }
                  
                  return (
                    <td key={index} className="px-6 py-4 whitespace-normal text-sm text-gray-500">
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          
          {/* Nguồn */}
          <tr>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              Nguồn
            </td>
            {safeProducts.map((product, index) => (
              <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {product.sources && Array.isArray(product.sources) && product.sources.length > 0 ? (
                  <div className="space-y-1">
                    {product.sources.map((source, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span>{source.name || 'Không rõ nguồn'}</span>
                        {source.url && (
                          <a 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs bg-blue-600 text-white py-0.5 px-1 rounded hover:bg-blue-700"
                          >
                            Xem
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  '-'
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </motion.div>
  );
};

export default ProductComparison;