import React from 'react';
import { motion } from 'framer-motion';

const ProductComparison = ({ products }) => {
  // Format giá tiền
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Kiểm tra nếu không có sản phẩm
  if (!products || products.length < 2) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6 text-center">
        <p className="text-gray-500">Cần ít nhất 2 sản phẩm để so sánh.</p>
      </div>
    );
  }

  // Danh sách tất cả các thông số kỹ thuật cần so sánh
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
            {products.map((product, index) => (
              <th 
                key={index} 
                className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                style={{ width: `${75 / products.length}%` }}
              >
                {product.name}
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
            {products.map((product, index) => (
              <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="h-32 flex items-center justify-center">
                  {product.image_url && product.image_url.length > 0 ? (
                    <img
                      src={product.image_url[0]}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain"
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
            {products.map((product, index) => (
              <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {product.brand}
              </td>
            ))}
          </tr>
          
          {/* Giá */}
          <tr>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              Giá
            </td>
            {products.map((product, index) => (
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
            // Kiểm tra nếu ít nhất một sản phẩm có thông số này
            const hasField = products.some(
              product => product.specifications && product.specifications[field.key]
            );
            
            if (!hasField) return null;
            
            return (
              <tr key={field.key}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {field.label}
                </td>
                {products.map((product, index) => {
                  const value = product.specifications ? product.specifications[field.key] : null;
                  let displayValue = value;
                  
                  // Xử lý đặc biệt cho mảng (ví dụ: màu sắc)
                  if (Array.isArray(value)) {
                    displayValue = value.join(', ');
                  }
                  
                  return (
                    <td key={index} className="px-6 py-4 whitespace-normal text-sm text-gray-500">
                      {displayValue || '-'}
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
            {products.map((product, index) => (
              <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {product.sources && product.sources.length > 0 ? (
                  <div className="space-y-1">
                    {product.sources.map((source, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span>{source.name}</span>
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs bg-blue-600 text-white py-0.5 px-1 rounded hover:bg-blue-700"
                        >
                          Xem
                        </a>
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