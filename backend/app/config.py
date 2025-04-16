import os
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseSettings, Field
from dotenv import load_dotenv
from functools import lru_cache

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Tải biến môi trường
load_dotenv()

class Settings(BaseSettings):
    """Cấu hình ứng dụng."""
    
    # API URLs
    SEARXNG_API_URL: str = os.getenv("SEARXNG_API_URL", "http://searxng:8080")
    CRAWL4AI_API_URL: str = os.getenv("CRAWL4AI_API_URL", "http://crawl4ai:8888")
    VECTOR_DB_URL: str = os.getenv("VECTOR_DB_URL", "http://vectordb:6333")
    
    # API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Application Settings
    APP_NAME: str = "Phone Price Comparison API"
    APP_VERSION: str = "1.2.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ["true", "1", "yes"]
    
    # Vector Database Configuration
    COLLECTION_NAME: str = "phone_products"
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "vinai/phobert-base")
    EMBEDDING_FALLBACK_MODELS: List[str] = ["vinai/phobert-base", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"]
    EMBEDDING_DIMENSION: int = 768
    VECTOR_DB_GRPC: bool = True
    
    # Caching Settings
    ENABLE_CACHE: bool = True
    CACHE_TTL: int = 3600  # 1 hour
    
    # Crawling Settings
    MAX_CRAWL_PAGES: int = int(os.getenv("MAX_CRAWL_PAGES", "20"))
    CRAWL_DEPTH: int = int(os.getenv("CRAWL_DEPTH", "2"))
    CRAWL_TIMEOUT: int = int(os.getenv("CRAWL_TIMEOUT", "30"))
    CRAWL_USER_AGENT: str = "Mozilla/5.0 (compatible; PhonePriceComparisonBot/1.0; +https://phonepricecomparison.vn)"
    
    # Search Settings
    SEARCH_LIMIT: int = int(os.getenv("SEARCH_LIMIT", "10"))
    SEARCH_LANGUAGE: str = "vi"
    SEARCH_REGION: str = "vn"
    SEARCH_ENGINES: List[str] = ["google", "bing", "duckduckgo"]
    
    # RAG Settings
    RAG_TOP_K: int = int(os.getenv("RAG_TOP_K", "5"))
    RAG_SIMILARITY_THRESHOLD: float = float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.6"))
    
    # LLM Settings
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-pro")
    LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.7"))
    LLM_MAX_TOKENS: int = int(os.getenv("LLM_MAX_TOKENS", "1024"))
    
    # Performance Settings
    WORKERS: int = int(os.getenv("WORKERS", "4"))
    MAX_CONNECTIONS: int = int(os.getenv("MAX_CONNECTIONS", "100"))
    
    # Security Settings
    CORS_ORIGINS: List[str] = os.getenv("CORS_ORIGINS", "*").split(",")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    """
    Trả về đối tượng settings, sử dụng caching để tối ưu hiệu suất.
    """
    logger.info("Loading settings...")
    return Settings()

settings = get_settings()