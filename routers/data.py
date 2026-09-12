from fastapi import APIRouter, HTTPException, Query
from firebase_config import db
from schemas.data import DataCreate, DataUpdate

router = APIRouter(
    prefix="/api/data",
    tags=["data"]
)


def calculate_change_rate(visitor_count: int, previous_count: int) -> float:
    if previous_count == 0:
        return 0.0
    return round(((visitor_count - previous_count) / previous_count) * 100, 1)


@router.get("/previous")
def get_previous_data(
    date: str = Query(..., min_length=6, max_length=6, description="기준년월 (예: 202608)"),
    region: str = Query(..., description="지역명 (예: 대전)")
):
    try:
        year = int(date[:4])
        month = date[4:]
        previous_date = f"{year - 1}{month}"
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="기준년월 형식이 올바르지 않습니다.")

    docs = db.collection("data").stream()
    for doc in docs:
        data = doc.to_dict()
        if str(data.get("date", "")) == previous_date and data.get("region") == region:
            return {
                "found": True,
                "date": previous_date,
                "region": region,
                "previous_count": data.get("visitor_count")
            }

    return {
        "found": False,
        "date": previous_date,
        "region": region,
        "previous_count": None
    }


@router.get("/summary")
def get_data_summary():
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
        return {"period": None, "count": 0, "metrics": {"total": 0, "average": 0, "max": 0, "min": 0}, "trend": "데이터 없음"}

    results.sort(key=lambda x: (x.get("date", ""), x.get("region", "")))
    visitor_counts = [item["visitor_count"] for item in results]
    total = sum(visitor_counts)
    average = total / len(visitor_counts)
    maximum = max(visitor_counts)
    minimum = min(visitor_counts)

    latest_date = results[-1]["date"]
    latest_data = [item for item in results if item["date"] == latest_date]
    latest_change_rates = [item["change_rate"] for item in latest_data if item["change_rate"] is not None]
    average_change_rate = (sum(latest_change_rates) / len(latest_change_rates)) if latest_change_rates else 0

    if average_change_rate > 0:
        trend = f"상승 (최근 월 평균 증감률 {average_change_rate:.1f}%)"
    elif average_change_rate < 0:
        trend = f"감소 (최근 월 평균 증감률 {average_change_rate:.1f}%)"
    else:
        trend = "유지 (최근 월 평균 증감률 0.0%)"

    return {
        "period": f"{results[0]['date'][:4]}-{results[0]['date'][4:]} ~ {results[-1]['date'][:4]}-{results[-1]['date'][4:]}",
        "count": len(results),
        "metrics": {"total": total, "average": round(average, 2), "max": maximum, "min": minimum},
        "trend": trend
    }


@router.post("")
def create_data(data: DataCreate):
    change_rate = calculate_change_rate(data.visitor_count, data.previous_count)
    save_data = {
        "date": data.date,
        "region": data.region,
        "visitor_count": data.visitor_count,
        "previous_count": data.previous_count,
        "change_rate": change_rate
    }
    doc_ref = db.collection("data").add(save_data)
    return {"message": "데이터가 저장되었습니다.", "id": doc_ref[1].id, "data": save_data}


@router.get("")
def get_data(
    region: str | None = Query(default=None, description="지역명"),
    start_date: str | None = Query(default=None, min_length=6, max_length=6, description="조회 시작월"),
    end_date: str | None = Query(default=None, min_length=6, max_length=6, description="조회 종료월")
):
    docs = db.collection("data").stream()
    results = []
    for doc in docs:
        data = doc.to_dict()
        if region is not None and data.get("region") != region:
            continue
        if start_date is not None and data.get("date", "") < start_date:
            continue
        if end_date is not None and data.get("date", "") > end_date:
            continue
        results.append({"id": doc.id, **data})

    results.sort(key=lambda x: (x.get("date", ""), x.get("region", "")), reverse=True)
    return {"count": len(results), "data": results}


@router.delete("")
def delete_all_data():
    docs = db.collection("data").stream()
    deleted_count = 0
    for doc in docs:
        doc.reference.delete()
        deleted_count += 1
    return {"message": "전체 데이터가 삭제되었습니다.", "deleted_count": deleted_count}


@router.put("/{data_id}")
def update_data(data_id: str, data: DataUpdate):
    doc_ref = db.collection("data").document(data_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="해당 데이터를 찾을 수 없습니다.")

    change_rate = calculate_change_rate(data.visitor_count, data.previous_count)
    updated_data = {
        "date": data.date,
        "region": data.region,
        "visitor_count": data.visitor_count,
        "previous_count": data.previous_count,
        "change_rate": change_rate
    }
    doc_ref.update(updated_data)
    return {"message": "데이터가 수정되었습니다.", "id": data_id, "data": updated_data}


@router.delete("/{data_id}")
def delete_data(data_id: str):
    doc_ref = db.collection("data").document(data_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="해당 데이터를 찾을 수 없습니다.")
    doc_ref.delete()
    return {"message": "데이터가 삭제되었습니다.", "id": data_id}
