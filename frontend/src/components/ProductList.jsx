import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { productApi } from '../services/api.jsx';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('price');
  const [sortOrder, setSortOrder] = useState('asc');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [error, setError] = useState(null);
  
  // Intersection observer for animation
  const { ref, inView } = useInView({
    triggerOnce: false,
    threshold: 0.1,
  });

  useEffect(() => {
    // Fetch products from API
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params = {
          query: searchTerm,
          sort_by: sortBy,
          page: 1,
          limit: 20
        };
        
        if (priceMin) params.price_min = parseFloat(priceMin);
        if (priceMax) params.price_max = parseFloat(priceMax);
        if (selectedBrands.length > 0) params.brands = selectedBrands;
        
        const data = await productApi.getProducts(params);
        setProducts(data);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchTerm, sortBy, priceMin, priceMax, selectedBrands]);

  // Sort products
  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'price') {
      return sortOrder === 'asc' ? a.min_price - b.min_price : b.min_price - a.min_price;
    } else if (sortBy === 'name') {
      return sortOrder === 'asc' 
        ? a.name.localeCompare(b.name) 
        : b.name.localeCompare(a.name);
    } else if (sortBy === 'rating') {
      // Assuming products have a rating property
      const aRating = a.sources.length > 0 ? a.sources.reduce((sum, source) => sum + (source.rating || 0), 0) / a.sources.length : 0;
      const bRating = b.sources.length > 0 ? b.sources.reduce((sum, source) => sum + (source.rating || 0), 0) / b.sources.length : 0;
      return sortOrder === 'asc' ? aRating - bRating : bRating - aRating;
    }
    return 0;
  });

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // The search is already handled by the useEffect dependency
  };

  return (
    <div className="fade-in">
      <div className="glass p-6 mb-8">
        <h1 className="text-3xl font-bold mb-2">So sánh giá điện thoại</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Tìm kiếm và so sánh giá điện thoại từ nhiều nhà bán lẻ khác nhau
        </p>
        
        {/* Search and filter */}
        <form onSubmit={handleSearch} className="mt-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Tìm kiếm điện thoại..."
                className="input w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select 
                className="input bg-white dark:bg-gray-800"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="price">Giá</option>
                <option value="name">Tên</option>
                <option value="rating">Đánh giá</option>
              </select>
              <button 
                type="button"
                className="btn btn-primary flex items-center"
                onClick={toggleSortOrder}
              >
                {sortOrder === 'asc' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
                {sortOrder === 'asc' ? 'Tăng dần' : 'Giảm dần'}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="price-min" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Giá tối thiểu (VND)
              </label>
              <input
                id="price-min"
                type="number"
                placeholder="Giá tối thiểu"
                className="input w-full"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="price-max" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Giá tối đa (VND)
              </label>
              <input
                id="price-max"
                type="number"
                placeholder="Giá tối đa"
                className="input w-full"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn btn-primary w-full">
                Tìm kiếm
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Error message */}
      {error && (
        <div className="glass p-4 mb-8 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200">
          <p>{error}</p>
        </div>
      )}

      {/* Product grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="glass p-6 h-96">
              <div className="skeleton h-48 w-full mb-4"></div>
              <div className="skeleton h-6 w-3/4 mb-2"></div>
              <div className="skeleton h-4 w-1/2 mb-4"></div>
              <div className="skeleton h-10 w-full"></div>
            </div>
          ))}
        </div>
      ) : (
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProducts.map((product, index) => (
            <div 
              key={product.id} 
              className={`product-card ${inView ? 'fade-in' : 'opacity-0'}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative mb-4 overflow-hidden rounded-lg">
                <img 
                  src={product.image_url && product.image_url.length > 0 ? product.image_url[0] : 'https://placehold.co/300x400/0ea5e9/FFFFFF?text=No+Image'} 
                  alt={product.name} 
                  className="w-full h-48 object-cover transition-transform duration-500 hover:scale-110"
                />
                <div className="absolute top-2 right-2 bg-white dark:bg-gray-800 rounded-full px-2 py-1 text-xs font-semibold">
                  {product.brand}
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2">{product.name}</h2>
              <div className="flex items-center mb-2">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => {
                    // Calculate average rating from sources
                    const avgRating = product.sources.length > 0 
                      ? product.sources.reduce((sum, source) => sum + (source.rating || 0), 0) / product.sources.length 
                      : 0;
                    
                    return (
                      <svg 
                        key={i} 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-4 w-4 ${i < Math.floor(avgRating) ? 'fill-current' : 'stroke-current fill-none'}`} 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    );
                  })}
                </div>
              </div>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-4">
                {product.min_price.toLocaleString()} - {product.max_price.toLocaleString()} VND
              </p>
              <div className="space-y-1 mb-4 text-sm text-gray-600 dark:text-gray-300">
                {product.specifications?.display && (
                  <p>• {product.specifications.display}</p>
                )}
                {product.specifications?.processor && (
                  <p>• {product.specifications.processor}</p>
                )}
                {product.specifications?.camera && (
                  <p>• {product.specifications.camera}</p>
                )}
                {product.specifications?.battery && (
                  <p>• {product.specifications.battery}</p>
                )}
              </div>
              <div className="flex space-x-2">
                <Link 
                  to={`/product/${product.id}`} 
                  className="btn btn-primary flex-1 text-center"
                >
                  Xem chi tiết
                </Link>
                <Link 
                  to="/compare" 
                  state={{ productIds: [product.id] }}
                  className="btn btn-secondary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && sortedProducts.length === 0 && !error && (
        <div className="glass p-12 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-bold mb-2">Không tìm thấy sản phẩm</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Hãy thử điều chỉnh tìm kiếm hoặc bộ lọc để tìm thấy sản phẩm phù hợp.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductList;
