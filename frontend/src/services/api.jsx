import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

const handleApiError = (error, defaultErrorMessage = 'Đã xảy ra lỗi khi kết nối với máy chủ') => {
  if (error.response) {
    console.error('API Error Response:', error.response);
    
    if (error.response.data && error.response.data.detail) {
      return {
        error: true,
        status: error.response.status,
        message: error.response.data.detail
      };
    }
    
    const statusMessages = {
      400: 'Yêu cầu không hợp lệ',
      401: 'Bạn cần đăng nhập để thực hiện hành động này',
      403: 'Bạn không có quyền thực hiện hành động này',
      404: 'Không tìm thấy tài nguyên yêu cầu',
      422: 'Dữ liệu không hợp lệ',
      500: 'Lỗi máy chủ, vui lòng thử lại sau'
    };
    
    return {
      error: true,
      status: error.response.status,
      message: statusMessages[error.response.status] || defaultErrorMessage
    };
  } else if (error.request) {
    console.error('API Error Request:', error.request);
    return {
      error: true,
      message: 'Không nhận được phản hồi từ máy chủ, vui lòng kiểm tra kết nối mạng'
    };
  } else {
    console.error('API Error Setup:', error.message);
    return {
      error: true,
      message: error.message || defaultErrorMessage
    };
  }
};

api.interceptors.response.use(
  response => response,
  error => {
    const errorData = handleApiError(error);
    return Promise.reject(errorData);
  }
);

export const productApi = {
  getProducts: async (params = {}) => {
    try {
      const response = await api.get('/products', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },
  
  getProductById: async (productId) => {
    try {
      const response = await api.get(`/products/${productId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching product ${productId}:`, error);
      throw error;
    }
  },
  
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

export const chatService = {
  sendMessage: async (sessionId, message) => {
    try {
      const response = await api.post('/chat/send', {
        session_id: sessionId,
        message: message
      });
      return response.data;
    } catch (error) {
      console.error('Error sending chat message:', error);
      return {
        error: true,
        session_id: sessionId,
        response: {
          role: 'assistant',
          content: error.message || 'Có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại sau.',
          type: 'text',
          timestamp: new Date().toISOString()
        }
      };
    }
  },
  
  getChatHistory: async (sessionId) => {
    try {
      const response = await api.get(`/chat/history/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching chat history:', error);
      throw error;
    }
  },
  
  deleteSession: async (sessionId) => {
    try {
      const response = await api.delete(`/chat/history/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting chat session:', error);
      throw error;
    }
  }
};

export default api;