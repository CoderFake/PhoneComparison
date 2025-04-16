import re
import uuid
import json
import html
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse
from bs4 import BeautifulSoup

def generate_id() -> str:
    """
    Tạo ID ngẫu nhiên.
    """
    return str(uuid.uuid4())

def extract_domain(url: str) -> str:
    """
    Trích xuất tên miền từ URL.
    """
    parsed = urlparse(url)
    domain = parsed.netloc
    # Loại bỏ 'www.' nếu có
    if domain.startswith('www.'):
        domain = domain[4:]
    return domain

def clean_text(text: str) -> str:
    """
    Làm sạch văn bản.
    """
    if not text:
        return ""
    
    # Loại bỏ khoảng trắng thừa
    text = re.sub(r'\s+', ' ', text.strip())
    # Loại bỏ các ký tự HTML entities
    text = html.unescape(text)
    return text

def extract_price(text: str) -> float:
    """
    Trích xuất giá từ văn bản.
    """
    if not text:
        return 0.0
    
    # Loại bỏ các ký tự không phải số
    price_text = re.sub(r'[^\d]', '', text)
    if price_text:
        return float(price_text)
    return 0.0

def normalize_brand_name(brand: str) -> str:
    """
    Chuẩn hóa tên thương hiệu.
    """
    if not brand:
        return "Unknown"
    
    # Mapping các tên thương hiệu phổ biến
    brand_mapping = {
        'ip': 'Apple',
        'iphone': 'Apple',
        'apple': 'Apple',
        'sam': 'Samsung',
        'samsung': 'Samsung',
        'ss': 'Samsung',
        'xiaomi': 'Xiaomi',
        'mi': 'Xiaomi',
        'redmi': 'Xiaomi',
        'poco': 'Xiaomi',
        'oppo': 'Oppo',
        'vivo': 'Vivo',
        'realme': 'Realme',
        'nokia': 'Nokia',
        'itel': 'Itel',
        'vsmart': 'VinSmart',
        'lg': 'LG',
        'sony': 'Sony',
        'huawei': 'Huawei',
        'honor': 'Honor',
        'asus': 'Asus',
        'oneplus': 'OnePlus',
        'tecno': 'Tecno',
        'mobell': 'Mobell',
        'masstel': 'Masstel'
    }
    
    brand_lower = brand.lower().strip()
    for key, value in brand_mapping.items():
        if key == brand_lower or brand_lower.startswith(key + ' '):
            return value
    
    # Nếu không tìm thấy trong mapping, trả về tên với chữ cái đầu viết hoa
    return brand.strip().title()

def extract_product_info_from_html(html_content: str, url: str) -> Dict[str, Any]:
    """
    Trích xuất thông tin sản phẩm từ HTML.
    """
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Trích xuất thông tin cơ bản
        domain = extract_domain(url)
        
        # Các selector chung
        title_selectors = [
            'h1.product-title', 'h1.product-name', 'h1.detail-product-name',
            'h1[itemprop="name"]', 'div.product-title h1'
        ]
        
        price_selectors = [
            'span.price', 'div.product-price', 'p.special-price',
            'span[itemprop="price"]', 'div.box-price p'
        ]
        
        image_selectors = [
            'div.product-gallery img', 'img.product-image',
            'div.carousel img', 'div.swiper-slide img'
        ]
        
        desc_selectors = [
            'div.product-description', 'div.product-content',
            'div.description-content', 'div[itemprop="description"]'
        ]
        
        specs_selectors = [
            'table.specifications', 'div.specifications-content',
            'ul.specifications', 'div.st-param'
        ]
        
        # Tìm elements theo selectors
        title_elem = None
        for selector in title_selectors:
            title_elem = soup.select_one(selector)
            if title_elem:
                break
                
        price_elem = None
        for selector in price_selectors:
            price_elem = soup.select_one(selector)
            if price_elem:
                break
                
        image_elems = []
        for selector in image_selectors:
            image_elems = soup.select(selector)
            if image_elems:
                break
                
        desc_elem = None
        for selector in desc_selectors:
            desc_elem = soup.select_one(selector)
            if desc_elem:
                break
                
        specs_elem = None
        for selector in specs_selectors:
            specs_elem = soup.select_one(selector)
            if specs_elem:
                break
        
        # Trích xuất thông tin
        title = clean_text(title_elem.text) if title_elem else ""
        price = extract_price(price_elem.text) if price_elem else 0.0
        images = [img.get('src', '') for img in image_elems if img.get('src')]
        description = clean_text(desc_elem.text) if desc_elem else ""
        
        # Trích xuất thông số kỹ thuật
        specs = extract_specifications(specs_elem) if specs_elem else {}
        
        # Trích xuất thương hiệu từ tên sản phẩm
        brand = extract_brand_from_title(title)
        
        # Tạo thông tin sản phẩm
        product_info = {
            "id": generate_id(),
            "name": title,
            "brand": brand,
            "model": extract_model_from_title(title, brand),
            "description": description,
            "image_url": images,
            "specifications": specs,
            "sources": [
                {
                    "name": domain,
                    "url": url,
                    "price": price,
                }
            ],
            "min_price": price,
            "max_price": price,
            "average_price": price
        }
        
        return product_info
    except Exception as e:
        print(f"Lỗi khi trích xuất thông tin sản phẩm: {e}")
        return {}

