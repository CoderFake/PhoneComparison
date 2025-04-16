    phone-price-comparison/
    ├── docker-compose.yml
    ├── backend/
    │   ├── Dockerfile
    │   ├── app/
    │   │   ├── __init__.py
    │   │   ├── main.py
    │   │   ├── config.py
    │   │   ├── models/
    │   │   │   ├── __init__.py
    │   │   │   ├── product.py
    │   │   │   └── chat.py
    │   │   ├── controllers/
    │   │   │   ├── __init__.py
    │   │   │   ├── product_controller.py
    │   │   │   └── chat_controller.py
    │   │   ├── services/
    │   │   │   ├── __init__.py
    │   │   │   ├── reflection_service.py
    │   │   │   ├── rag_service.py
    │   │   │   └── chat_service.py
    │   │   └── utils/
    │   │       ├── __init__.py
    │   │       └── helpers.py
    │   └── requirements.txt
    ├── frontend/
    │   ├── Dockerfile
    │   ├── package.json
    │   ├── public/
    │   └── src/
    │       ├── App.js
    │       ├── index.js
    │       ├── components/
    │       │   ├── ProductList.js
    │       │   ├── ProductDetail.js
    │       │   ├── ProductComparison.js
    │       │   └── ChatBot.js
    │       ├── services/
    │       │   ├── api.js
    │       │   └── chatService.js
    │       └── styles/
    │           └── main.css
    ├── searxng/
    │   └── Dockerfile
    └── crawl4ai/
        └── Dockerfile