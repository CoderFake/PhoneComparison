import httpx
import json
import re
import uuid
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
from bs4 import BeautifulSoup
import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential
from loguru import logger
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from app.config import settings
from app.models.chat import ChatMessage, ReflectionResult
from app.models.product import Product, ProductListRequest, ProductSource, ProductSpecification
from app.utils.helpers import (
    extract_domain, clean_text, extract_price, 
    normalize_brand_name
)
from pydantic import  ValidationError


class ReflectionService:
    """
    Service xử lý reflection để quyết định nên truy vấn RAG hay crawl dữ liệu mới.
    """
    
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL, 
                                         generation_config={
                                             "temperature": settings.LLM_TEMPERATURE,
                                             "max_output_tokens": settings.LLM_MAX_TOKENS,
                                         })
        
        self.client = httpx.AsyncClient(timeout=settings.CRAWL_TIMEOUT)
        
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        
        logger.info("ReflectionService initialized with model: {}", settings.GEMINI_MODEL)
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def reflect_on_chat_message(
        self, 
        message: str, 
        chat_history: List[ChatMessage]
    ) -> ReflectionResult:
        """
        Phân tích tin nhắn chat để xác định hành động tiếp theo.
        """
        logger.info("Reflecting on chat message: {}", message[:50] + "..." if len(message) > 50 else message)
        
        prompt = f"""
        Hãy phân tích tin nhắn này từ người dùng và lịch sử chat để xác định hành động tiếp theo.
        
        Tin nhắn: {message}
        
        Lịch sử chat (3 tin nhắn gần nhất):
        {self._format_chat_history(chat_history[-6:] if len(chat_history) > 6 else chat_history)}
        
        Hãy phân loại tin nhắn này vào một trong các hành động sau:
        1. product_list: Người dùng đang tìm kiếm danh sách sản phẩm
        2. product_detail: Người dùng đang yêu cầu thông tin chi tiết về một sản phẩm cụ thể
        3. product_comparison: Người dùng muốn so sánh các sản phẩm
        4. answer: Trả lời câu hỏi thông thường
        
        Trả về kết quả dưới dạng JSON theo định dạng sau:
        ```json
        {{
            "action": "action_name", 
            "query": "truy vấn tìm kiếm", 
            "confidence": 0.9,
            "additional_info": {{
                "key1": "value1",
                "key2": "value2"
            }}
        }}
        ```
        
        Đối với product_list, additional_info nên bao gồm:
        - price_min (nếu có): giá tối thiểu
        - price_max (nếu có): giá tối đa
        - brands (nếu có): danh sách thương hiệu
        
        Đối với product_detail, additional_info nên bao gồm:
        - product_id (nếu có): ID sản phẩm
        - product_name (nếu có): tên sản phẩm
        
        Đối với product_comparison, additional_info nên bao gồm:
        - product_ids (nếu có): danh sách ID sản phẩm
        - product_names (nếu có): danh sách tên sản phẩm
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            
            json_match = re.search(r'```json\s+(.*?)\s+```', response.text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_str = response.text
                
            try:
                result = json.loads(json_str)
                return ReflectionResult(
                    action=result.get("action", "answer"),
                    query=result.get("query", message),
                    confidence=result.get("confidence", 0.0),
                    additional_info=result.get("additional_info", {})
                )
            except json.JSONDecodeError as e:
                logger.error("Error decoding JSON from Gemini response: {}", e)
                return ReflectionResult(
                    action="answer",
                    query=message,
                    confidence=0.5
                )
        except Exception as e:
            logger.error("Error calling Gemini API: {}", e)
            return ReflectionResult(
                action="answer",
                query=message,
                confidence=0.5
            )
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def reflect_on_product_list(self, request: ProductListRequest) -> ReflectionResult:
        """
        Quyết định nên lấy dữ liệu sản phẩm từ RAG hay crawl mới.
        """
        logger.info("Reflecting on product list request: {}", request.query)
        
        prompt = f"""
        Xác định xem nên truy vấn dữ liệu từ cơ sở dữ liệu RAG hiện có hay nên crawl dữ liệu mới.
        
        Yêu cầu tìm kiếm:
        - Query: {request.query}
        - Giá tối thiểu: {request.price_min if request.price_min else "Không có"}
        - Giá tối đa: {request.price_max if request.price_max else "Không có"}
        - Thương hiệu: {", ".join(request.brands) if request.brands else "Không có"}
        - Sắp xếp theo: {request.sort_by}
        
        Hãy quyết định:
        1. "rag_query": Sử dụng dữ liệu từ cơ sở dữ liệu RAG hiện có
        2. "crawl": Crawl dữ liệu mới từ web
        
        Trả về kết quả JSON với decision, explanation và confidence.
        ```json
        {{
            "decision": "rag_query",
            "explanation": "Lý do quyết định",
            "confidence": 0.8
        }}
        ```
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            
            try:
                json_match = re.search(r'```json\s+(.*?)\s+```', response.text, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group(1))
                else:
                    result = json.loads(response.text)
                
                action = result.get("decision", "rag_query")
                explanation = result.get("explanation", "")
                confidence = result.get("confidence", 0.8)
                
                logger.info("Reflection decision: {} with confidence {}", action, confidence)
                
                return ReflectionResult(
                    action=action,
                    query=request.query,
                    confidence=confidence,
                    additional_info={
                        "explanation": explanation,
                        "price_min": request.price_min,
                        "price_max": request.price_max,
                        "brands": request.brands
                    }
                )
            except (json.JSONDecodeError, AttributeError) as e:
                logger.error("Error processing Gemini response: {}", e)
                return ReflectionResult(
                    action="rag_query",
                    query=request.query,
                    confidence=0.7,
                    additional_info={
                        "price_min": request.price_min,
                        "price_max": request.price_max,
                        "brands": request.brands
                    }
                )
        except Exception as e:
            logger.error("Error calling Gemini API: {}", e)
            return ReflectionResult(
                action="rag_query",
                query=request.query,
                confidence=0.7,
                additional_info={
                    "price_min": request.price_min,
                    "price_max": request.price_max,
                    "brands": request.brands
                }
            )
    async def reflect_on_product_detail(self, product_id: str) -> ReflectionResult:
        """
        Quyết định nên lấy chi tiết sản phẩm từ RAG hay crawl mới.
        """
        logger.info("Reflecting on product detail: {}", product_id)
        return ReflectionResult(
            action="rag_query",
            query=f"product:{product_id}",
            confidence=0.9,
            additional_info={
                "product_id": product_id
            }
        )
    
    async def crawl_new_products(self, request: ProductListRequest) -> List[Dict[str, Any]]:
        """
        Crawl dữ liệu sản phẩm mới từ web và lưu vào RAG.
        """
        logger.info("Crawling new products for query: {}", request.query)
        
        search_terms = request.query
        if request.brands:
            search_terms += f" {' '.join(request.brands)}"
            
        search_results = await self._search_urls(search_terms)
        
        if not search_results:
            logger.warning("No search results found for: {}", search_terms)
            return []
            
        logger.info("Found {} URLs from search", len(search_results))
        
        from app.services.rag_service import RAGService
        rag_service = RAGService()
        
        product_jsons = []
        
        for url in search_results:
            try:
                html_content = await self._crawl_html(url)
                
                if not html_content:
                    logger.warning("No HTML content from URL: {}", url)
                    continue
                
                document = Document(
                    page_content=html_content,
                    metadata={
                        "source": url,
                        "date": datetime.now().isoformat(),
                        "domain": extract_domain(url),
                        "query": request.query
                    }
                )
                
                chunks = self.text_splitter.split_documents([document])
                
                products_from_url = await self._extract_products_with_llm(html_content, url, request.query)
                
                if products_from_url:
                    for chunk in chunks:
                        chunk.metadata["product_data"] = products_from_url
                    
                    await rag_service.add_documents_to_rag(chunks)
                    product_jsons.extend(products_from_url)
                
            except Exception as e:
                logger.error("Error processing URL {}: {}", url, e)
        
        filtered_products = self._filter_products(product_jsons, request)
        sorted_products = self._sort_products(filtered_products, request.sort_by)
        
        limit = request.limit or 10
        page = request.page or 1
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        
        logger.info("Returning {} products from {} crawled", 
                min(len(sorted_products), limit), len(product_jsons))
        
        return sorted_products[start_idx:end_idx]

    async def _extract_products_with_llm(self, html_content: str, url: str, query: str) -> List[Dict[str, Any]]:
        """
        Sử dụng LLM để trích xuất thông tin sản phẩm từ HTML.
        """
        logger.info("Extracting products from HTML using LLM for URL: {}", url)
        
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            for tag in soup(['script', 'style', 'header', 'footer', 'nav']):
                tag.decompose()
            
            text_content = soup.get_text(separator=' ', strip=True)
            
            text_content = text_content[:10000] 
            
            prompt = f"""
            Dưới đây là nội dung HTML từ một trang web thương mại điện tử về điện thoại. 
            Hãy trích xuất thông tin về các sản phẩm điện thoại từ nội dung này.
            
            URL: {url}
            Query tìm kiếm: {query}
            
            Nội dung:
            {text_content}
            
            Hãy trích xuất thông tin các sản phẩm điện thoại và trả về dưới dạng JSON theo schema:
            ```json
            [
            {{
                "id": "UUID_ngẫu_nhiên",
                "name": "Tên sản phẩm",
                "brand": "Thương hiệu",
                "model": "Model",
                "min_price": giá_thấp_nhất (số, không có dấu phẩy),
                "max_price": giá_cao_nhất (số, không có dấu phẩy),
                "average_price": giá_trung_bình (số, không có dấu phẩy),
                "image_url": ["url_hình_ảnh"],
                "specifications": {{
                "cpu": "Thông tin CPU nếu có",
                "ram": "Thông tin RAM nếu có",
                "storage": "Bộ nhớ trong nếu có",
                "display": "Thông tin màn hình nếu có",
                "camera": "Thông tin camera nếu có",
                "battery": "Thông tin pin nếu có",
                "os": "Hệ điều hành nếu có"
                }},
                "sources": [
                {{
                    "name": "Tên trang web",
                    "url": "URL trang sản phẩm",
                    "price": giá (số, không có dấu phẩy),
                    "price_currency": "VND",
                    "last_updated": "ISO datetime hiện tại",
                    "in_stock": true
                }}
                ]
            }}
            ]
            ```
            
            Chỉ trả về đúng JSON theo schema, không có nội dung khác. Chỉ trích xuất các sản phẩm điện thoại thực sự, không tạo thông tin giả.
            """
            
            response = await self.model.generate_content_async(prompt)
            
            json_pattern = r'\[\s*\{.*\}\s*\]'
            json_matches = re.search(json_pattern, response.text, re.DOTALL)
            
            if not json_matches:
                json_pattern = r'\{.*\}'
                json_matches = re.search(json_pattern, response.text, re.DOTALL)
            
            if json_matches:
                json_str = json_matches.group(0)
                products = json.loads(json_str)
                
                if isinstance(products, dict):
                    products = [products]
                    
                logger.info("Extracted {} products with LLM from URL: {}", len(products), url)
                
                normalized_products = []
                for product in products:
                    if "id" not in product or not product["id"]:
                        product["id"] = str(uuid.uuid4())
                    
                    if "brand" in product and product["brand"]:
                        product["brand"] = normalize_brand_name(product["brand"])
                    
                    for price_field in ["min_price", "max_price", "average_price"]:
                        if price_field in product:
                            if isinstance(product[price_field], str):
                                product[price_field] = float(re.sub(r'[^\d.]', '', product[price_field]) or 0)
                            elif product[price_field] is None:
                                product[price_field] = 0.0
                    
                    if "specifications" not in product or not product["specifications"]:
                        product["specifications"] = {
                            "cpu": None,
                            "ram": None,
                            "storage": None,
                            "display": None,
                            "camera": None,
                            "battery": None,
                            "os": None,
                            "connectivity": [],
                            "color": [],
                            "dimensions": None,
                            "weight": None,
                            "additional_specs": {}
                        }
                    
                    # Đảm bảo sources có URL hợp lệ
                    if "sources" in product and product["sources"]:
                        for source in product["sources"]:
                            if "url" in source and source["url"] and not source["url"].startswith(('http://', 'https://')):
                                domain = extract_domain(url)
                                source["url"] = f"https://{domain}{source['url'] if source['url'].startswith('/') else '/' + source['url']}"
                            
                            if "price" in source:
                                if isinstance(source["price"], str):
                                    source["price"] = float(re.sub(r'[^\d.]', '', source["price"]) or 0)
                                elif source["price"] is None:
                                    source["price"] = 0.0
                            
                            if "last_updated" not in source or not source["last_updated"]:
                                source["last_updated"] = datetime.now().isoformat()
                    
                    if "image_url" not in product or not product["image_url"]:
                        product["image_url"] = []
                    elif isinstance(product["image_url"], str):
                        product["image_url"] = [product["image_url"]]
                    
                    try:
                        from app.models.product import Product as ProductModel
                        validated_product = ProductModel(**product)
                        normalized_products.append(product)
                    except Exception as e:
                        logger.error("Product validation error: {}", e)
                
                return normalized_products
                
            return []
        except Exception as e:
            logger.error("Error extracting products with LLM: {}", e)
            return []
    
    async def crawl_product_detail(self, product_id: str) -> Optional[Dict[str, Any]]:
        """
        Crawl thông tin chi tiết sản phẩm từ web và lưu vào RAG.
        """
        logger.info("Crawling product detail for ID: {}", product_id)
        
        search_results = await self._search_urls(f"điện thoại {product_id}")
        
        if not search_results:
            logger.warning("No URLs found for product ID: {}", product_id)
            return None
        
        from app.services.rag_service import RAGService
        rag_service = RAGService()
        
        url = search_results[0]
        
        try:
            html_content = await self._crawl_html(url)
            
            if not html_content:
                logger.warning("No HTML content from URL: {}", url)
                return None
            
            documents = await self._process_html_with_structure_loader(html_content, url)
            
            if not documents:
                logger.warning("No documents extracted from HTML for URL: {}", url)
                return None
            
            product_data = await self._extract_product_detail_from_html(html_content, url)
            
            if not product_data:
                logger.warning("Failed to extract product data from HTML for URL: {}", url)
                return None
            
            for doc in documents:
                doc.metadata["product_data"] = product_data
            
            await rag_service.add_documents_to_rag(documents)
            
            return product_data
        except Exception as e:
            logger.error("Error crawling product detail from {}: {}", url, e)
            return None
    
    async def _search_urls(self, query: str) -> List[str]:
        """
        Sử dụng SearXNG để tìm kiếm các URL.
        """
        logger.info("Searching URLs with SearXNG for: {}", query)
        
        # Thêm từ khóa tìm kiếm chuyên biệt cho điện thoại
        enhanced_query = f"{query} điện thoại site:thegioididong.com OR site:fptshop.com.vn OR site:cellphones.com.vn OR site:hoanghamobile.com"
        
        search_url = f"{settings.SEARXNG_API_URL}/search"
        params = {
            "q": enhanced_query,
            "format": "json",
            "language": settings.SEARCH_LANGUAGE,
            "region": settings.SEARCH_REGION,
            "category_general": 1,
            "time_range": "",
            "engines": ",".join(settings.SEARCH_ENGINES),
            "limit": settings.SEARCH_LIMIT * 2  # Tăng giới hạn để có nhiều kết quả hơn
        }
        
        try:
            response = await self.client.get(search_url, params=params, timeout=20)
            response.raise_for_status()
            
            data = response.json()
            
            if not isinstance(data, dict) or "results" not in data:
                logger.error("Invalid response format from SearXNG: {}", data)
                return self._get_fallback_urls(query)
            
            results = data.get("results", [])
            if not results:
                logger.warning("No results from SearXNG, using fallback URLs")
                return self._get_fallback_urls(query)
            
            urls = []
            for result in results:
                if "url" in result:
                    url = result["url"]
                    domain = extract_domain(url)
                    if self._is_valid_ecommerce_domain(domain):
                        urls.append(url)
            
            unique_urls = list(dict.fromkeys(urls))[:settings.MAX_CRAWL_PAGES]
            
            # Nếu không tìm thấy URL hợp lệ, sử dụng URL dự phòng
            if not unique_urls:
                logger.warning("No valid e-commerce URLs found, using fallback URLs")
                return self._get_fallback_urls(query)
            
            logger.info("Found {} unique URLs from SearXNG", len(unique_urls))
            return unique_urls
        except Exception as e:
            logger.error("Error searching URLs with SearXNG: {}", e)
            return self._get_fallback_urls(query)

    def _get_fallback_urls(self, query: str) -> List[str]:
        """
        Cung cấp URL dự phòng khi không thể tìm thấy URL từ SearXNG.
        """
        query_encoded = query.replace(" ", "+")
        
        # Check for brands in query
        brands = {
            "xiaomi": ["xiaomi", "redmi", "poco"],
            "samsung": ["samsung", "galaxy"],
            "apple": ["apple", "iphone"],
            "oppo": ["oppo"],
            "vivo": ["vivo"],
            "realme": ["realme"],
            "nokia": ["nokia"],
            "huawei": ["huawei"],
            "honor": ["honor"]
        }
        
        detected_brand = None
        for brand, keywords in brands.items():
            if any(keyword in query.lower() for keyword in keywords):
                detected_brand = brand
                break
        
        fallback_urls = [
            f"https://www.thegioididong.com/tim-kiem?q={query_encoded}",
            f"https://fptshop.com.vn/tim-kiem/{query_encoded}",
            f"https://cellphones.com.vn/catalogsearch/result/?q={query_encoded}",
            f"https://hoanghamobile.com/tim-kiem?kwd={query_encoded}"
        ]
        
        # Thêm URL danh mục nếu phát hiện thương hiệu
        if detected_brand:
            brand_urls = [
                f"https://www.thegioididong.com/dtdd-{detected_brand}",
                f"https://fptshop.com.vn/dien-thoai/{detected_brand}",
                f"https://cellphones.com.vn/mobile/{detected_brand}.html",
                f"https://hoanghamobile.com/dien-thoai-di-dong/{detected_brand}"
            ]
            fallback_urls = brand_urls + fallback_urls
        
        # Thêm URL danh mục chung nếu không có thương hiệu cụ thể
        else:
            category_urls = [
                "https://www.thegioididong.com/dtdd",
                "https://fptshop.com.vn/dien-thoai",
                "https://cellphones.com.vn/mobile.html",
                "https://hoanghamobile.com/dien-thoai-di-dong"
            ]
            fallback_urls.extend(category_urls)
        
        logger.info("Using {} fallback URLs", len(fallback_urls))
        return fallback_urls[:settings.MAX_CRAWL_PAGES]
        
    def _is_valid_ecommerce_domain(self, domain: str) -> bool:
        """
        Kiểm tra domain có phải là trang thương mại điện tử Việt Nam không.
        """
        valid_domains = [
            "thegioididong.com", "fptshop.com.vn", "cellphones.com.vn", 
            "tiki.vn", "lazada.vn", "shopee.vn", "viettelstore.vn",
            "hoanghamobile.com", "nguyenkim.com", "sendo.vn", 
            "dienmayxanh.com", "bachlong.vn", "hangchinhhieu.vn",
            "vienthongA.vn", "phongvu.vn", "anphatpc.com.vn",
            "hacom.vn", "didongviet.vn", "hnam.com.vn"
        ]
        
        return any(domain.endswith(valid_domain) for valid_domain in valid_domains)
    
    async def _crawl_html(self, url: str) -> Optional[str]:
        """
        Lấy HTML từ URL - sử dụng cả crawl4ai và httpx trực tiếp như fallback.
        """
        logger.info("Crawling HTML from URL: {}", url)
        
        # Phương pháp 1: Thử sử dụng crawl4ai trước
        try:
            crawl_url = f"{settings.CRAWL4AI_API_URL}/crawl"
            
            # Tạo các user agent phổ biến
            user_agents = [
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:113.0) Gecko/20100101 Firefox/113.0",
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
            ]
            
            # Chọn ngẫu nhiên một user agent
            import random
            user_agent = random.choice(user_agents)
            
            # Headers phổ biến
            headers = {
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
                "Cache-Control": "max-age=0",
                "Connection": "keep-alive",
                "Sec-Ch-Ua": '"Chromium";v="125", "Google Chrome";v="125"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"Windows"',
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                "Upgrade-Insecure-Requests": "1"
            }
            
            payload = {
                "urls": [url],
                "depth": 0,
                "respect_robots_txt": False,
                "user_agent": user_agent,
                "headers": headers,
                "extract_html": True,
                "extract": {},
                "timeout": 30,
                "retry": 3
            }
            
            response = await self.client.post(crawl_url, json=payload, timeout=40)
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, dict) and "results" in data:
                    crawled_data = data.get("results", {})
                    
                    if crawled_data and url in crawled_data:
                        html_content = crawled_data[url].get("html", "")
                        
                        if html_content:
                            logger.info("Successfully got HTML from crawl4ai for URL: {}", url)
                            return html_content
        
            logger.warning("Failed to get HTML with crawl4ai, trying direct httpx as fallback")
        except Exception as e:
            logger.error("Error using crawl4ai: {}", e)
            logger.warning("Trying direct httpx as fallback")
        
        # Phương pháp 2: Sử dụng httpx trực tiếp
        try:
            headers = {
                "User-Agent": random.choice(user_agents),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
                "Cache-Control": "max-age=0",
                "Referer": "https://www.google.com/",
                "Sec-Ch-Ua": '"Chromium";v="125", "Google Chrome";v="125"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "cross-site",
                "Upgrade-Insecure-Requests": "1",
                "Connection": "keep-alive"
            }
            
            async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=30.0) as client:
                response = await client.get(url)
                
                if response.status_code == 200:
                    logger.info("Successfully got HTML with direct httpx for URL: {}", url)
                    return response.text
                else:
                    logger.warning("Failed to get HTML with direct httpx: status code {}", response.status_code)
                    return None
        except Exception as e:
            logger.error("Error using direct httpx: {}", e)
            return None
    
    async def _process_html_with_structure_loader(self, html_content: str, url: str) -> List[Document]:
        """
        Sử dụng BeautifulSoup để xử lý HTML và tạo documents.
        """
        logger.info("Processing HTML with BeautifulSoup for URL: {}", url)
        
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            text = soup.get_text(separator=" ", strip=True)

            document = Document(
                page_content=text,
                metadata={
                    "source": url,
                    "date": datetime.now().isoformat(),
                    "domain": extract_domain(url)
                }
            )

            texts = self.text_splitter.split_documents([document])
            
            logger.info("Created {} document chunks from HTML", len(texts))
            return texts
    
        except Exception as e:
            logger.error("Error processing HTML with BeautifulSoup: {}", e)
            return []
    
    async def _extract_products_from_html(self, html_content: str, url: str) -> List[Dict[str, Any]]:
        """
        Trích xuất danh sách sản phẩm từ HTML.
        """
        logger.info("Extracting products from HTML for URL: {}", url)
        
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            domain = extract_domain(url)
            
            selectors = self._get_selectors_for_domain(domain)
            
            product_elements = soup.select(selectors["product_item"])
            
            products = []
            for element in product_elements:
                try:
                    name_elem = element.select_one(selectors["product_name"])
                    price_elem = element.select_one(selectors["product_price"])
                    image_elem = element.select_one(selectors["product_image"])
                    link_elem = element.select_one(selectors["product_link"])
                    
                    if not name_elem:
                        continue
                        
                    name = clean_text(name_elem.text)
                    price = extract_price(price_elem.text if price_elem else "0")
                    
                    image_url = ""
                    if image_elem and image_elem.has_attr('src'):
                        image_url = image_elem['src']
                        if not image_url.startswith(('http://', 'https://')):
                            image_url = f"https://{domain}{image_url if image_url.startswith('/') else '/' + image_url}"
                    
                    product_url = ""
                    if link_elem and link_elem.has_attr('href'):
                        product_url = link_elem['href']
                        if not product_url.startswith(('http://', 'https://')):
                            product_url = f"https://{domain}{product_url if product_url.startswith('/') else '/' + product_url}"
                    
                    brand_match = re.search(r'^(Samsung|Apple|iPhone|Xiaomi|Oppo|Vivo|Nokia|Realme|Huawei|Honor)', name, re.IGNORECASE)
                    brand = brand_match.group(1) if brand_match else name.split()[0]
                    
                    product_id = str(uuid.uuid4())
                    
                    product_dict = {
                        "id": product_id,
                        "name": name,
                        "brand": normalize_brand_name(brand),
                        "model": name.replace(brand, '').strip(),
                        "description": "",
                        "image_url": [image_url] if image_url else [],
                        "specifications": {
                            "cpu": None,
                            "ram": None,
                            "storage": None,
                            "display": None,
                            "camera": None,
                            "battery": None,
                            "os": None,
                            "connectivity": [],
                            "color": [],
                            "dimensions": None,
                            "weight": None,
                            "additional_specs": {}
                        },
                        "sources": [
                            {
                                "name": self._extract_source_name(url),
                                "url": product_url or url,
                                "price": float(price),
                                "price_currency": "VND",
                                "last_updated": datetime.now(),
                                "in_stock": True
                            }
                        ],
                        "min_price": float(price),
                        "max_price": float(price),
                        "average_price": float(price),
                        "category": "smartphone"
                    }
                    
                    try:
                        product = Product(**product_dict)
                        products.append(product_dict)
                    except ValidationError as ve:
                        logger.error("Validation error for product data: {}", ve)
                        continue
                    
                except Exception as e:
                    logger.error("Error extracting product from element: {}", e)
                    continue
            
            logger.info("Extracted {} products from HTML", len(products))
            return products
        except Exception as e:
            logger.error("Error extracting products from HTML: {}", e)
            return []
        
    async def _extract_product_detail_from_html(self, html_content: str, url: str) -> Optional[Dict[str, Any]]:
        """
        Trích xuất thông tin chi tiết sản phẩm từ HTML.
        """
        logger.info("Extracting product detail from HTML for URL: {}", url)
        
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            domain = extract_domain(url)
            detail_selectors = self._get_detail_selectors_for_domain(domain)
            name_elem = soup.select_one(detail_selectors["product_name"])
            price_elem = soup.select_one(detail_selectors["product_price"])
            image_elems = soup.select(detail_selectors["product_images"])
            desc_elem = soup.select_one(detail_selectors["product_description"])
            specs_elem = soup.select_one(detail_selectors["product_specifications"])
            brand_elem = soup.select_one(detail_selectors["product_brand"])
            
            if not name_elem:
                logger.error("Product name element not found")
                return None
                
            name = clean_text(name_elem.text)
            price = extract_price(price_elem.text if price_elem else "0")
            description = clean_text(desc_elem.text) if desc_elem else ""
            
            image_urls = []
            for img in image_elems:
                if img.has_attr('src'):
                    image_url = img['src']
                    if not image_url.startswith(('http://', 'https://')):
                        image_url = f"https://{domain}{image_url if image_url.startswith('/') else '/' + image_url}"
                    image_urls.append(image_url)
            
            brand = ""
            if brand_elem:
                if brand_elem.has_attr('content'):
                    brand = brand_elem['content']
                else:
                    brand = clean_text(brand_elem.text)
            
            if not brand:
                brand_match = re.search(r'^(Samsung|Apple|iPhone|Xiaomi|Oppo|Vivo|Nokia|Realme|Huawei|Honor)', name, re.IGNORECASE)
                brand = brand_match.group(1) if brand_match else name.split()[0]
            
            brand = normalize_brand_name(brand)
            specifications = {}
            if specs_elem:
                if specs_elem.name == 'table':
                    for row in specs_elem.select('tr'):
                        cells = row.select('td, th')
                        if len(cells) >= 2:
                            key = clean_text(cells[0].text).lower()
                            value = clean_text(cells[1].text)
                            specifications[key] = value

                elif specs_elem.name == 'ul':
                    for item in specs_elem.select('li'):
                        text = clean_text(item.text)
                        if ':' in text:
                            key, value = map(str.strip, text.split(':', 1))
                            specifications[key.lower()] = value
                else:
                    key_elems = specs_elem.select('.param-name, .spec-name, .spec-key')
                    value_elems = specs_elem.select('.param-value, .spec-value, .spec-val')
                    
                    if len(key_elems) == len(value_elems):
                        for i in range(len(key_elems)):
                            key = clean_text(key_elems[i].text).lower()
                            value = clean_text(value_elems[i].text)
                            specifications[key] = value
            
            specs_dict = {
                "cpu": None,
                "ram": None,
                "storage": None,
                "display": None,
                "camera": None,
                "battery": None,
                "os": None,
                "connectivity": [],
                "color": [],
                "dimensions": None,
                "weight": None,
                "additional_specs": {}
            }
            
            for key, value in specifications.items():
                if any(cpu_key in key for cpu_key in ['cpu', 'chip', 'vi xử lý']):
                    specs_dict['cpu'] = value
                elif any(ram_key in key for ram_key in ['ram', 'bộ nhớ ram']):
                    specs_dict['ram'] = value
                elif any(storage_key in key for storage_key in ['rom', 'bộ nhớ trong']):
                    specs_dict['storage'] = value
                elif any(display_key in key for display_key in ['màn hình', 'display']):
                    specs_dict['display'] = value
                elif any(camera_key in key for camera_key in ['camera']):
                    specs_dict['camera'] = value
                elif any(battery_key in key for battery_key in ['pin', 'battery']):
                    specs_dict['battery'] = value
                elif any(os_key in key for os_key in ['hệ điều hành', 'os']):
                    specs_dict['os'] = value
                elif any(connectivity_key in key for connectivity_key in ['kết nối', 'connectivity']):
                    if isinstance(value, str):
                        specs_dict['connectivity'] = [c.strip() for c in value.split(',')]
                    elif isinstance(value, list):
                        specs_dict['connectivity'] = value
                    else:
                        specs_dict['connectivity'] = [str(value)]
                elif any(color_key in key for color_key in ['màu', 'color']):
                    if isinstance(value, str):
                        specs_dict['color'] = [c.strip() for c in value.split(',')]
                    elif isinstance(value, list):
                        specs_dict['color'] = value
                    else:
                        specs_dict['color'] = [str(value)]
                elif any(dimensions_key in key for dimensions_key in ['kích thước', 'dimensions']):
                    specs_dict['dimensions'] = value
                elif any(weight_key in key for weight_key in ['cân nặng', 'trọng lượng']):
                    specs_dict['weight'] = value
                else:
                    if 'additional_specs' not in specs_dict:
                        specs_dict['additional_specs'] = {}
                    specs_dict['additional_specs'][key] = value
            
            product_id = str(uuid.uuid4())
        
            product_dict = {
                "id": product_id,
                "name": name,
                "brand": brand,
                "model": name.replace(brand, '').strip(),
                "description": description,
                "image_url": image_urls,
                "specifications": specs_dict,
                "sources": [
                    {
                        "name": self._extract_source_name(url),
                        "url": url,
                        "price": float(price),
                        "price_currency": "VND",
                        "last_updated": datetime.now(),
                        "in_stock": True
                    }
                ],
                "min_price": float(price),
                "max_price": float(price),
                "average_price": float(price),
                "category": "smartphone"
            }
            
            try:
                product = Product(**product_dict)
                return product_dict
            except ValidationError as ve:
                logger.error("Validation error for product data: {}", ve)
                return None
            
        except Exception as e:
            logger.error("Error extracting product detail from HTML: {}", e)
            return None
        
    def _get_selectors_for_domain(self, domain: str) -> Dict[str, str]:
        """
        Lấy selectors phù hợp với domain.
        """
        default_selectors = {
            "product_item": "div.product-item, div.product-card, div.product, .cate-pro-item, li.item",
            "product_name": "h3.product-name, h2.product-title, div.product-info h3, .cate-pro-name, h3",
            "product_price": "span.price, div.product-price, p.price, .cate-pro-price, .price",
            "product_image": "img.product-image, div.product-img img, .cate-pro-img img, img",
            "product_link": "a.product-link, div.product-img a, h3.product-name a, a.pro-thumb, a"
        }
        
        domain_selectors = {
            "thegioididong.com": {
                "product_item": "li.item",
                "product_name": "h3",
                "product_price": "strong.price",
                "product_image": "img.thumb",
                "product_link": "a"
            },
            "fptshop.com.vn": {
                "product_item": "div.cdt-product",
                "product_name": "h3",
                "product_price": "div.progress",
                "product_image": "img",
                "product_link": "a"
            },
            "cellphones.com.vn": {
                "product_item": "div.product-item",
                "product_name": "h3.product-name",
                "product_price": "p.special-price",
                "product_image": "img.product-img",
                "product_link": "a.product-name"
            }
        }
        
        for d, selectors in domain_selectors.items():
            if domain.endswith(d):
                return selectors
                
        return default_selectors
    
    def _get_detail_selectors_for_domain(self, domain: str) -> Dict[str, str]:
        """
        Lấy selectors chi tiết phù hợp với domain.
        """
        default_selectors = {
            "product_name": "h1.product-name, h1.product-title, div.product-title h1, h1[itemprop='name']",
            "product_price": "span.price, div.product-price, p.special-price, span[itemprop='price']",
            "product_images": "div.product-gallery img, img.product-image, div.carousel img, div.swiper-slide img",
            "product_description": "div.product-description, div.product-content, div.description-content, div[itemprop='description']",
            "product_specifications": "table.specifications, div.specifications-content, ul.specifications, div.st-param",
            "product_brand": "span.brand, div.brand, a.brand, meta[itemprop='brand']"
        }
        
        domain_selectors = {
            "thegioididong.com": {
                "product_name": "h1",
                "product_price": "div.box-price p",
                "product_images": "div.owl-carousel img",
                "product_description": "div.article-content",
                "product_specifications": "div.parameter",
                "product_brand": "meta[itemprop='brand']"
            },
            "fptshop.com.vn": {
                "product_name": "h1.st-name",
                "product_price": "div.st-price",
                "product_images": "div.st-slider img",
                "product_description": "div.st-specification",
                "product_specifications": "div.st-param",
                "product_brand": "h1.st-name"
            },
            "cellphones.com.vn": {
                "product_name": "h1.product-name",
                "product_price": "p.product-price--current",
                "product_images": "div.product-image img",
                "product_description": "div.product-description",
                "product_specifications": "div.product-technical-content",
                "product_brand": "div.product-brand"
            }
        }
        
        for d, selectors in domain_selectors.items():
            if domain.endswith(d):
                return selectors
                
        return default_selectors
    
    def _extract_source_name(self, url: str) -> str:
        """
        Trích xuất tên nguồn từ URL.
        """
        domain = extract_domain(url)
        
        domain_mapping = {
            "thegioididong.com": "Thế Giới Di Động",
            "fptshop.com.vn": "FPT Shop",
            "cellphones.com.vn": "CellphoneS",
            "tiki.vn": "Tiki",
            "lazada.vn": "Lazada",
            "shopee.vn": "Shopee",
            "viettelstore.vn": "Viettel Store",
            "hoanghamobile.com": "Hoàng Hà Mobile",
            "nguyenkim.com": "Nguyễn Kim",
            "sendo.vn": "Sendo",
            "dienmayxanh.com": "Điện Máy Xanh"
        }
        
        for d, name in domain_mapping.items():
            if domain.endswith(d):
                return name
                
        return domain.split('.')[0].capitalize()
    
    def _filter_products(self, products: List[Dict[str, Any]], request: ProductListRequest) -> List[Dict[str, Any]]:
        """
        Lọc sản phẩm theo yêu cầu.
        """
        filtered = []
        
        for product in products:
            if request.price_min is not None and product.get("min_price", 0) < request.price_min:
                continue
                
            if request.price_max is not None and product.get("min_price", 0) > request.price_max:
                continue
                
            if request.brands and product.get("brand") not in request.brands:
                continue
                
            filtered.append(product)
        
        return filtered
    
    def _sort_products(self, products: List[Dict[str, Any]], sort_by: str) -> List[Dict[str, Any]]:
        """
        Sắp xếp sản phẩm theo tiêu chí.
        """
        if sort_by == "price_asc":
            return sorted(products, key=lambda p: p.get("min_price", 0))
        elif sort_by == "price_desc":
            return sorted(products, key=lambda p: p.get("min_price", 0), reverse=True)
        
        return products
    
    def _format_chat_history(self, history: List[ChatMessage]) -> str:
        """
        Format lịch sử chat thành văn bản dễ đọc.
        """
        formatted = []
        for msg in history:
            role = "Người dùng" if msg.role == "user" else "Trợ lý"
            formatted.append(f"{role}: {msg.content}")
        return "\n".join(formatted)