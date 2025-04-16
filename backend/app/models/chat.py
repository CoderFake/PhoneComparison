from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class MessageRole(str, Enum):
    """Các vai trò trong cuộc trò chuyện."""
    USER = "user"
    SYSTEM = "system"
    ASSISTANT = "assistant"

class MessageType(str, Enum):
    """Các loại tin nhắn."""
    TEXT = "text"
    PRODUCT_LIST = "product_list"
    PRODUCT_DETAIL = "product_detail"
    PRODUCT_COMPARISON = "product_comparison"

class ChatMessage(BaseModel):
    """Model cho tin nhắn chat."""
    role: MessageRole
    content: str
    type: MessageType = MessageType.TEXT
    timestamp: datetime = Field(default_factory=datetime.now)
    metadata: Optional[Dict[str, Any]] = None

class ChatSession(BaseModel):
    """Model cho phiên chat."""
    id: str
    messages: List[ChatMessage] = []
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
class ChatRequest(BaseModel):
    """Model cho yêu cầu chat."""
    session_id: Optional[str] = None
    message: str

class ChatResponse(BaseModel):
    """Model cho phản hồi chat."""
    session_id: str
    response: ChatMessage
    data: Optional[Dict[str, Any]] = None
    
class ReflectionResult(BaseModel):
    """Model cho kết quả reflection."""
    action: str
    query: Optional[str] = None
    sources: Optional[List[str]] = None
    confidence: float = 0.0
    additional_info: Optional[Dict[str, Any]] = None