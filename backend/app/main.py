from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.controllers import product_controller, chat_controller
from app.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API cho hệ thống so sánh giá điện thoại ở Việt Nam"
)

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(product_controller.router, prefix="/api/products", tags=["products"])
app.include_router(chat_controller.router, prefix="/api/chat", tags=["chat"])

@app.get("/")
async def root():
    """Route mặc định để kiểm tra API hoạt động."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)