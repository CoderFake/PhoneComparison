FROM python:3.11-slim

WORKDIR /app

# Cài đặt các dependencies
RUN apt-get update && \
    apt-get install -y git build-essential chromium chromium-driver && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Clone repository Crawl4AI (sử dụng phiên bản mới nhất)
RUN git clone https://github.com/unclecode/crawl4ai.git . && \
    git checkout main && \
    git pull

# Cài đặt requirements
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir playwright==1.41.1 beautifulsoup4==4.12.3 selectolax==0.3.17 lxml==4.9.3 httpx==0.27.0 aiohttp==3.9.1 langchain==0.1.5

# Cài đặt Playwright browsers
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN pip install playwright && \
    playwright install chromium

# Tạo thư mục cấu hình và dữ liệu
RUN mkdir -p /app/config /app/data /app/logs

# Sao chép cấu hình tùy chỉnh
COPY config/crawl4ai.yaml /app/config/

# Thiết lập biến môi trường
ENV PYTHONUNBUFFERED=1
ENV CRAWL4AI_CONFIG_PATH=/app/config/crawl4ai.yaml
ENV CRAWL4AI_DATA_DIR=/app/data
ENV CRAWL4AI_LOG_DIR=/app/logs

# Expose port
EXPOSE 8888

# Khởi động server
CMD ["python", "server.py", "--config", "/app/config/crawl4ai.yaml"]