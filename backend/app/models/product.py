from pydantic import BaseModel, Field, HttpUrl, validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
import re

class ProductSource(BaseModel):
    """Model cho nguồn sản phẩm."""
    name: str
    url: str  # Sử dụng str thay vì HttpUrl để linh hoạt hơn
    logo_url: Optional[str] = None
    price: float
    price_currency: str = "VND"
    last_updated: datetime = Field(default_factory=datetime.now)
    in_stock: bool = True
    
    @validator('url', 'logo_url', pre=True)
    def validate_url(cls, v):
        if v is None:
            return v
        


        if isinstance(v, str) and not v.startswith(('http://', 'https://')):
            return f"https://{v}" if v else v
        return v
    
    @validator('price', pre=True)
    def validate_price(cls, v):
        if isinstance(v, str):


            v = re.sub(r'[^\d.]', '', v)
            try:
                return float(v)
            except ValueError:
                return 0.0
        return float(v) if v is not None else 0.0

class ProductSpecification(BaseModel):
    """Model cho thông số kỹ thuật sản phẩm."""
    cpu: Optional[str] = None
    ram: Optional[str] = None
    storage: Optional[str] = None
    display: Optional[str] = None
    camera: Optional[str] = None
    battery: Optional[str] = None
    os: Optional[str] = None
    connectivity: Optional[List[str]] = None
    color: Optional[List[str]] = None
    dimensions: Optional[str] = None
    weight: Optional[str] = None
    additional_specs: Optional[Dict[str, Any]] = None
    
    @validator('connectivity', 'color', pre=True)
    def validate_list_fields(cls, v):
        if v is None:
            return []
        


        if isinstance(v, str):
            return [item.strip() for item in v.split(',')]
        


        if not isinstance(v, list):
            return [str(v)]
            
        return v
    
    @validator('additional_specs', pre=True)
    def validate_additional_specs(cls, v):
        if v is None:
            return {}
        return v

class Product(BaseModel):
    """Model chính cho sản phẩm."""
    id: Optional[str] = None
    name: str
    brand: str
    model: str
    description: Optional[str] = None
    image_url: Optional[List[str]] = None  # Sử dụng str thay vì HttpUrl
    category: str = "smartphone"
    specifications: Optional[ProductSpecification] = None
    sources: List[ProductSource]
    average_price: float = 0
    min_price: float = 0
    max_price: float = 0
    
    @validator('image_url', pre=True)
    def validate_image_url(cls, v):
        if v is None:
            return []
        
        if isinstance(v, str):
            return [v]
            
        if isinstance(v, list):
            return [str(url) if url is not None else "" for url in v]
            
        return []
    
    @validator('specifications', pre=True)
    def validate_specifications(cls, v):
        if v is None:
            return ProductSpecification()
        return v
    
    @validator('sources', pre=True)
    def validate_sources(cls, v):
        if not v:
            raise ValueError("Sản phẩm phải có ít nhất một nguồn")
        return v
    
    @validator('average_price', 'min_price', 'max_price', pre=True)
    def validate_prices(cls, v):
        if isinstance(v, str):
            v = re.sub(r'[^\d.]', '', v)
            try:
                return float(v)
            except ValueError:
                return 0.0
        return float(v) if v is not None else 0.0
    
    def calculate_prices(self):
        """Tính toán giá trung bình, thấp nhất và cao nhất."""
        if not self.sources:
            return
            
        prices = [source.price for source in self.sources]
        self.min_price = min(prices)
        self.max_price = max(prices)
        self.average_price = sum(prices) / len(prices)

class ProductListRequest(BaseModel):
    """Model cho yêu cầu danh sách sản phẩm."""
    query: str
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    brands: Optional[List[str]] = None
    sort_by: Optional[str] = "relevance"
    page: int = 1
    limit: int = 10
    
    @validator('price_min', 'price_max', pre=True)
    def validate_price_range(cls, v):
        if isinstance(v, str) and v.strip():
            try:
                return float(v)
            except ValueError:
                return None
        return v
    
    @validator('brands', pre=True)
    def validate_brands(cls, v):
        if v is None:
            return None
        
        if isinstance(v, str):
            return [v]
            
        return v

class ProductComparisonRequest(BaseModel):
    """Model cho yêu cầu so sánh sản phẩm."""
    product_ids: List[str]