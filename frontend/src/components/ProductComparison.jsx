import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { productApi } from '../services/api';

const ProductComparison = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  
  // Intersection observer for animation
  const { ref, inView } = useInView({
    triggerOnce: false,
    threshold: 0.1,
  });

  // Initialize with products from location state if available
  useEffect(() => {
    if (location.state && location.state.productIds) {
      setSelectedProducts(location.state.productIds);
    }
  }, [location]);

  // Fetch selected products for comparison
  useEffect(() => {
    const fetchSelectedProducts = async () => {
      if (selectedProducts.length === 0) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await productApi.compareProducts(selectedProducts);
        setProducts(data);
      } catch (err) {
        console.error('Error fetching products for comparison:', err);
        setError('Không thể tải thông tin sản phẩm để so sánh. Vui lòng thử lại sau.');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSelectedProducts();
  }, [selectedProducts]);

  // Fetch available products for selection
  useEffect(() => {
    const fetchAvailableProducts = async () => {
      try {
        const params = {
          query: searchTerm,
          limit: 20
        };
        
        const data = await productApi.getProducts(params);
        setAvailableProducts(data);
      } catch (err) {
        console.error('Error fetching available products:', err);
        setAvailableProducts([]);
      }
    };

    fetchAvailableProducts();
  }, [searchTerm]);

  // Toggle product selection
  const toggleProductSelection = (productId) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      // Limit to 3 products for comparison
      if (selectedProducts.length < 3) {
        setSelectedProducts([...selectedProducts, productId]);
      }
    }
  };

  // Get winner for a specific spec
  const getWinner = (spec) => {
    if (products.length < 2) return null;
    
    // Different comparison logic based on the spec
    switch(spec) {
      case 'price':
        return products.reduce((prev, current) => 
          prev.min_price < current.min_price ? prev : current
        ).id;
      
      case 'weight':
        return products.reduce((prev, current) => {
          const prevWeight = prev.specifications?.weight 
            ? parseInt(prev.specifications.weight.replace(/[^0-9]/g, '')) 
            : Number.MAX_SAFE_INTEGER;
          const currentWeight = current.specifications?.weight 
            ? parseInt(current.specifications.weight.replace(/[^0-9]/g, '')) 
            : Number.MAX_SAFE_INTEGER;
          return prevWeight < currentWeight ? prev : current;
        }).id;
      
      case 'battery':
        return products.reduce((prev, current) => {
          const prevBattery = prev.specifications?.battery?.includes('mAh') 
            ? parseInt(prev.specifications.battery.replace(/[^0-9]/g, '')) 
            : 0;
          const currentBattery = current.specifications?.battery?.includes('mAh') 
            ? parseInt(current.specifications.battery.replace(/[^0-9]/g, '')) 
            : 0;
          return prevBattery > currentBattery ? prev : current;
        }).id;
      
      case 'camera':
        return products.reduce((prev, current) => {
          const prevCamera = prev.specifications?.camera?.includes('MP') 
            ? parseInt(prev.specifications.camera.replace(/[^0-9]/g, '')) 
            : 0;
          const currentCamera = current.specifications?.camera?.includes('MP') 
            ? parseInt(current.specifications.camera.replace(/[^0-9]/g, '')) 
            : 0;
          return prevCamera > currentCamera ? prev : current;
        }).id;
      
      case 'display':
        return products.reduce((prev, current) => {
          const prevDisplay = prev.specifications?.display?.includes('inch') 
            ? parseFloat(prev.specifications.display.match(/(\d+\.\d+)/)?.[0] || 0) 
            : 0;
          const currentDisplay = current.specifications?.display?.includes('inch') 
            ? parseFloat(current.specifications.display.match(/(\d+\.\d+)/)?.[0] || 0) 
            : 0;
          return prevDisplay > currentDisplay ? prev : current;
        }).id;
      
      case 'rating':
        return products.reduce((prev, current) => {
          const prevRating = prev.sources.length > 0 
            ? prev.sources.reduce((sum, source) => sum + (source.rating || 0), 0) / prev.sources.length 
            : 0;
          const currentRating = current.sources.length > 0 
            ? current.sources.reduce((sum, source) => sum + (source.rating || 0), 0) / current.sources.length 
            : 0;
          return prevRating > currentRating ? prev : current;
        }).id;
      
      default:
        return null;
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Search is handled by the useEffect dependency
  };

  if (loading && selectedProducts.length > 0) {
    return (
      <div className="fade-in">
        <div className="glass p-6 mb-8">
          <div className="skeleton h-8 w-1/2 mb-4"></div>
          <div className="skeleton h-4 w-3/4"></div>
        </div>
        <div className="glass p-6 mb-8">
          <div className="skeleton h-10 w-full mb-6"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="skeleton h-40 w-full"></div>
            <div className="skeleton h-40 w-full"></div>
            <div className="skeleton h-40 w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="glass p-6 mb-8">
        <h1 className="text-3xl font-bold mb-2">So sánh điện thoại</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Chọn tối đa 3 điện thoại để so sánh thông số kỹ thuật
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="glass p-4 mb-8 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200">
          <p>{error}</p>
        </div>
      )}

      {/* Product selection */}
      <div className="glass p-6 mb-8">
        <div className="mb-6">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tìm kiếm điện thoại để so sánh
          </label>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              id="search"
              placeholder="Nhập tên điện thoại..."
              className="input flex-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              Tìm kiếm
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {availableProducts.map(product => (
            <div 
              key={product.id} 
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                selectedProducts.includes(product.id) 
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900 dark:bg-opacity-20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
              }`}
              onClick={() => toggleProductSelection(product.id)}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-3">
                  <img 
                    src={product.image_url && product.image_url.length > 0 ? product.image_url[0] : 'https://placehold.co/300x400/0ea5e9/FFFFFF?text=No+Image'} 
                    alt={product.name} 
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                </div>
                <div>
                  <h3 className="font-medium">{product.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {product.min_price.toLocaleString()} - {product.max_price.toLocaleString()} VND
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison table */}
      {products.length > 0 ? (
        <div ref={ref} className={`glass p-6 overflow-x-auto ${inView ? 'fade-in' : 'opacity-0'}`}>
          <h2 className="text-2xl font-bold mb-6">So sánh</h2>
          
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-tl-lg">Thông số</th>
                {products.map(product => (
                  <th key={product.id} className="px-4 py-3 bg-gray-50 dark:bg-gray-800">
                    <div className="flex flex-col items-center">
                      <img 
                        src={product.image_url && product.image_url.length > 0 ? product.image_url[0] : 'https://placehold.co/300x400/0ea5e9/FFFFFF?text=No+Image'} 
                        alt={product.name} 
                        className="w-16 h-16 object-cover rounded-lg mb-2"
                      />
                      <span>{product.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3 font-medium bg-gray-50 dark:bg-gray-800">Giá</td>
                {products.map(product => (
                  <td 
                    key={product.id} 
                    className={`px-4 py-3 text-center ${getWinner('price') === product.id ? 'bg-green-50 dark:bg-green-900 dark:bg-opacity-20 font-bold' : ''}`}
                  >
                    {product.min_price.toLocaleString()} - {product.max_price.toLocaleString()} VND
                    {getWinner('price') === product.id && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded dark:bg-green-900 dark:text-green-200">
                        Tốt nhất
                      </span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium bg-gray-50 dark:bg-gray-800">Màn hình</td>
                {products.map(product => (
                  <td 
                    key={product.id} 
                    className={`px-4 py-3 text-center ${getWinner('display') === product.id ? 'bg-green-50 dark:bg-green-900 dark:bg-opacity-20 font-bold' : ''}`}
                  >
                    {product.specifications?.display || 'N/A'}
                    {getWinner('display') === product.id && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded dark:bg-green-900 dark:text-green-200">
                        Tốt nhất
                      </span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium bg-gray-50 dark:bg-gray-800">Vi xử lý</td>
                {products.map(product => (
                  <td key={product.id} className="px-4 py-3 text-center">
                    {product.specifications?.processor || 'N/A'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium bg-gray-50 dark:bg-gray-800">RAM</td>
                {products.map(product => (
                  <td key={product.id} className="px-4 py-3 text-center">
                    {product.specifications?.ram || 'N/A'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium bg-gray-50 dark:bg-gray-800">Bộ nhớ</td>
                {products.map(product => (
                  <td key={product.id} className="px-4 py-3 text-center">
                    {product.specifications?.storage || 'N/A'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium bg-gray-50 dark:bg-gray-800">Camera</td>
                {products.map(product => (
                  <td 
                    key={product.id} 
                    className={`px-4 py-3 text-center ${getWinner('camera') === product.id ? 'bg-green-50 dark:bg-green-900 dark:bg-opacity-20 font-bold' : ''}`}
                  >
                    {product.specifications?.camera || 'N/A'}
                    {getWinner('camera') === product.id && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded dark:bg-green-900 dark:text-green-200">
                        Tốt nhất
                      </span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium bg-gray-50 dark:bg-gray-800">Pin</td>
                {products.map(product => (
                  <td 
                    key={product.id} 
                    className={`px-4 py-3 text-center ${getWinner('battery') === product.id ? 'bg-green-50 dark:bg-green-900 dark:bg-opacity-20 font-bold' : ''}`}
                  >
                    {product.specifications?.battery || 'N/A'}
                    {getWinner('battery') === product.id && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded dark:bg-green-900 dark:text-green-200">
                        Tốt nhất
                      </span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium bg-gray-50 dark:bg-gray-800">Hệ điều hành</td>
                {products.map(product => (
                  <td key={product.id} className="px-4 py-3 text-center">
                    {product.specifications?.os || 'N/A'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium bg-gray-50 dark:bg-gray-800">Kích thước</td>
                {products.map(product => (
                  <td key={product.id} className="px-4 py-3 text-center">
                    {product.specifications?.dimensions || 'N/A'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium bg-gray-50 dark:bg-gray-800">Trọng lượng</td>
                {products.map(product => (
                  <td 
                    key={product.id} 
                    className={`px-4 py-3 text-center ${getWinner('weight') === product.id ? 'bg-green-50 dark:bg-green-900 dark:bg-opacity-20 font-bold' : ''}`}
                  >
                    {product.specifications?.weight || 'N/A'}
                    {getWinner('weight') === product.id && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded dark:bg-green-900 dark:text-green-200">
                        Tốt nhất
                      </span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium bg-gray-50 dark:bg-gray-800">Đánh giá</td>
                {products.map(product => {
                  const avgRating = product.sources.length > 0 
                    ? product.sources.reduce((sum, source) => sum + (source.rating || 0), 0) / product.sources.length 
                    : 0;
                  
                  return (
                    <td 
                      key={product.id} 
                      className={`px-4 py-3 text-center ${getWinner('rating') === product.id ? 'bg-green-50 dark:bg-green-900 dark:bg-opacity-20 font-bold' : ''}`}
                    >
                      <div className="flex justify-center items-center">
                        <div className="flex text-yellow-400 mr-1">
                          {[...Array(5)].map((_, i) => (
                            <svg 
                              key={i} 
                              xmlns="http://www.w3.org/2000/svg" 
                              className={`h-4 w-4 ${i < Math.floor(avgRating) ? 'fill-current' : 'stroke-current fill-none'}`} 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          ))}
                        </div>
                        {avgRating.toFixed(1)}
                        {getWinner('rating') === product.id && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded dark:bg-green-900 dark:text-green-200">
                            Tốt nhất
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium bg-gray-50 dark:bg-gray-800 rounded-bl-lg">Hành động</td>
                {products.map(product => (
                  <td key={product.id} className="px-4 py-3 text-center">
                    <Link 
                      to={`/product/${product.id}`} 
                      className="btn btn-primary text-sm"
                    >
                      Xem chi tiết
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass p-12 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-bold mb-2">Chưa có sản phẩm nào được chọn</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Vui lòng chọn ít nhất một sản phẩm để so sánh.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductComparison;
