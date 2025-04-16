import asyncio
import uuid
import json
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
import numpy as np
from sentence_transformers import SentenceTransformer, models
import torch
from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models
from qdrant_client.http.exceptions import UnexpectedResponse
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.document_loaders.base import Document
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings
from app.models.product import Product, ProductSource, ProductSpecification

class RAGService:
    """
    Service xử lý lưu trữ và truy xuất dữ liệu sử dụng RAG.
    """
    
    def __init__(self):
        # Khởi tạo mô hình embedding
        try:
            # Tối ưu hóa tải mô hình với caching
            self.embedding_model = SentenceTransformer(
                settings.EMBEDDING_MODEL, 
                device='cuda' if torch.cuda.is_available() else 'cpu'
            )
            logger.info(
                "Embedding model loaded: {} on {}", 
                settings.EMBEDDING_MODEL, 
                'GPU' if torch.cuda.is_available() else 'CPU'
            )
        except Exception as e:
            logger.error("Error loading primary embedding model: {}", e)
            # Fallback to huggingface/SentenceTransformers
            try:
                word_embedding_model = models.Transformer('vinai/phobert-base', max_seq_length=256)
                pooling_model = models.Pooling(word_embedding_model.get_word_embedding_dimension())
                self.embedding_model = SentenceTransformer(modules=[word_embedding_model, pooling_model])
                logger.info("Loaded fallback embedding model")
            except Exception as e2:
                logger.error("Failed to load fallback model too: {}", e2)
                # Final fallback to a backup model
                self.embedding_model = SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
                logger.warning("Using multilingual backup model")
        
        # Khởi tạo kết nối với Vector DB
        try:
            self.vector_db = QdrantClient(
                url=settings.VECTOR_DB_URL,
                timeout=60,
                prefer_grpc=settings.VECTOR_DB_GRPC
            )
            logger.info("Connected to vector database at {}", settings.VECTOR_DB_URL)
        except Exception as e:
            logger.error("Failed to connect to vector database: {}", e)
            raise
        
        # Tạo collection nếu chưa tồn tại
        self._create_collection_if_not_exists()
        
        # Khởi tạo HTML splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _create_collection_if_not_exists(self):
        """
        Tạo collection trong vector database nếu chưa tồn tại.
        """
        try:
            collections = self.vector_db.get_collections()
            collection_names = [collection.name for collection in collections.collections]
            
            if settings.COLLECTION_NAME not in collection_names:
                logger.info("Creating collection '{}'", settings.COLLECTION_NAME)
                self.vector_db.create_collection(
                    collection_name=settings.COLLECTION_NAME,
                    vectors_config=qdrant_models.VectorParams(
                        size=settings.EMBEDDING_DIMENSION,
                        distance=qdrant_models.Distance.COSINE
                    )
                )
                logger.info("Collection '{}' created successfully", settings.COLLECTION_NAME)
                
                # Tạo index cho field product_data.id để search nhanh
                self.vector_db.create_payload_index(
                    collection_name=settings.COLLECTION_NAME,
                    field_name="product_data.id",
                    field_schema=qdrant_models.PayloadSchemaType.KEYWORD
                )
                logger.info("Created index on product_data.id")
            else:
                logger.info("Collection '{}' already exists", settings.COLLECTION_NAME)
        except Exception as e:
            logger.error("Error when creating collection: {}", e)
            raise
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def add_documents_to_rag(self, documents: List[Document]) -> int:
        """
        Xử lý documents, tạo embeddings và lưu vào vector database.
        """
        if not documents:
            logger.warning("No documents to add to RAG")
            return 0
            
        logger.info("Adding {} documents to RAG", len(documents))
        
        try:
            # Tạo embeddings cho từng document
            texts = [doc.page_content for doc in documents]
            embeddings = self.embedding_model.encode(texts)
            
            # Chuẩn bị dữ liệu lưu vào vector database
            points = []
            for i, (doc, embedding) in enumerate(zip(documents, embeddings)):
                record_id = str(uuid.uuid4())
                
                # Đảm bảo metadata là dictionary hợp lệ
                metadata = dict(doc.metadata) if doc.metadata else {}
                
                points.append(
                    qdrant_models.PointStruct(
                        id=record_id,
                        vector=embedding.tolist(),
                        payload={
                            "text": doc.page_content,
                            "source": metadata.get("source", ""),
                            "date": metadata.get("date", datetime.now().isoformat()),
                            "domain": metadata.get("domain", ""),
                            "product_data": metadata.get("product_data", {}),
                            "chunk_id": i
                        }
                    )
                )
            
            # Lưu vào vector database
            self.vector_db.upsert(
                collection_name=settings.COLLECTION_NAME,
                points=points
            )
            
            logger.info("Successfully added {} documents to RAG", len(documents))
            return len(points)
        except Exception as e:
            logger.error("Error adding documents to RAG: {}", e)
            raise
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def add_html_to_rag(self, html_content: str, metadata: Dict[str, Any] = None) -> int:
        """
        Xử lý nội dung HTML, tạo embeddings và lưu vào vector database.
        """
        if not html_content:
            logger.warning("No HTML content to add to RAG")
            return 0
            
        if not metadata:
            metadata = {}
            
        logger.info("Adding HTML content to RAG, source: {}", metadata.get("source", "unknown"))
        
        try:
            from langchain_community.document_loaders import BSHTMLLoader
            
            # Sử dụng BSHTMLLoader để xử lý HTML
            loader = BSHTMLLoader(html_content=html_content)
            documents = loader.load()
            
            # Thêm metadata vào mỗi document
            for doc in documents:
                doc.metadata.update(metadata)
            
            # Chia documents thành các đoạn nhỏ hơn
            chunks = self.text_splitter.split_documents(documents)
            
            # Thêm chunks vào RAG
            result = await self.add_documents_to_rag(chunks)
            
            return result
        except Exception as e:
            logger.error("Error adding HTML to RAG: {}", e)
            raise
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def get_products(
        self, 
        query: str,
        price_min: Optional[float] = None,
        price_max: Optional[float] = None,
        brands: Optional[List[str]] = None,
        sort_by: str = "relevance",
        page: int = 1,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Tìm kiếm sản phẩm từ vector database dựa vào query và filters.
        """
        logger.info("Searching products with query: {}", query)
        
        try:
            # Tạo embedding cho query
            query_embedding = self.embedding_model.encode(query).tolist()
            
            # Xây dựng filter
            filter_conditions = []
            
            # Lọc theo giá
            if price_min is not None:
                filter_conditions.append(
                    qdrant_models.FieldCondition(
                        key="product_data.min_price",
                        range=qdrant_models.Range(
                            gte=price_min
                        )
                    )
                )
                
            if price_max is not None:
                filter_conditions.append(
                    qdrant_models.FieldCondition(
                        key="product_data.min_price",
                        range=qdrant_models.Range(
                            lte=price_max
                        )
                    )
                )
                
            # Lọc theo thương hiệu
            if brands and len(brands) > 0:
                filter_conditions.append(
                    qdrant_models.FieldCondition(
                        key="product_data.brand",
                        match=qdrant_models.MatchAny(
                            any=brands
                        )
                    )
                )
            
            # Tổng hợp filter conditions
            query_filter = None
            if len(filter_conditions) > 0:
                query_filter = qdrant_models.Filter(
                    must=filter_conditions
                )
            
            # Tìm kiếm trong vector database
            search_result = self.vector_db.search(
                collection_name=settings.COLLECTION_NAME,
                query_vector=query_embedding,
                limit=settings.RAG_TOP_K * 5,  # Lấy nhiều hơn để lọc
                query_filter=query_filter,
                score_threshold=settings.RAG_SIMILARITY_THRESHOLD
            )
            
            # Trích xuất thông tin sản phẩm từ kết quả tìm kiếm
            products_dict = {}
            for point in search_result:
                product_data = point.payload.get("product_data")
                if not product_data:
                    continue
                    
                product_id = product_data.get("id")
                if not product_id:
                    continue
                    
                # Chỉ lưu sản phẩm có độ tương đồng cao nhất
                if product_id not in products_dict:
                    products_dict[product_id] = product_data
                    
            # Chuyển sang danh sách
            product_list = list(products_dict.values())
            
            # Sắp xếp kết quả
            sorted_products = self._sort_products(product_list, sort_by)
            
            # Phân trang
            start_idx = (page - 1) * limit
            end_idx = start_idx + limit
            
            logger.info("Found {} products for query: {}", len(sorted_products), query)
            
            return sorted_products[start_idx:end_idx]
        except Exception as e:
            logger.error("Error searching products from RAG: {}", e)
            # Trả về danh sách rỗng nếu có lỗi
            return []
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def get_product_by_id(self, product_id: str) -> Optional[Dict[str, Any]]:
        """
        Lấy thông tin chi tiết sản phẩm theo ID từ RAG.
        """
        logger.info("Retrieving product detail for ID: {}", product_id)
        
        try:
            # Tìm kiếm theo ID
            filter_condition = qdrant_models.FieldCondition(
                key="product_data.id",
                match=qdrant_models.MatchValue(value=product_id)
            )
            
            # Sử dụng vector rỗng để tìm kiếm chỉ dựa vào filter
            dummy_vector = [0.0] * settings.EMBEDDING_DIMENSION
            
            search_result = self.vector_db.search(
                collection_name=settings.COLLECTION_NAME,
                query_vector=dummy_vector,
                limit=1,
                query_filter=qdrant_models.Filter(
                    must=[filter_condition]
                )
            )
            
            if not search_result:
                logger.warning("Product with ID {} not found", product_id)
                return None
                
            # Lấy dữ liệu sản phẩm
            product_data = search_result[0].payload.get("product_data", {})
            if not product_data:
                logger.warning("No product data found for ID: {}", product_id)
                return None
                
            logger.info("Successfully retrieved product with ID: {}", product_id)
            return product_data
        except Exception as e:
            logger.error("Error retrieving product by ID from RAG: {}", e)
            # Trả về None nếu có lỗi
            return None
    
    def _sort_products(self, products: List[Dict[str, Any]], sort_by: str) -> List[Dict[str, Any]]:
        """
        Sắp xếp danh sách sản phẩm theo tiêu chí.
        """
        if sort_by == "price_asc":
            return sorted(products, key=lambda p: p.get("min_price", 0))
        elif sort_by == "price_desc":
            return sorted(products, key=lambda p: p.get("min_price", 0), reverse=True)
        elif sort_by == "name_asc":
            return sorted(products, key=lambda p: p.get("name", ""))
        elif sort_by == "name_desc":
            return sorted(products, key=lambda p: p.get("name", ""), reverse=True)
        
        # Mặc định không sắp xếp (relevance)
        return products
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def search_similar_products(self, product_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Tìm kiếm các sản phẩm tương tự dựa trên ID sản phẩm.
        """
        logger.info("Searching similar products for ID: {}", product_id)
        
        try:
            # Lấy thông tin sản phẩm
            product = await self.get_product_by_id(product_id)
            if not product:
                logger.warning("Product with ID {} not found for similarity search", product_id)
                return []
                
            # Tạo query string từ thông tin sản phẩm
            query = f"{product.get('name', '')} {product.get('brand', '')} {product.get('model', '')}"
            
            # Lấy các sản phẩm tương tự nhưng loại trừ sản phẩm hiện tại
            products = await self.get_products(query=query, limit=limit+1)
            
            # Loại bỏ sản phẩm hiện tại khỏi kết quả
            similar_products = [p for p in products if p.get("id") != product_id]
            
            # Giới hạn số lượng sản phẩm trả về
            return similar_products[:limit]
        except Exception as e:
            logger.error("Error searching similar products: {}", e)
            return []
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def update_product(self, product_data: Dict[str, Any]) -> bool:
        """
        Cập nhật thông tin sản phẩm trong RAG.
        """
        logger.info("Updating product with ID: {}", product_data.get("id"))
        
        try:
            product_id = product_data.get("id")
            if not product_id:
                logger.error("No product ID provided for update")
                return False
                
            # Tìm các points chứa product_data.id
            filter_condition = qdrant_models.FieldCondition(
                key="product_data.id",
                match=qdrant_models.MatchValue(value=product_id)
            )
            
            search_result = self.vector_db.scroll(
                collection_name=settings.COLLECTION_NAME,
                limit=100,  # Giới hạn số lượng points tìm thấy
                filter=qdrant_models.Filter(must=[filter_condition]),
                with_payload=True,
                with_vectors=False
            )
            
            points = search_result[0]  # points là item đầu tiên của tuple trả về
            
            if not points:
                logger.warning("No points found with product ID: {} for update", product_id)
                return False
                
            # Cập nhật payload cho tất cả points
            for point in points:
                point_id = point.id
                payload = point.payload
                
                # Cập nhật product_data
                payload["product_data"] = product_data
                
                # Cập nhật payload
                self.vector_db.set_payload(
                    collection_name=settings.COLLECTION_NAME,
                    payload=payload,
                    points=[point_id]
                )
            
            logger.info("Successfully updated product with ID: {}", product_id)
            return True
        except Exception as e:
            logger.error("Error updating product in RAG: {}", e)
            return False
    
    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=5))
    async def get_product_count(self) -> int:
        """
        Lấy tổng số sản phẩm trong RAG.
        """
        try:
            # Lấy thông tin collection
            collection_info = self.vector_db.get_collection(
                collection_name=settings.COLLECTION_NAME
            )
            
            # Trả về số lượng points
            return collection_info.vectors_count
        except Exception as e:
            logger.error("Error getting product count from RAG: {}", e)
            return 0