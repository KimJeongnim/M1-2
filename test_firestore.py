from firebase_config import db


# 테스트 데이터
test_data = {
    "date": "202607",
    "value": 10235732,
    "memo": "충북 관광객 수 Firestore 연결 테스트"
}


# Firestore에 저장
doc_ref = db.collection("data").add(test_data)

print("저장 성공!")
print(f"문서 ID: {doc_ref[1].id}")


# 저장된 데이터 조회
doc = db.collection("data").document(doc_ref[1].id).get()

if doc.exists:
    print("조회 성공!")
    print(doc.to_dict())
else:
    print("데이터를 찾을 수 없습니다.")