from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.data import router as data_router
from routers.ai import router as ai_router
from routers.conversations import router as conversations_router
from routers.chat import router as chat_router

app = FastAPI(
    title="Local Guide AI",
    description="지역 관광 데이터를 기반으로 정보를 제공하는 AI 비서",
    version="1.0.0"
)


# ========================================
# CORS 설정
# ========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========================================
# Router 연결
# ========================================

app.include_router(data_router)
app.include_router(ai_router)
app.include_router(conversations_router)
app.include_router(chat_router)


# ========================================
# 기본 API
# ========================================

@app.get("/")
def root():
    return {
        "message": "Local Guide AI API가 정상적으로 실행되고 있습니다."
    }