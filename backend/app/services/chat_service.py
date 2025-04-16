from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import re
import asyncio
import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential
from loguru import logger

from app.config import settings
from app.models.chat import ChatMessage, MessageType

class ChatService:
    """
    Service xử lý tương tác chat với người dùng.
    """
    
    def __init__(self):
        # Cấu hình Gemini
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel(
                settings.GEMINI_MODEL,
                generation_config={
                    "temperature": settings.LLM_TEMPERATURE,
                    "max_output_tokens": settings.LLM_MAX_TOKENS,
                    "top_p": 0.9,
                    "top_k": 40
                }
            )
            logger.info("Gemini model initialized: {}", settings.GEMINI_MODEL)
        except Exception as e:
            logger.error("Error initializing Gemini API: {}", e)
            raise

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate_response(
        self,
        user_message: str,
        chat_history: List[ChatMessage],
        message_type: MessageType,
        data: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Tạo phản hồi cho tin nhắn của người dùng dựa trên loại tin nhắn.
        """
        logger.info("Generating response for message type: {}", message_type)
        
        try:
            # Chuẩn bị prompt dựa trên loại tin nhắn
            if message_type == MessageType.PRODUCT_LIST:
                prompt = self._create_product_list_prompt(user_message, chat_history, data)
            elif message_type == MessageType.PRODUCT_DETAIL:
                prompt = self._create_product_detail_prompt(user_message, chat_history, data)
            elif message_type == MessageType.PRODUCT_COMPARISON:
                prompt = self._create_product_comparison_prompt(user_message, chat_history, data)
            else:
                prompt = self._create_default_prompt(user_message, chat_history)
            
            # Gọi Gemini API
            response = await self.model.generate_content_async(prompt)
            
            # Lấy text từ response
            response_text = ""
            for part in response.parts:
                if hasattr(part, 'text'):
                    response_text += part.text
            
            logger.info("Generated response successfully ({} characters)", len(response_text))
            return response_text
        except Exception as e:
            logger.error("Error generating response with Gemini: {}", e)
            return "Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này. Vui lòng thử lại sau."

    def _create_product_list_prompt(
        self,
        user_message: str,
        chat_history: List[ChatMessage],
        data: Dict[str, Any]
    ) -> str:
        """
        Tạo prompt cho danh sách sản phẩm.
        """
        products = data.get("products", [])
        products_info = self._format_products_info(products)
        
        prompt = f"""
        Bạn là trợ lý chatbot thông minh cho website so sánh giá điện thoại ở Việt Nam.
        Hãy trả lời ngắn gọn và đầy đủ thông tin cho yêu cầu của người dùng dưới đây.
        
        Lịch sử trò chuyện:
        {self._format_chat_history(chat_history[-6:] if len(chat_history) > 6 else chat_history)}
        
        Yêu cầu hiện tại của người dùng: "{user_message}"
        
        Danh sách sản phẩm:
        {products_info}
        
        Hãy trả lời để giới thiệu danh sách sản phẩm phù hợp với yêu cầu. 
        Chỉ trả lời một đoạn văn ngắn gọn, không quá 3-4 câu.
        Không liệt kê tất cả sản phẩm, chỉ nêu các sản phẩm nổi bật nhất (tối đa 3 sản phẩm).
        Nêu rõ khoảng giá (từ thấp nhất đến cao nhất) và các thương hiệu có trong kết quả.
        
        Nói với người dùng rằng họ có thể xem chi tiết danh sách sản phẩm ở trên màn hình.
        
        Trả lời bằng tiếng Việt, ngắn gọn và thân thiện.
        """
        
        return prompt
    
    def _create_product_detail_prompt(
        self,
        user_message: str,
        chat_history: List[ChatMessage],
        data: Dict[str, Any]
    ) -> str:
        """
        Tạo prompt cho chi tiết sản phẩm.
        """
        product = data.get("product", {})
        
        prompt = f"""
        Bạn là trợ lý chatbot thông minh cho website so sánh giá điện thoại ở Việt Nam.
        Hãy trả lời ngắn gọn và đầy đủ thông tin cho yêu cầu của người dùng dưới đây.
        
        Lịch sử trò chuyện:
        {self._format_chat_history(chat_history[-6:] if len(chat_history) > 6 else chat_history)}
        
        Yêu cầu hiện tại của người dùng: "{user_message}"
        
        Thông tin chi tiết sản phẩm:
        Tên: {product.get('name', '')}
        Thương hiệu: {product.get('brand', '')}
        Mô tả: {product.get('description', '')}
        Giá thấp nhất: {self._format_price(product.get('min_price', 0))} VND
        Giá cao nhất: {self._format_price(product.get('max_price', 0))} VND
        Thông số kỹ thuật: {self._format_specifications(product.get('specifications', {}))}
        
        Hãy tóm tắt thông tin sản phẩm một cách ngắn gọn (không quá 3-4 câu). 
        Tập trung vào các điểm mạnh và đặc điểm nổi bật.
        Nêu giá rõ ràng.
        Nói với người dùng rằng họ có thể xem chi tiết đầy đủ trên màn hình.
        
        Trả lời bằng tiếng Việt, ngắn gọn và thân thiện.
        """
        
        return prompt
    
    def _create_product_comparison_prompt(
        self,
        user_message: str,
        chat_history: List[ChatMessage],
        data: Dict[str, Any]
    ) -> str:
        """
        Tạo prompt cho so sánh sản phẩm.
        """
        products = data.get("products", [])
        
        # Tạo thông tin so sánh
        comparison = []
        for product in products:
            comparison.append(f"""
            Tên: {product.get('name', '')}
            Thương hiệu: {product.get('brand', '')}
            Giá thấp nhất: {self._format_price(product.get('min_price', 0))} VND
            Giá cao nhất: {self._format_price(product.get('max_price', 0))} VND
            Thông số kỹ thuật: {self._format_specifications(product.get('specifications', {}))}
            """)
        
        comparison_text = "\n---\n".join(comparison)
        
        prompt = f"""
        Bạn là trợ lý chatbot thông minh cho website so sánh giá điện thoại ở Việt Nam.
        Hãy trả lời ngắn gọn và đầy đủ thông tin cho yêu cầu của người dùng dưới đây.
        
        Lịch sử trò chuyện:
        {self._format_chat_history(chat_history[-6:] if len(chat_history) > 6 else chat_history)}
        
        Yêu cầu hiện tại của người dùng: "{user_message}"
        
        Thông tin các sản phẩm so sánh:
        {comparison_text}
        
        Hãy so sánh các sản phẩm một cách khách quan. 
        Nêu ra điểm mạnh, điểm yếu của mỗi sản phẩm và những điểm khác biệt chính.
        Trình bày ngắn gọn không quá 5-6 câu.
        Đề xuất nên chọn sản phẩm nào dựa trên giá-hiệu năng và nhu cầu phổ biến.
        Nói với người dùng rằng họ có thể xem bảng so sánh chi tiết trên màn hình.
        
        Trả lời bằng tiếng Việt, ngắn gọn và thân thiện.
        """
        
        return prompt
    
    def _create_default_prompt(
        self,
        user_message: str,
        chat_history: List[ChatMessage]
    ) -> str:
        """
        Tạo prompt mặc định cho các tin nhắn thông thường.
        """
        prompt = f"""
        Bạn là trợ lý chatbot thông minh cho website so sánh giá điện thoại ở Việt Nam.
        Hãy trả lời ngắn gọn và đầy đủ thông tin cho yêu cầu của người dùng dưới đây.
        
        Lịch sử trò chuyện:
        {self._format_chat_history(chat_history[-6:] if len(chat_history) > 6 else chat_history)}
        
        Yêu cầu hiện tại của người dùng: "{user_message}"
        
        Hãy trả lời câu hỏi hoặc yêu cầu của người dùng.
        Nếu họ đang tìm kiếm thông tin về sản phẩm, giới thiệu họ có thể tìm kiếm điện thoại bằng cách hỏi về:
        1. Tên model cụ thể (ví dụ: "iPhone 15 Pro")
        2. Thương hiệu (ví dụ: "Điện thoại Samsung")
        3. Khoảng giá (ví dụ: "Điện thoại dưới 8 triệu")
        4. Nhu cầu sử dụng (ví dụ: "Điện thoại chơi game tốt")
        
        Trả lời bằng tiếng Việt, ngắn gọn và thân thiện.
        Giữ câu trả lời không quá 3-4 câu.
        """
        
        return prompt
    
    def _format_chat_history(self, history: List[ChatMessage]) -> str:
        """
        Format lịch sử chat thành văn bản dễ đọc.
        """
        formatted = []
        for msg in history:
            role = "Người dùng" if msg.role == "user" else "Trợ lý"
            formatted.append(f"{role}: {msg.content}")
        return "\n".join(formatted)
    
    def _format_products_info(self, products: List[Dict[str, Any]]) -> str:
        """
        Format thông tin danh sách sản phẩm.
        """
        if not products:
            return "Không tìm thấy sản phẩm phù hợp."
            
        formatted = []
        for i, product in enumerate(products, start=1):
            if i > 10:  # Giới hạn số lượng sản phẩm để tránh prompt quá dài
                formatted.append(f"... và {len(products) - 10} sản phẩm khác")
                break
                
            formatted.append(f"""
            {i}. Tên: {product.get('name', '')}
            Thương hiệu: {product.get('brand', '')}
            Giá: {self._format_price(product.get('min_price', 0))} - {self._format_price(product.get('max_price', 0))} VND
            """)
            
        return "\n".join(formatted)
    
    def _format_specifications(self, specs: Dict[str, Any]) -> str:
        """
        Format thông số kỹ thuật sản phẩm.
        """
        if not specs:
            return "Chưa có thông tin chi tiết."
            
        formatted = []
        for key, value in specs.items():
            if value and not key.startswith("additional_"):
                formatted.append(f"{key}: {value}")
                
        return ", ".join(formatted)
    
    def _format_price(self, price: float) -> str:
        """
        Format giá tiền.
        """
        # Chia số thành nhóm 3 chữ số từ phải sang trái
        price_str = str(int(price))
        parts = []
        
        while price_str:
            parts.append(price_str[-3:])
            price_str = price_str[:-3]
            
        # Đảo ngược lại và ghép với dấu chấm
        return ".".join(reversed(parts))