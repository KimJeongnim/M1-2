from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os

from routers.data import router as data_router
from routers.conversations import router as conversations_router
from routers.chat import router as chat_router


app = FastAPI(
    title="Local Guide AI",
    description="지역 관광 데이터를 기반으로 정보를 제공하는 AI 비서",
    version="1.0.0"
)


# CORS 설정
# ALLOWED_ORIGINS 환경변수에 콤마(,)로 구분된 도메인 목록을 설정한다.
# 예: ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:5500
# 값이 없으면 로컬 개발 편의를 위해 전체 허용("*")으로 동작한다.
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")

if allowed_origins_env:
    allowed_origins = [
        origin.strip()
        for origin in allowed_origins_env.split(",")
        if origin.strip()
    ]
else:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API 라우터 등록
app.include_router(data_router)
app.include_router(conversations_router)
app.include_router(chat_router)


# 프론트엔드 경로
FRONTEND_DIR = os.path.join(
    os.path.dirname(__file__),
    "frontend"
)


# 정적 파일
app.mount(
    "/static",
    StaticFiles(directory=FRONTEND_DIR),
    name="static"
)


# 메인 페이지
@app.get("/")
def root():
    return FileResponse(
        os.path.join(FRONTEND_DIR, "index.html")
    )