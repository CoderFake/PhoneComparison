import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { productApi } from '../services/api.jsx';

const ProductDetail = ({ isFromChat = false, productData = null }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(productData);
  const [loading, setLoading] = useState(!productData);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState('specs');
  
  const { ref: headerRef, inView: headerInView } = useInView({ triggerOnce: true });
  const { ref: imageRef, inView: imageInView } = useInView({ triggerOnce: true });
  const { ref: specsRef, inView: specsInView } = useInView({ triggerOnce: true });
  const { ref: pricesRef, inView: pricesInView } = useInView({ triggerOnce: true });

  useEffect(() => {
    // If product data is provided from chat, use it
    if (productData) {
      setProduct(productData);
      setLoading(false);
      return;
    }

    // Otherwise fetch from API
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await productApi.getProductById(id);
        setProduct(data);
      } catch (err) {
        console.error(`Error fetching product ${id}:`, err);
        setError('Không thể tải thông tin sản phẩm. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    } else if (!isFromChat) {
      setError('ID sản phẩm không hợp lệ');
    }
  }, [id, productData, isFromChat]);

  const handleCompare = () => {
    navigate('/compare', { state: { productIds: [product.id] } });
  };

  // Only show breadcrumb when not coming from chat
  const renderBreadcrumb = () => {
    if (isFromChat) return null;
    
    return (
      <div className="mb-6">
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400">
                Trang chủ
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-3 h-3 text-gray-400 mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                </svg>
                <span className="text-gray-500 dark:text-gray-400 ml-1 md:ml-2">{product?.name}</span>
              </div>
            </li>
          </ol>
        </nav>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fade-in">
        <div className="glass p-6 mb-8">
          <div className="skeleton h-8 w-1/2 mb-4"></div>
          <div className="skeleton h-4 w-3/4"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="glass p-6 h-96">
            <div className="skeleton h-full w-full"></div>
          </div>
          <div className="glass p-6">
            <div className="skeleton h-8 w-1/2 mb-4"></div>
            <div className="skeleton h-6 w-1/4 mb-4"></div>
            <div className="skeleton h-4 w-full mb-2"></div>
            <div className="skeleton h-4 w-full mb-2"></div>
            <div className="skeleton h-4 w-3/4 mb-6"></div>
            <div className="skeleton h-10 w-full mb-4"></div>
            <div className="skeleton h-10 w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass p-6 mb-8 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200">
        <p>{error}</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-4 btn btn-primary"
        >
          Quay lại trang chủ
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="glass p-12 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-xl font-bold mb-2">Không tìm thấy sản phẩm</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Sản phẩm bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.
        </p>
        <Link to="/" className="btn btn-primary">
          Quay lại trang chủ
        </Link>
      </div>
    );
  }

  const bestPrice = Math.min(...product.sources.map(source => source.price));
  const bestSource = product.sources.find(source => source.price === bestPrice);

  return (
    <div className="fade-in">
      {renderBreadcrumb()}

      {/* Header */}
      <div ref={headerRef} className={`glass p-6 mb-8 ${headerInView ? 'fade-in' : 'opacity-0'}`}>
        <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
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
                  className={`h-5 w-5 ${i < Math.floor(avgRating) ? 'fill-current' : 'stroke-current fill-none'}`} 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              );
            })}
            <span className="ml-2 text-gray-600 dark:text-gray-300">
              {product.sources.length > 0 
                ? (product.sources.reduce((sum, source) => sum + (source.rating || 0), 0) / product.sources.length).toFixed(1) 
                : 'N/A'} 
              ({product.sources.length} nguồn)
            </span>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-300">{product.description}</p>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Product images */}
        <div ref={imageRef} className={`glass p-6 ${imageInView ? 'fade-in' : 'opacity-0'}`}>
          <div className="mb-4 overflow-hidden rounded-lg">
            <img 
              src={product.image_url && product.image_url.length > activeImage ? product.image_url[activeImage] : 'https://placehold.co/600x400/0ea5e9/FFFFFF?text=No+Image'} 
              alt={product.name} 
              className="w-full h-80 object-cover"
            />
          </div>
          {product.image_url && product.image_url.length > 1 && (
            <div className="grid grid-cols-3 gap-2">
              {product.image_url.map((image, index) => (
                <button 
                  key={index} 
                  onClick={() => setActiveImage(index)}
                  className={`overflow-hidden rounded-lg border-2 ${activeImage === index ? 'border-primary-500' : 'border-transparent'}`}
                >
                  <img 
                    src={image} 
                    alt={`${product.name} view ${index + 1}`} 
                    className="w-full h-20 object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="glass p-6">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  {product.min_price.toLocaleString()} - {product.max_price.toLocaleString()} VND
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Giá tốt nhất từ {bestSource ? bestSource.name : 'N/A'}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                bestSource && bestSource.in_stock 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {bestSource && bestSource.in_stock ? 'Còn hàng' : 'Hết hàng'}
              </span>
            </div>
            <button 
              onClick={handleCompare}
              className="btn btn-gradient w-full mb-3 flex justify-center items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
              </svg>
              So sánh với điện thoại khác
            </button>
          </div>

          {product.specifications && product.specifications.color && product.specifications.color.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Màu sắc</h3>
              <div className="flex flex-wrap gap-2">
                {product.specifications.color.map((color, index) => (
                  <div key={index} className="flex items-center">
                    <div className={`w-6 h-6 rounded-full bg-gray-${(index + 3) * 100} mr-2`}></div>
                    <span className="text-sm">{color}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-2">Thông số chính</h3>
            <ul className="space-y-1 text-gray-600 dark:text-gray-300">
              {product.specifications?.display && (
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {product.specifications.display}
                </li>
              )}
              {product.specifications?.cpu && (
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {product.specifications.cpu}
                </li>
              )}
              {product.specifications?.camera && (
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {product.specifications.camera}
                </li>
              )}
              {product.specifications?.battery && (
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {product.specifications.battery}
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass p-6 mb-8">
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <ul className="flex flex-wrap -mb-px">
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('specs')}
                className={`inline-block py-4 px-4 text-sm font-medium border-b-2 rounded-t-lg ${
                  activeTab === 'specs'
                    ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400'
                    : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                }`}
              >
                Thông số kỹ thuật
              </button>
            </li>
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('prices')}
                className={`inline-block py-4 px-4 text-sm font-medium border-b-2 rounded-t-lg ${
                  activeTab === 'prices'
                    ? 'text-primary-600 border-primary-600 dark:text-primary-400 dark:border-primary-400'
                    : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                }`}
              >
                So sánh giá
              </button>
            </li>
          </ul>
        </div>

        {/* Specifications Tab */}
        {activeTab === 'specs' && (
          <div ref={specsRef} className={`${specsInView ? 'fade-in' : 'opacity-0'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Màn hình</h3>
                <p className="mb-4">{product.specifications?.display || 'Không có thông tin'}</p>
                
                <h3 className="text-lg font-semibold mb-4">Hiệu năng</h3>
                <p className="mb-4">{product.specifications?.cpu || 'Không có thông tin'}</p>
                
                <h3 className="text-lg font-semibold mb-4">Camera</h3>
                <p className="mb-4">{product.specifications?.camera || 'Không có thông tin'}</p>
                
                <h3 className="text-lg font-semibold mb-4">Pin</h3>
                <p>{product.specifications?.battery || 'Không có thông tin'}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Bộ nhớ</h3>
                <p className="mb-4">{product.specifications?.storage || 'Không có thông tin'}</p>
                
                <h3 className="text-lg font-semibold mb-4">Hệ điều hành</h3>
                <p className="mb-4">{product.specifications?.os || 'Không có thông tin'}</p>
                
                <h3 className="text-lg font-semibold mb-4">Kích thước</h3>
                <p className="mb-4">{product.specifications?.dimensions || 'Không có thông tin'}</p>
                
                <h3 className="text-lg font-semibold mb-4">Trọng lượng</h3>
                <p>{product.specifications?.weight || 'Không có thông tin'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Price Comparison Tab */}
        {activeTab === 'prices' && (
          <div ref={pricesRef} className={`${pricesInView ? 'fade-in' : 'opacity-0'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3">Nhà bán lẻ</th>
                    <th className="px-6 py-3">Giá</th>
                    <th className="px-6 py-3">Tình trạng</th>
                    <th className="px-6 py-3">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {product.sources.map((source, index) => (
                    <tr key={index} className="border-b dark:border-gray-700">
                      <td className="px-6 py-4 font-medium">
                        <div className="flex items-center">
                          {source.logo_url && (
                            <img 
                              src={source.logo_url} 
                              alt={source.name} 
                              className="w-8 h-8 object-contain mr-2"
                            />
                          )}
                          {source.name}
                        </div>
                      </td>
                      <td className={`px-6 py-4 ${source.price === bestPrice ? 'text-green-600 font-bold' : ''}`}>
                        {source.price.toLocaleString()} VND
                        {source.price === bestPrice && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded dark:bg-green-900 dark:text-green-200">
                            Giá tốt nhất
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${source.in_stock ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                          {source.in_stock ? 'Còn hàng' : 'Hết hàng'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-primary text-sm"
                        >
                          Mua ngay
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;