def extract_brand_from_title(title: str) -> str:
    """
    Trích xuất thương hiệu từ tên sản phẩm.
    """
    if not title:
        return "Unknown"
    
    # Danh sách các thương hiệu phổ biến
    brands = [
        'Apple', 'iPhone', 'Samsung', 'Xiaomi', 'Oppo', 'Vivo', 'Realme',
        'Nokia', 'Huawei', 'Honor', 'OnePlus', 'Sony', 'LG', 'Asus'
    ]
    
    for brand in brands:
        if brand.lower() in title.lower() or brand.lower() + ' ' in title.lower():
            return normalize_brand_name(brand)
    
    # Nếu không tìm thấy thương hiệu, lấy từ đầu tiên của tên
    words = title.split()
    if words:
        return normalize_brand_name(words[0])
    
    return "Unknown"

def extract_model_from_title(title: str, brand: str) -> str:
    """
    Trích xuất model từ tên sản phẩm.
    """
    if not title:
        return ""
    
    # Loại bỏ tên thương hiệu từ tiêu đề
    model = title.replace(brand, '').strip()
    model = re.sub(r'^[\s\-]+', '', model)  # Loại bỏ khoảng trắng và gạch ngang ở đầu
    
    return model

def extract_specifications(specs_elem) -> Dict[str, Any]:
    """
    Trích xuất thông số kỹ thuật từ element.
    """
    specs = {}
    
    if not specs_elem:
        return specs
    
    # Xử lý bảng thông số
    if specs_elem.name == 'table':
        rows = specs_elem.select('tr')
        for row in rows:
            cols = row.select('td, th')
            if len(cols) >= 2:
                key = clean_text(cols[0].text).lower()
                value = clean_text(cols[1].text)
                update_specs_dict(specs, key, value)
    
    # Xử lý danh sách thông số
    elif specs_elem.name == 'ul':
        items = specs_elem.select('li')
        for item in items:
            text = clean_text(item.text)
            if ':' in text:
                key, value = text.split(':', 1)
                update_specs_dict(specs, key.lower(), value)
    
    # Xử lý div chứa thông số
    else:
        # Tìm các cặp key-value
        key_elems = specs_elem.select('.param-name, .spec-name, .spec-key')
        value_elems = specs_elem.select('.param-value, .spec-value, .spec-val')
        
        if len(key_elems) == len(value_elems):
            for i in range(len(key_elems)):
                key = clean_text(key_elems[i].text).lower()
                value = clean_text(value_elems[i].text)
                update_specs_dict(specs, key, value)
    
    return specs

def update_specs_dict(specs: Dict[str, Any], key: str, value: str) -> None:
    """
    Cập nhật từ điển thông số kỹ thuật với key và value.
    """
    if not key or not value:
        return
    
    # Mapping các key phổ biến
    key_mapping = {
        'cpu': ['cpu', 'chip', 'chipset', 'vi xử lý', 'bộ vi xử lý', 'processor'],
        'ram': ['ram', 'bộ nhớ ram', 'memory'],
        'storage': ['rom', 'storage', 'bộ nhớ trong', 'internal storage'],
        'display': ['display', 'screen', 'màn hình'],
        'camera': ['camera', 'camera sau', 'rear camera', 'camera trước', 'front camera'],
        'battery': ['battery', 'pin', 'dung lượng pin'],
        'os': ['os', 'operating system', 'hệ điều hành'],
        'connectivity': ['kết nối', 'connectivity', 'connection', 'network'],
        'color': ['color', 'màu sắc', 'màu', 'colours'],
        'dimensions': ['dimensions', 'kích thước'],
        'weight': ['weight', 'cân nặng', 'trọng lượng']
    }
    
    # Tìm key phù hợp
    for spec_key, aliases in key_mapping.items():
        if any(alias in key for alias in aliases):
            if spec_key == 'color' and isinstance(value, str):
                # Xử lý đặc biệt cho màu sắc
                if spec_key not in specs:
                    specs[spec_key] = []
                colors = [c.strip() for c in value.split(',')]
                specs[spec_key].extend(colors)
            else:
                specs[spec_key] = value
            return
    
    # Nếu không tìm thấy key phù hợp, thêm vào additional_specs
    if 'additional_specs' not in specs:
        specs['additional_specs'] = {}
    specs['additional_specs'][key] = value