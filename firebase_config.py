import os

import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv


# .env 파일 불러오기
load_dotenv()


# Firebase 서비스 계정 키 파일
SERVICE_ACCOUNT_FILE = os.getenv(
    "FIREBASE_SERVICE_ACCOUNT_FILE",
    "local-guide-ai-8e671-firebase-adminsdk-fbsvc-8253c1c628.json"
)


# Firebase 초기화
if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
    firebase_admin.initialize_app(cred)


# Firestore 클라이언트
db = firestore.client()