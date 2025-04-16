import api from './api.jsx';

// Service xử lý tương tác với API chat
export const chatService = {
  // Gửi tin nhắn đến chatbot
  sendMessage: async (sessionId, message) => {
    try {
      const response = await api.post('/chat/send', {
        session_id: sessionId,
        message: message
      });
      return response.data;
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  },
  
  // Lấy lịch sử chat
  getChatHistory: async (sessionId) => {
    try {
      const response = await api.get(`/chat/history/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching chat history:', error);
      throw error;
    }
  }
};

export default chatService;
