from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime

class ProductSource(BaseModel):
    """Model cho nguồn sản phẩm."""
    name: str
    url: HttpUrl
    logo_url: Optional[HttpUrl] = None
    price: float
    price_currency: str = "VND"
    last_updated: datetime = Field(default_factory=datetime.now)
    in_stock: bool = True
    
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

class Product(BaseModel):
    """Model chính cho sản phẩm."""
    id: Optional[str] = None
    name: str
    brand: str
    model: str
    description: Optional[str] = None
    image_url: Optional[List[HttpUrl]] = None
    category: str = "smartphone"
    specifications: Optional[ProductSpecification] = None
    sources: List[ProductSource]
    average_price: float = 0
    min_price: float = 0
    max_price: float = 0
    
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

class ProductComparisonRequest(BaseModel):
    """Model cho yêu cầu so sánh sản phẩm."""
    product_ids: List[str]