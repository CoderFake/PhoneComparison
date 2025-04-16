import axios from 'axios';

// Cấu hình axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor xử lý lỗi
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response || error);
    return Promise.reject(error);
  }
);

// API liên quan đến sản phẩm
export const productApi = {
  // Lấy danh sách sản phẩm
  getProducts: async (params = {}) => {
    try {
      const response = await api.get('/products', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },
  
  // Lấy chi tiết sản phẩm
  getProductById: async (productId) => {
    try {
      const response = await api.get(`/products/${productId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching product ${productId}:`, error);
      throw error;
    }
  },
  
  // So sánh sản phẩm
  compareProducts: async (productIds) => {
    try {
      const response = await api.post('/products/compare', { product_ids: productIds });
      return response.data;
    } catch (error) {
      console.error('Error comparing products:', error);
      throw error;
    }
  }
};

export default api;