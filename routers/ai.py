from fastapi import APIRouter
from pydantic import BaseModel
import os
import json

from google import genai

from firebase_config import db


router = APIRouter(
    prefix="/api/ai",
    tags=["ai"]
)


# ========================================
# 질문 데이터 구조
# ========================================

class Question(BaseModel):
    question: str


# ========================================
# Gemini 설정
# ========================================

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY가 설정되지 않았습니다.")

client = genai.Client(
    api_key=api_key
)


# ========================================
# 질문 분석
# ========================================

def analyze_question(question: str):
    """
    사용자의 질문에서 지역과 조회 기간을 파악한다.
    """

    prompt = f"""
당신은 관광 데이터 분석 시스템의 질문 분석 담당 AI입니다.

사용자의 질문을 분석해서 다음 정보를 JSON으로 반환하세요.

- region: 지역명
- start_date: 조회 시작월
- end_date: 조회 종료월

규칙:

1. 지역이 명확하게 언급되어 있으면 해당 지역명을 사용하세요.
2. 지역이 언급되지 않았다면 null을 사용하세요.
3. 날짜가 명확하게 언급되어 있으면 YYYYMM 형식으로 변환하세요.
4. "2026년"처럼 연도만 있으면 202601부터 202612로 설정하세요.
5. "2026년 상반기"는 202601부터 202606입니다.
6. "2026년 1월부터 7월"은 202601부터 202607입니다.
7. 기간이 언급되지 않았다면 null을 사용하세요.
8. 반드시 JSON만 반환하세요.
9. 설명이나 마크다운은 작성하지 마세요.

사용자 질문:
{question}

반드시 다음 형식으로 반환하세요.

{{
    "region": null,
    "start_date": null,
    "end_date": null
}}
"""

    response = client.interactions.create(
        model="gemini-3.6-flash",
        input=prompt
    )

    result_text = response.output_text.strip()

    # 혹시 ```json 형태로 반환되는 경우 제거
    if result_text.startswith("```"):
        result_text = result_text.replace("```json", "")
        result_text = result_text.replace("```", "")
        result_text = result_text.strip()

    return json.loads(result_text)


# ========================================
# 관광 데이터 조회
# ========================================

def get_tourism_data(
    region=None,
    start_date=None,
    end_date=None
):
    """
    조건에 맞는 관광 데이터를 Firestore에서 조회한다.
    """

    docs = db.collection("data").stream()

    results = []

    for doc in docs:

        data = doc.to_dict()

        # 지역 필터
        if region is not None:
            if data.get("region") != region:
                continue

        date = str(data.get("date", ""))

        # 시작월 필터
        if start_date is not None:
            if date < start_date:
                continue

        # 종료월 필터
        if end_date is not None:
            if date > end_date:
                continue

        results.append({
            "date": data.get("date"),
            "region": data.get("region"),
            "visitor_count": data.get("visitor_count"),
            "previous_count": data.get("previous_count"),
            "change_rate": data.get("change_rate")
        })

    results.sort(
        key=lambda x: (
            x.get("date", ""),
            x.get("region", "")
        )
    )

    return results


# ========================================
# AI 질문 API
# ========================================

@router.post("/ask")
def ask_ai(data: Question):

    # 1. 질문 분석
    question_info = analyze_question(
        data.question
    )

    region = question_info.get("region")
    start_date = question_info.get("start_date")
    end_date = question_info.get("end_date")

    # 2. 필요한 데이터만 조회
    tourism_data = get_tourism_data(
        region=region,
        start_date=start_date,
        end_date=end_date
    )

    # 3. 데이터 문자열 생성
    data_text = "\n".join(
        [
            f"{item['date']} | "
            f"{item['region']} | "
            f"방문자수: {item['visitor_count']:,}명 | "
            f"전년동월: {item['previous_count']:,}명 | "
            f"증감률: {item['change_rate']}%"
            for item in tourism_data
        ]
    )

    # 4. Gemini 분석 요청
    prompt = f"""
당신은 'Local Guide AI'라는 관광 데이터 분석 AI입니다.

사용자의 질문에 답할 때 반드시 아래의 실제 관광 데이터를 근거로 답변하세요.

[사용자 질문]
{data.question}

[질문에서 파악한 조건]
지역: {region}
시작월: {start_date}
종료월: {end_date}

[실제 관광 데이터]
{data_text}

규칙:
1. 제공된 데이터에 없는 수치를 만들지 마세요.
2. 실제 데이터에 근거해서 답변하세요.
3. 방문자 수는 천 단위 구분기호를 사용하세요.
4. 증감률에는 %를 표시하세요.
5. 단순히 숫자를 나열하지 말고 추이를 분석하세요.
6. 데이터가 부족하면 부족하다고 말하세요.
"""

    response = client.interactions.create(
        model="gemini-3.6-flash",
        input=prompt
    )

    # 5. 결과 반환
    return {
        "question": data.question,
        "filters": {
            "region": region,
            "start_date": start_date,
            "end_date": end_date
        },
        "data_count": len(tourism_data),
        "answer": response.output_text
    }