from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from app.models.product import Product, ProductListRequest, ProductComparisonRequest
from app.services.rag_service import RAGService
from app.services.reflection_service import ReflectionService

router = APIRouter()
rag_service = RAGService()
reflection_service = ReflectionService()

@router.get("/", response_model=List[Product])
async def list_products(
    query: str = Query(None, description="Truy vấn tìm kiếm"),
    price_min: Optional[float] = Query(None, description="Giá tối thiểu"),
    price_max: Optional[float] = Query(None, description="Giá tối đa"),
    brands: Optional[List[str]] = Query(None, description="Thương hiệu"),
    sort_by: str = Query("relevance", description="Sắp xếp theo"),
    page: int = Query(1, description="Trang"),
    limit: int = Query(10, description="Số lượng mỗi trang")
):
    """
    API lấy danh sách sản phẩm theo các tiêu chí tìm kiếm.
    """
    request = ProductListRequest(
        query=query or "",
        price_min=price_min,
        price_max=price_max,
        brands=brands,
        sort_by=sort_by,
        page=page,
        limit=limit
    )
    
    # Sử dụng reflection để xác định nên lấy dữ liệu từ đâu
    reflection_result = await reflection_service.reflect_on_product_list(request)
    
    if reflection_result.action == "rag_query":
        # Lấy dữ liệu từ RAG
        products = await rag_service.get_products(
            query=request.query,
            price_min=request.price_min,
            price_max=request.price_max,
            brands=request.brands,
            sort_by=request.sort_by,
            page=request.page,
            limit=request.limit
        )
    elif reflection_result.action == "crawl":
        # Khởi tạo quá trình crawl để lấy dữ liệu mới
        products = await reflection_service.crawl_new_products(request)
    else:
        # Nếu không có action phù hợp
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm phù hợp")
    
    return products

@router.get("/{product_id}", response_model=Product)
async def get_product_detail(product_id: str):
    """
    API lấy chi tiết sản phẩm theo ID.
    """
    # Sử dụng reflection để xác định nên lấy dữ liệu từ đâu
    reflection_result = await reflection_service.reflect_on_product_detail(product_id)
    
    if reflection_result.action == "rag_query":
        # Lấy chi tiết sản phẩm từ RAG
        product = await rag_service.get_product_by_id(product_id)
    elif reflection_result.action == "crawl":
        # Crawl để lấy thông tin chi tiết sản phẩm
        product = await reflection_service.crawl_product_detail(product_id)
    else:
        # Nếu không có action phù hợp
        raise HTTPException(status_code=404, detail=f"Không tìm thấy sản phẩm với ID: {product_id}")
    
    return product

@router.post("/compare", response_model=List[Product])
async def compare_products(request: ProductComparisonRequest):
    """
    API so sánh các sản phẩm.
    """
    if not request.product_ids or len(request.product_ids) < 2:
        raise HTTPException(status_code=400, detail="Cần ít nhất 2 sản phẩm để so sánh")
    
    # Lấy thông tin chi tiết từng sản phẩm
    products = []
    for product_id in request.product_ids:
        try:
            product = await get_product_detail(product_id)
            products.append(product)
        except HTTPException:
            # Bỏ qua sản phẩm không tìm thấy
            continue
    
    if len(products) < 2:
        raise HTTPException(status_code=404, detail="Không đủ sản phẩm để so sánh")
    
    return products