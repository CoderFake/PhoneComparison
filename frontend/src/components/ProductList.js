import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const ProductList = ({ products = [] }) => {
  const [sortBy, setSortBy] = useState('relevance');
  const [priceRange, setPriceRange] = useState([0, 50000000]);
  const [brands, setBrands] = useState([]);
  const [error, setError] = useState(null);

  const safeProducts = Array.isArray(products) ? products : [];

  const availableBrands = [...new Set(safeProducts.map(product => product.brand || 'Unknown'))];

  const filteredProducts = safeProducts
    .filter(product => {
      const minPrice = typeof product.min_price === 'number' ? product.min_price : 
                     parseFloat(product.min_price || 0);
      
      if (minPrice < priceRange[0] || minPrice > priceRange[1]) {
        return false;
      }
      
      if (brands.length > 0 && (!product.brand || !brands.includes(product.brand))) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      const aPrice = typeof a.min_price === 'number' ? a.min_price : parseFloat(a.min_price || 0);
      const bPrice = typeof b.min_price === 'number' ? b.min_price : parseFloat(b.min_price || 0);
      
      switch (sortBy) {
        case 'price_asc':
          return aPrice - bPrice;
        case 'price_desc':
          return bPrice - aPrice;
        default:
          return 0; 
      }
    });

  const handleBrandChange = (brand) => {
    if (brands.includes(brand)) {
      setBrands(brands.filter(b => b !== brand));
    } else {
      setBrands([...brands, brand]);
    }
  };

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

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-6">Danh sách sản phẩm</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="md:col-span-1">
          <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
            <h3 className="font-medium text-lg mb-4">Bộ lọc</h3>
            
            {/* Bộ lọc thương hiệu */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">Thương hiệu</h4>
              {availableBrands.map(brand => (
                <div key={brand} className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id={`brand-${brand}`}
                    checked={brands.includes(brand)}
                    onChange={() => handleBrandChange(brand)}
                    className="mr-2 h-4 w-4"
                  />
                  <label htmlFor={`brand-${brand}`}>{brand}</label>
                </div>
              ))}
            </div>
            
            {/* Bộ lọc giá */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">Khoảng giá</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-gray-600">Từ</label>
                  <input
                    type="number"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Đến</label>
                  <input
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 0])}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="md:col-span-3">
          {/* Thanh sắp xếp */}
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-600">Hiển thị {filteredProducts.length} sản phẩm</p>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="relevance">Sắp xếp theo độ liên quan</option>
              <option value="price_asc">Giá: Thấp đến cao</option>
              <option value="price_desc">Giá: Cao đến thấp</option>
            </select>
          </div>
          
          {/* Danh sách sản phẩm */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="h-48 bg-gray-200 flex items-center justify-center p-4">
                  {product.image_url && Array.isArray(product.image_url) && product.image_url.length > 0 ? (
                    <img
                      src={product.image_url[0]}
                      alt={product.name || 'Sản phẩm'}
                      className="max-h-full max-w-full object-contain"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="text-gray-400">Không có hình ảnh</div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-medium mb-2 line-clamp-2">{product.name || 'Không có tên sản phẩm'}</h3>
                  <p className="text-sm text-gray-600 mb-2">{product.brand || 'Không rõ thương hiệu'}</p>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-lg text-blue-600">
                        {formatPrice(product.min_price)}
                      </p>
                      {product.max_price > product.min_price && (
                        <p className="text-sm text-gray-500">
                          đến {formatPrice(product.max_price)}
                        </p>
                      )}
                    </div>
                    <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                      Chi tiết
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Không tìm thấy sản phẩm phù hợp với bộ lọc.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductList;