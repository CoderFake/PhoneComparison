from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any, Optional, List
import uuid
import json
from datetime import datetime
from loguru import logger

from app.models.chat import ChatRequest, ChatResponse, ChatSession, ChatMessage, MessageRole, MessageType
from app.services.chat_service import ChatService
from app.services.reflection_service import ReflectionService
from app.services.rag_service import RAGService

router = APIRouter()
chat_service = ChatService()
reflection_service = ReflectionService()
rag_service = RAGService()

# In-memory storage for chat sessions
chat_sessions: Dict[str, ChatSession] = {}

@router.post("/send", response_model=ChatResponse)
async def send_message(request: ChatRequest = Body(...)):
    """
    API gửi tin nhắn chat và nhận phản hồi từ chatbot.
    """
    if not request.message or not request.message.strip():
        logger.warning("Empty message received")
        raise HTTPException(status_code=400, detail="Tin nhắn không được để trống")
        
    logger.info("Processing chat message: {}", 
             request.message[:50] + "..." if len(request.message) > 50 else request.message)
    
    # Kiểm tra hoặc tạo phiên chat mới
    session_id = request.session_id or str(uuid.uuid4())
    if session_id not in chat_sessions:
        logger.info("Creating new chat session: {}", session_id)
        chat_sessions[session_id] = ChatSession(id=session_id)
    
    session = chat_sessions[session_id]
    
    # Lưu tin nhắn của người dùng
    user_message = ChatMessage(
        role=MessageRole.USER,
        content=request.message,
        type=MessageType.TEXT,
        timestamp=datetime.now()
    )
    session.messages.append(user_message)
    session.updated_at = datetime.now()
    
    # Phân tích và reflection để xác định loại hành động
    logger.info("Applying reflection to determine action")
    reflection_result = await reflection_service.reflect_on_chat_message(
        message=request.message,
        chat_history=session.messages
    )
    
    logger.info("Reflection result: action={}, confidence={}", 
             reflection_result.action, reflection_result.confidence)
    
    response_data: Dict[str, Any] = {}
    message_type = MessageType.TEXT
    
    # Xử lý dựa trên kết quả reflection
    try:
        if reflection_result.action == "product_list":
            # Truy vấn danh sách sản phẩm
            logger.info("Action: product_list, query: {}", reflection_result.query)
            products = await rag_service.get_products(
                query=reflection_result.query,
                price_min=reflection_result.additional_info.get("price_min"),
                price_max=reflection_result.additional_info.get("price_max"),
                brands=reflection_result.additional_info.get("brands"),
                limit=10
            )
            
            # Nếu không tìm thấy trong RAG, thử crawl
            if not products:
                logger.info("No products found in RAG, trying crawl")
                request_params = {
                    "query": reflection_result.query,
                    "price_min": reflection_result.additional_info.get("price_min"),
                    "price_max": reflection_result.additional_info.get("price_max"),
                    "brands": reflection_result.additional_info.get("brands"),
                    "sort_by": "relevance",
                    "page": 1,
                    "limit": 10
                }
                from app.models.product import ProductListRequest
                products = await reflection_service.crawl_new_products(
                    ProductListRequest(**request_params)
                )
                
            response_data["products"] = products
            message_type = MessageType.PRODUCT_LIST
            
        elif reflection_result.action == "product_detail":
            # Lấy thông tin chi tiết sản phẩm
            logger.info("Action: product_detail")
            product_id = reflection_result.additional_info.get("product_id")
            product_name = reflection_result.additional_info.get("product_name")
            
            if not product_id and product_name:
                # Tìm kiếm sản phẩm dựa trên tên
                logger.info("No product ID provided, searching by name: {}", product_name)
                search_query = product_name
                products = await rag_service.get_products(query=search_query, limit=1)
                if products:
                    product_id = products[0].get("id")
            
            if not product_id:
                # Tìm kiếm sản phẩm dựa trên mô tả tổng quát
                logger.info("No product ID or name found, using general query: {}", reflection_result.query)
                search_query = reflection_result.query
                products = await rag_service.get_products(query=search_query, limit=1)
                if products:
                    product_id = products[0].get("id")
            
            if product_id:
                logger.info("Found product ID: {}, retrieving details", product_id)
                product = await rag_service.get_product_by_id(product_id)
                
                if not product:
                    # Thử crawl nếu không tìm thấy trong RAG
                    logger.info("Product not found in RAG, trying crawl")
                    product = await reflection_service.crawl_product_detail(product_id)
                
                if product:
                    response_data["product"] = product
                    message_type = MessageType.PRODUCT_DETAIL
                else:
                    logger.warning("Could not find product details for ID: {}", product_id)
            else:
                logger.warning("Could not identify a product from the request")
            
        elif reflection_result.action == "product_comparison":
            # So sánh sản phẩm
            logger.info("Action: product_comparison")
            product_ids = reflection_result.additional_info.get("product_ids", [])
            product_names = reflection_result.additional_info.get("product_names", [])
            
            products = []
            
            # Lấy sản phẩm theo ID (nếu có)
            if product_ids:
                logger.info("Retrieving products by IDs: {}", product_ids)
                for pid in product_ids:
                    try:
                        product = await rag_service.get_product_by_id(pid)
                        if product:
                            products.append(product)
                    except Exception as e:
                        logger.error("Error retrieving product {}: {}", pid, e)
                        continue
            
            # Tìm sản phẩm theo tên (nếu không có ID)
            if product_names and len(products) < 2:
                logger.info("Retrieving products by names: {}", product_names)
                for name in product_names:
                    found_products = await rag_service.get_products(query=name, limit=1)
                    if found_products:
                        # Kiểm tra trùng lặp
                        existing_ids = [p.get("id") for p in products]
                        if found_products[0].get("id") not in existing_ids:
                            products.append(found_products[0])
            
            # Tìm kiếm sản phẩm dựa trên tổng quát nếu chưa đủ
            if len(products) < 2 and reflection_result.query:
                logger.info("Not enough products found, searching by general query: {}", reflection_result.query)
                found_products = await rag_service.get_products(query=reflection_result.query, limit=5)
                
                # Thêm vào danh sách sản phẩm không trùng lặp
                existing_ids = [p.get("id") for p in products]
                for product in found_products:
                    if product.get("id") not in existing_ids:
                        products.append(product)
                        existing_ids.append(product.get("id"))
                        
                        # Dừng khi đủ 2-3 sản phẩm để so sánh
                        if len(products) >= 3:
                            break
            
            if len(products) >= 2:
                logger.info("Found {} products for comparison", len(products))
                response_data["products"] = products
                message_type = MessageType.PRODUCT_COMPARISON
            else:
                logger.warning("Not enough products found for comparison")
    
    except Exception as e:
        logger.error("Error processing reflection action: {}", e)
        # Tiếp tục xử lý để trả lời thông thường
    
    # Tạo phản hồi sử dụng Gemini
    logger.info("Generating assistant response using Gemini")
    assistant_response = await chat_service.generate_response(
        user_message=request.message,
        chat_history=session.messages,
        message_type=message_type,
        data=response_data
    )
    
    # Lưu phản hồi vào lịch sử chat
    assistant_message = ChatMessage(
        role=MessageRole.ASSISTANT,
        content=assistant_response,
        type=message_type,
        timestamp=datetime.now(),
        metadata=response_data
    )
    session.messages.append(assistant_message)
    session.updated_at = datetime.now()
    
    logger.info("Sending chat response with message type: {}", message_type)
    
    # Trả về phản hồi
    return ChatResponse(
        session_id=session_id,
        response=assistant_message,
        data=response_data
    )

@router.get("/history/{session_id}")
async def get_chat_history(session_id: str):
    """
    API lấy lịch sử chat.
    """
    if session_id not in chat_sessions:
        logger.warning("Chat session not found: {}", session_id)
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")
    
    logger.info("Retrieving chat history for session: {}", session_id)
    return chat_sessions[session_id]

@router.delete("/history/{session_id}")
async def delete_chat_session(session_id: str):
    """
    API xóa phiên chat.
    """
    if session_id not in chat_sessions:
        logger.warning("Chat session not found for deletion: {}", session_id)
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")
    
    logger.info("Deleting chat session: {}", session_id)
    del chat_sessions[session_id]
    
    return {"message": "Phiên chat đã được xóa thành công"}