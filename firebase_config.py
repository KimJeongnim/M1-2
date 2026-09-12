import os
import json

import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv


# .env 파일 불러오기
load_dotenv()


# Firebase 초기화
if not firebase_admin._apps:

    # 1. 환경변수에 Firebase 서비스 계정 JSON이 있으면 사용
    firebase_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

    if firebase_json:
        service_account_info = json.loads(firebase_json)
        cred = credentials.Certificate(service_account_info)

    else:
        # 2. 로컬 개발 환경에서는 JSON 파일 사용
        service_account_file = os.getenv(
            "FIREBASE_SERVICE_ACCOUNT_FILE"
        )

        if not service_account_file:
            raise ValueError(
                "Firebase 인증 정보가 없습니다. "
                "FIREBASE_SERVICE_ACCOUNT_JSON 또는 "
                "FIREBASE_SERVICE_ACCOUNT_FILE을 설정해주세요."
            )

        cred = credentials.Certificate(service_account_file)

    firebase_admin.initialize_app(cred)


# Firestore 클라이언트
db = firestore.client()