from fastapi import APIRouter, HTTPException, Query

from firebase_config import db
from schemas.data import DataCreate, DataUpdate


router = APIRouter(
    prefix="/api/data",
    tags=["data"]
)


# ========================================
# 증감률 계산
# ========================================

def calculate_change_rate(
    visitor_count: int,
    previous_count: int
) -> float:

    if previous_count == 0:
        return 0.0

    return round(
        (
            (visitor_count - previous_count)
            / previous_count
        ) * 100,
        1
    )


# ========================================
# 데이터 추가
# ========================================

@router.post("")
def create_data(data: DataCreate):
    """
    관광 데이터를 Firestore에 추가한다.

    증감률은 방문자 수와 전년동월 방문자 수를
    이용하여 서버에서 자동 계산한다.
    """

    change_rate = calculate_change_rate(
        data.visitor_count,
        data.previous_count
    )

    save_data = {
        "date": data.date,
        "region": data.region,
        "visitor_count": data.visitor_count,
        "previous_count": data.previous_count,
        "change_rate": change_rate
    }

    doc_ref = db.collection("data").add(
        save_data
    )

    return {
        "message": "데이터가 저장되었습니다.",
        "id": doc_ref[1].id,
        "data": save_data
    }


# ========================================
# 데이터 조회
# ========================================

@router.get("")
def get_data(
    region: str | None = Query(
        default=None,
        description="지역명 (예: 충북)"
    ),
    start_date: str | None = Query(
        default=None,
        min_length=6,
        max_length=6,
        description="조회 시작월 (예: 202601)"
    ),
    end_date: str | None = Query(
        default=None,
        min_length=6,
        max_length=6,
        description="조회 종료월 (예: 202607)"
    )
):
    """
    Firestore의 관광 데이터를 조회한다.

    지역과 기간을 지정하면 해당 조건에 맞는
    데이터만 조회한다.

    최신 데이터가 먼저 표시된다.
    """

    docs = db.collection("data").stream()

    results = []

    for doc in docs:

        data = doc.to_dict()

        # 지역 필터
        if region is not None:
            if data.get("region") != region:
                continue

        # 시작월 필터
        if start_date is not None:
            if data.get("date", "") < start_date:
                continue

        # 종료월 필터
        if end_date is not None:
            if data.get("date", "") > end_date:
                continue

        results.append({
            "id": doc.id,
            **data
        })


    # 최신 날짜 → 오래된 날짜 순
    results.sort(
        key=lambda x: (
            x.get("date", ""),
            x.get("region", "")
        ),
        reverse=True
    )


    return {
        "count": len(results),
        "data": results
    }


# ========================================
# 데이터 수정
# ========================================

@router.put("/{data_id}")
def update_data(
    data_id: str,
    data: DataUpdate
):
    """
    Firestore의 특정 관광 데이터를 수정한다.

    증감률은 수정된 방문자 수와
    전년동월 방문자 수를 이용해 자동 계산한다.
    """

    doc_ref = db.collection(
        "data"
    ).document(data_id)

    doc = doc_ref.get()


    if not doc.exists:

        raise HTTPException(
            status_code=404,
            detail="해당 데이터를 찾을 수 없습니다."
        )


    change_rate = calculate_change_rate(
        data.visitor_count,
        data.previous_count
    )


    updated_data = {
        "date": data.date,
        "region": data.region,
        "visitor_count": data.visitor_count,
        "previous_count": data.previous_count,
        "change_rate": change_rate
    }


    doc_ref.update(
        updated_data
    )


    return {
        "message": "데이터가 수정되었습니다.",
        "id": data_id,
        "data": updated_data
    }


# ========================================
# 데이터 삭제
# ========================================

@router.delete("/{data_id}")
def delete_data(data_id: str):
    """
    Firestore에서 특정 관광 데이터를 삭제한다.
    """

    doc_ref = db.collection(
        "data"
    ).document(data_id)

    doc = doc_ref.get()


    if not doc.exists:

        raise HTTPException(
            status_code=404,
            detail="해당 데이터를 찾을 수 없습니다."
        )


    doc_ref.delete()


    return {
        "message": "데이터가 삭제되었습니다.",
        "id": data_id
    }


# ========================================
# 전체 데이터 삭제
# ========================================

@router.delete("")
def delete_all_data():
    """
    Firestore의 관광 데이터를 전체 삭제한다.

    개발용 데이터 초기화 기능.
    """

    docs = db.collection(
        "data"
    ).stream()

    deleted_count = 0


    for doc in docs:

        doc.reference.delete()

        deleted_count += 1


    return {
        "message": "전체 데이터가 삭제되었습니다.",
        "deleted_count": deleted_count
    }


# ========================================
# 데이터 요약
# ========================================

@router.get("/summary")
def get_data_summary():
    """
    전체 관광 데이터의 요약 정보를 반환한다.

    AI 프롬프트에 주입할 수 있는
    기간, 데이터 개수, 기본 통계, 최근 추세를 제공한다.
    """

    docs = db.collection("data").stream()

    results = []


    for doc in docs:

        data = doc.to_dict()

        visitor_count = data.get(
            "visitor_count"
        )


        if visitor_count is None:
            continue


        results.append({
            "date": str(
                data.get("date", "")
            ),
            "region": data.get("region"),
            "visitor_count": visitor_count,
            "change_rate": data.get(
                "change_rate"
            )
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


    total = sum(
        visitor_counts
    )


    average = (
        total / len(visitor_counts)
    )


    maximum = max(
        visitor_counts
    )


    minimum = min(
        visitor_counts
    )


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

        trend = (
            "유지 "
            "(최근 월 평균 증감률 0.0%)"
        )


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
            "average": round(
                average,
                2
            ),
            "max": maximum,
            "min": minimum
        },
        "trend": trend
    }