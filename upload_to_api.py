import pandas as pd
import requests

# ==========================================
# 설정
# ==========================================

CSV_PATH = "data/지역별_관광현황_2026.csv"

API_URL = "http://127.0.0.1:8000/api/data"


# ==========================================
# CSV 불러오기
# ==========================================

df = pd.read_csv(CSV_PATH)

print("=" * 50)
print("관광 데이터 API 업로드")
print("=" * 50)

print(f"전체 데이터: {len(df)}건")
print(f"지역 수: {df['지역'].nunique()}개")
print(f"기간: {df['기준년월'].min()} ~ {df['기준년월'].max()}")
print()


# ==========================================
# 데이터 확인
# ==========================================

required_columns = [
    "기준년월",
    "지역",
    "방문자수",
    "전년동월방문자수",
    "방문자수증감률"
]

for column in required_columns:
    if column not in df.columns:
        raise ValueError(f"필수 컬럼이 없습니다: {column}")


# ==========================================
# API 업로드
# ==========================================

success = 0
fail = 0
excluded = 0

for _, row in df.iterrows():

    date = str(row["기준년월"])
    region = str(row["지역"])
    visitor_count = int(float(row["방문자수"]))
    previous_count = int(float(row["전년동월방문자수"]))
    change_rate = float(row["방문자수증감률"])

    # 광주·전남 2026년 7월 데이터는
    # 행정구역 개편에 따른 자료 미제공이므로 제외
    if date == "202607" and region in ["광주", "전남"]:
        print(f"[제외] {date} / {region} - 자료 미제공")
        excluded += 1
        continue

    # 새 API 데이터 구조
    payload = {
        "date": date,
        "region": region,
        "visitor_count": visitor_count,
        "previous_count": previous_count,
        "change_rate": change_rate
    }

    try:

        response = requests.post(
            API_URL,
            json=payload,
            timeout=10
        )

        if response.status_code in [200, 201]:

            success += 1

            print(
                f"[성공] {date} | "
                f"{region} | "
                f"{visitor_count:,}명 | "
                f"증감률 {change_rate}%"
            )

        else:

            fail += 1

            print(
                f"[실패] {date} | "
                f"{region} | "
                f"HTTP {response.status_code}"
            )

            print(response.text)

    except requests.RequestException as e:

        fail += 1

        print(
            f"[오류] {date} | "
            f"{region} | {e}"
        )


# ==========================================
# 결과
# ==========================================

print()
print("=" * 50)
print("업로드 결과")
print("=" * 50)

print(f"전체 CSV 데이터 : {len(df)}건")
print(f"성공             : {success}건")
print(f"실패             : {fail}건")
print(f"제외             : {excluded}건")

print("=" * 50)