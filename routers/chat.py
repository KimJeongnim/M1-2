
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime
import os

from dotenv import load_dotenv
from openai import OpenAI

from firebase_config import db


load_dotenv()


router = APIRouter(
    prefix="/api/chat",
    tags=["chat"]
)


class ChatRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=1,
        description="사용자가 AI에게 질문할 내용"
    )


def get_data_summary():
    """
    Firestore의 관광 데이터를 조회하여
    AI에게 전달할 요약 정보를 생성한다.
    """

    docs = db.collection("data").stream()

    results = []

    for doc in docs:
        data = doc.to_dict()

        visitor_count = data.get("visitor_count")

        if visitor_count is None:
            continue

        results.append({
            "date": str(data.get("date", "")),
            "region": data.get("region"),
            "visitor_count": visitor_count,
            "change_rate": data.get("change_rate")
        })

    if not results:
        return {
            "period": None,
            "count": 0,
            "metrics": {
                "total": 0,
                "average": 0,
                "max": 0,
                "min": 0
            },
            "trend": "데이터 없음"
        }

    results.sort(
        key=lambda x: (
            x.get("date", ""),
            x.get("region", "")
        )
    )

    visitor_counts = [
        item["visitor_count"]
        for item in results
    ]

    total = sum(visitor_counts)
    average = total / len(visitor_counts)
    maximum = max(visitor_counts)
    minimum = min(visitor_counts)

    latest_date = results[-1]["date"]

    latest_data = [
        item
        for item in results
        if item["date"] == latest_date
    ]

    latest_change_rates = [
        item["change_rate"]
        for item in latest_data
        if item["change_rate"] is not None
    ]

    if latest_change_rates:
        average_change_rate = (
            sum(latest_change_rates)
            / len(latest_change_rates)
        )
    else:
        average_change_rate = 0

    if average_change_rate > 0:
        trend = (
            f"상승 (최근 월 평균 증감률 "
            f"{average_change_rate:.1f}%)"
        )
    elif average_change_rate < 0:
        trend = (
            f"감소 (최근 월 평균 증감률 "
            f"{average_change_rate:.1f}%)"
        )
    else:
        trend = "유지 (최근 월 평균 증감률 0.0%)"

    return {
        "period": (
            f"{results[0]['date'][:4]}-"
            f"{results[0]['date'][4:]} ~ "
            f"{results[-1]['date'][:4]}-"
            f"{results[-1]['date'][4:]}"
        ),
        "count": len(results),
        "metrics": {
            "total": total,
            "average": round(average, 2),
            "max": maximum,
            "min": minimum
        },
        "trend": trend
    }


def create_openai_client():
    """
    Codyssey OpenAI 호환 API를 사용하기 위한 클라이언트를 생성한다.
    """

    api_key = os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("OPENAI_BASE_URL")

    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY가 설정되지 않았습니다."
        )

    if base_url:
        return OpenAI(
            api_key=api_key,
            base_url=base_url
        )

    return OpenAI(
        api_key=api_key
    )


@router.post("")
def chat(request: ChatRequest):
    """
    Firestore 관광 데이터의 요약 정보를 AI에게 제공하고
    데이터에 근거한 답변을 생성한 후
    대화 내용을 Firestore에 자동 저장한다.
    """

    try:
        # 1. Firestore 관광 데이터 요약
        summary = get_data_summary()

        # 2. 사용할 모델
        model = os.getenv(
            "OPENAI_MODEL",
            "gpt-5-mini"
        )

        # 3. AI 시스템 프롬프트
        system_prompt = f"""
당신은 'Local Guide AI'라는 지역 관광 데이터 분석 비서입니다.

당신의 가장 중요한 역할은 사용자의 질문에 대해
제공된 관광 데이터에 근거해서 정확하게 답변하는 것입니다.

==================================================
[현재 제공된 관광 데이터]
==================================================

데이터 기간:
{summary["period"]}

총 레코드 수:
{summary["count"]}건

총 방문자 수:
{summary["metrics"]["total"]:,}명

평균 방문자 수:
{summary["metrics"]["average"]:,.0f}명

최대 방문자 수:
{summary["metrics"]["max"]:,}명

최소 방문자 수:
{summary["metrics"]["min"]:,}명

최근 관광객 추세:
{summary["trend"]}

==================================================
[매우 중요한 답변 원칙]
==================================================

1. 반드시 위에 제공된 관광 데이터에 근거하여 답변하세요.

2. 제공된 데이터에 존재하지 않는 사실을 만들어내지 마세요.

3. 특히 다음과 같은 정보는 현재 데이터에 없으므로
   사실처럼 단정해서 말하지 마세요.

   - 코로나19 또는 팬데믹
   - 온라인 예약 증가
   - 항공편 변화
   - 교통량 변화
   - 정부 정책 변화
   - 관광 정책
   - 경제 상황
   - 소비 패턴 변화
   - 외국인 관광객 증가 또는 감소
   - 국내 관광객 증가 또는 감소
   - 특정 관광상품의 인기
   - 특정 지역의 관광 원인
   - 날씨나 기후의 영향
   - 축제나 행사 효과
   - 기타 외부 요인

4. 사용자가 감소나 증가의 '원인'을 물어보더라도
   현재 제공된 데이터만으로 원인을 확인할 수 없다면
   "현재 데이터만으로는 원인을 확인할 수 없습니다."
   라고 명확하게 말하세요.

5. 데이터에서 직접 확인할 수 있는 사실과
   AI가 해석한 내용을 구분하세요.

6. 숫자를 제시할 때는 가능한 한 정확한 값을 사용하고
   천 단위 구분기호를 사용하세요.

7. 증감률을 설명할 때는 제공된 증감률 데이터를 기준으로
   설명하세요.

8. 평균, 최대, 최소 등의 통계값을 설명할 때
   해당 값이 무엇을 의미하는지 명확하게 설명하세요.

9. 사용자가 현재 제공된 요약 정보만으로 답하기 어려운
   세부적인 질문을 하면 억지로 답하지 마세요.

   예:
   "충북의 2026년 1월부터 7월까지 월별 추이를 알려줘."

   이런 질문에 필요한 세부 월별 데이터가
   현재 프롬프트에 제공되지 않았다면
   "현재 제공된 요약 정보만으로는 충북의 월별 추이를
   정확하게 확인할 수 없습니다."라고 답하세요.

10. 사용자가 관광 데이터와 관련 없는 질문을 하면
    현재 AI가 제공할 수 있는 범위가 지역 관광 데이터 분석임을
    간단하게 안내하세요.

11. 답변은 한국어로 자연스럽고 이해하기 쉽게 작성하세요.

12. 과도한 추측이나 일반적인 관광 상식을 이용해
    데이터를 설명하지 마세요.

13. 데이터가 부족하면 부족하다고 솔직하게 말하는 것이
    임의의 정보를 만들어내는 것보다 우선합니다.

==================================================
[답변 작성 방식]
==================================================

가능하면 다음 순서로 답변하세요.

① 데이터에서 확인되는 사실

② 데이터에 근거한 간단한 해석

③ 현재 데이터만으로 확인하기 어려운 부분

단, 사용자의 질문이 간단한 경우에는
불필요하게 긴 답변을 만들지 마세요.
"""


        # 4. OpenAI 호환 API 클라이언트 생성
        client = create_openai_client()

        # 5. AI 답변 생성
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": request.question
                }
            ]
        )

        # 6. AI 응답 가져오기
        answer = response.choices[0].message.content

        if not answer:
            answer = (
                "죄송합니다. AI 답변을 생성하지 못했습니다."
            )

        # 7. 대화 메시지 구성
        messages = [
            {
                "role": "user",
                "content": request.question
            },
            {
                "role": "assistant",
                "content": answer
            }
        ]

        # 8. Firestore에 대화 저장
        conversation_data = {
            "question": request.question,
            "answer": answer,
            "messages": messages,
            "summary": summary,
            "created_at": datetime.now().isoformat()
        }

        doc_ref = db.collection(
            "conversations"
        ).add(conversation_data)

        # 9. API 응답
        return {
            "question": request.question,
            "answer": answer,
            "summary": summary,
            "conversation_id": doc_ref[1].id
        }

    except Exception as e:
        print(f"AI chat error: {e}")

        raise HTTPException(
            status_code=500,
            detail=f"AI 답변 생성 중 오류가 발생했습니다: {str(e)}"
        )

