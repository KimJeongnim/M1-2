# Local Guide AI

지역 관광 데이터를 기반으로 정보를 제공하는 **AI 관광 데이터 비서** 프로젝트입니다.

2023~2025년 지역별 관광 방문자 데이터를 분석하고, 2026년 최신 데이터를 추가하여 Firestore에 저장한 후 FastAPI 기반 API와 AI 채팅 기능을 통해 관광 데이터에 대해 자연어로 질문할 수 있도록 구성했습니다.

---

## 1. 프로젝트 소개

### 프로젝트 목적

관광 데이터를 단순히 표와 그래프로 확인하는 것에서 나아가,

> **"데이터를 직접 조회하지 않아도 AI에게 질문하면 관광 데이터에 대한 답변을 받을 수 있는 서비스"**

를 만드는 것을 목표로 합니다.

사용자는 웹 화면에서 관광 데이터를 관리하고, 저장된 관광 데이터의 요약 정보를 바탕으로 AI에게 자연어 질문을 할 수 있습니다.

### 주요 기능

* 관광 데이터 추가 / 조회 / 수정 / 삭제
* 방문자 수와 전년동월 방문자 수를 이용한 증감률 자동 계산
* 지역 및 기간별 관광 데이터 조회
* 최신 기준년월부터 데이터 정렬
* 관광 데이터 요약 정보 제공
* AI 관광 데이터 질문 및 답변
* 관광 데이터에 근거한 AI 답변 생성
* AI 대화 자동 저장
* 이전 대화 기록 조회
* 특정 대화 불러오기
* 월별 관광객 추이 그래프
* FastAPI Swagger API 문서 제공

---

## 2. 프로젝트 구조

```text
Local Guide AI
│
├─ data/
│  ├─ 지역별_관광현황_2023_2025.csv
│  ├─ 지역별_관광현황_2026.csv
│  └─ 2026/
│
├─ images/
│  ├─ 01_total_trend.png
│  ├─ 02_monthly_seasonality.png
│  ├─ 03_region_change.png
│  ├─ 04_main_region_trend.png
│  ├─ 05_monthly_change_rate.png
│  ├─ 06_holtwinters_forecast.png
│  └─ 07_monthly_vs_quarterly.png
│
├─ frontend/
│  ├─ index.html
│  ├─ style.css
│  └─ script.js
│
├─ routers/
│  ├─ data.py
│  ├─ ai.py
│  ├─ chat.py
│  └─ conversations.py
│
├─ schemas/
│  └─ data.py
│
├─ check_data.py
├─ eda.py
├─ visualize.py
├─ merge_2026.py
├─ tourist_forecast_holtwinter.py
├─ firebase_config.py
├─ main.py
├─ REPORT.md
├─ requirements.txt
└─ README.md
```

---

## 3. 기술 스택

| 구분                  | 기술                                  |
| ------------------- | ----------------------------------- |
| 언어                  | Python                              |
| Backend             | FastAPI                             |
| Database            | Firebase Firestore                  |
| AI                  | Codyssey OpenAI 호환 API / GPT-5 mini |
| AI 보조 분석            | Gemini API                          |
| Data Analysis       | Pandas, NumPy                       |
| Visualization       | Matplotlib, Chart.js                |
| Time Series         | Holt-Winters Exponential Smoothing  |
| Validation          | Pydantic                            |
| Frontend            | HTML, CSS, JavaScript               |
| API Documentation   | Swagger UI                          |
| Backend Deployment  | Render                              |
| Frontend Deployment | Vercel                              |

---

## 4. 데이터

### 데이터 출처

한국관광 데이터랩의 지역별 관광 현황 데이터를 활용했습니다.

분석 대상은 전국 17개 시·도입니다.

주요 변수는 다음과 같습니다.

| 변수       | 설명                 |
| -------- | ------------------ |
| 기준년월     | 관광 방문자 수가 집계된 연월   |
| 지역       | 전국 17개 시·도         |
| 방문자수     | 해당 지역의 관광 방문자 수    |
| 전년동월방문자수 | 전년 같은 달의 관광 방문자 수  |
| 방문자수증감률  | 전년 동월 대비 방문자 수 증감률 |

### 데이터 기간

* 주요 분석 데이터: 2023년 1월 ~ 2025년 12월
* 최신 비교 데이터: 2026년 1월 ~ 2026년 7월

2023~2025년 데이터는 17개 지역 × 36개월 = **612개 관측값**으로 구성되어 있습니다.

2026년 데이터는 17개 지역 × 7개월 = **119개 관측값**입니다.

이 중 광주와 전남의 2026년 7월 데이터는 원본에서 0으로 제공되었으나 실제 방문자 수가 아닌 자료 미제공에 따른 값으로 확인되어 분석 및 AI 데이터 구축 과정에서는 제외했습니다.

따라서 현재 Firestore에 저장된 유효한 관광 데이터는 **117건**입니다.

---

## 5. 데이터 분석

프로젝트의 초기 단계에서는 관광 데이터의 시계열 특성을 분석했습니다.

### 분석 내용

* 전체 관광 방문자 수 장기 추세
* 3개월 이동평균
* 월별 계절성
* 지역별 2023 → 2025 변화율
* 주요 지역별 관광 방문자 추세
* 월별 전년 대비 증감률
* 2026년 1~7월 최신 관광 흐름
* Holt-Winters 기반 관광 방문자 수 예측

### 주요 분석 결과

2023~2025년 전체 관광 방문자 수는 장기적으로 증가하는 흐름을 보였습니다.

월별 평균 방문자 수를 비교한 결과 10월이 가장 높고 2월이 가장 낮은 등 계절성이 확인되었습니다.

지역별로는 17개 지역 중 15개 지역에서 2023년 대비 2025년 평균 방문자 수가 증가했지만, 증가 폭에는 지역별 차이가 나타났습니다.

2026년 1~7월 누적 방문자 수는 2025년 같은 기간보다 약 **0.64% 증가**했지만, 월별로는 증가와 감소가 반복되어 단기적인 변동성도 확인되었습니다.

자세한 분석 결과는 다음 보고서에서 확인할 수 있습니다.

```text
REPORT.md
```

---

## 6. AI 관광 데이터 비서

분석 결과를 단순히 보고서로 제공하는 것에서 발전하여, 저장된 관광 데이터의 요약 정보를 바탕으로 자연어 질문에 답변하는 AI 비서를 구현했습니다.

사용자는 다음과 같은 질문을 입력할 수 있습니다.

```text
현재 관광 데이터의 전체적인 추세를 알려줘
```

또는

```text
현재 저장된 관광 데이터의 평균 방문자 수는 얼마야?
```

AI 채팅 API는 Firestore에 저장된 관광 데이터에서 기간, 레코드 수, 총 방문자 수, 평균 방문자 수, 최대·최소 방문자 수, 최근 증감 추세 등을 계산하여 AI에게 데이터 문맥으로 전달합니다.

### AI 처리 흐름

```text
사용자 질문
     ↓
FastAPI /api/chat
     ↓
Firestore 관광 데이터 조회
     ↓
데이터 요약 생성
     ↓
AI에게 데이터 문맥 전달
     ↓
GPT-5 mini 답변 생성
     ↓
대화 기록 Firestore 저장
     ↓
사용자에게 답변 표시
```

### AI 답변 원칙

AI가 관광 데이터에 없는 내용을 임의로 만들어내지 않도록 시스템 프롬프트에 다음 원칙을 적용했습니다.

* 제공된 관광 데이터를 근거로 답변
* 데이터에 없는 사실을 임의로 생성하지 않음
* 관광객 증가·감소의 원인을 데이터만으로 확인할 수 없는 경우 추측하지 않음
* 데이터로 확인되는 사실과 해석을 구분
* 데이터가 부족한 질문에는 확인할 수 없는 부분을 명확하게 안내

예를 들어 최근 관광객 감소 원인을 질문했을 때, 현재 데이터만으로 원인을 확인할 수 없다면 특정 정책이나 날씨, 교통 등의 요인을 실제 원인이라고 단정하지 않고 **"현재 데이터만으로는 원인을 확인할 수 없습니다."**라고 안내합니다.

### AI API 구성

현재 개발 환경에서는 비용 발생을 방지하기 위해 일반 OpenAI API 대신 **Codyssey의 OpenAI 호환 API**를 사용하고 있습니다.

```text
OpenAI 호환 API
      ↓
GPT-5 mini
      ↓
Local Guide AI 답변 생성
```

또한 `/api/ai/ask`에서는 Gemini API를 활용하여 사용자의 자연어 질문에서 지역 및 기간 등의 검색 조건을 분석하는 기능을 구현했습니다.

---

## 7. 데이터 관리 기능

웹 화면에서 관광 데이터를 직접 관리할 수 있습니다.

### 데이터 추가

입력 항목:

* 기준년월
* 지역
* 방문자 수
* 전년동월 방문자 수

증감률은 사용자가 직접 입력하지 않습니다.

다음 공식으로 서버에서 자동 계산합니다.

```text
증감률(%)
=
(방문자 수 - 전년동월 방문자 수)
÷ 전년동월 방문자 수
× 100
```

예를 들어,

```text
방문자 수 = 12,000,000
전년동월 방문자 수 = 9,500,000
```

이면 자동으로

```text
증감률 = 26.3%
```

으로 계산됩니다.

이를 통해 방문자 수를 수정했을 때 증감률이 잘못된 값으로 남는 문제를 방지했습니다.

### 데이터 조회

다음 조건으로 데이터를 조회할 수 있습니다.

* 전체 데이터
* 지역별 데이터
* 시작월
* 종료월

조회 결과는 최신 기준년월이 먼저 표시되도록 정렬했습니다.

### 데이터 수정

저장된 데이터의 다음 항목을 수정할 수 있습니다.

* 기준년월
* 지역
* 방문자 수
* 전년동월 방문자 수

수정 후 증감률은 다시 자동 계산됩니다.

### 데이터 삭제

개별 데이터를 선택하여 삭제할 수 있습니다.

---

## 8. 관광 데이터 그래프

웹 화면에서는 조회된 관광 데이터를 그래프로 확인할 수 있습니다.

### 월별 관광객 추이

지역 및 기간을 선택한 후 **"그래프로 보기"** 기능을 이용하면 월별 관광 방문자 수 추이를 선 그래프로 확인할 수 있습니다.

그래프는 Chart.js를 사용하여 구현했습니다.

이를 통해 표 형태의 데이터뿐 아니라 시간에 따른 관광객 변화 흐름을 직관적으로 확인할 수 있습니다.

---

## 9. 대화 기록

AI와의 대화 내용은 Firestore에 저장됩니다.

저장되는 주요 정보:

```text
question
answer
messages
summary
created_at
```

웹 화면에서 이전 질문 목록을 확인할 수 있으며, 특정 대화를 선택하면 해당 질문과 AI 답변을 다시 확인할 수 있습니다.

AI 채팅을 통해 생성된 대화도 자동으로 Firestore에 저장되도록 구성했습니다.

---

## 10. Firestore 구조

### `data`

관광 데이터를 저장합니다.

```text
data
 ├─ date
 ├─ region
 ├─ visitor_count
 ├─ previous_count
 └─ change_rate
```

### `conversations`

AI 대화 기록을 저장합니다.

```text
conversations
 ├─ question
 ├─ answer
 ├─ messages
 ├─ summary
 └─ created_at
```

---

## 11. API

### 관광 데이터

| Method | Endpoint            | 기능        |
| ------ | ------------------- | --------- |
| POST   | `/api/data`         | 데이터 추가    |
| GET    | `/api/data`         | 데이터 조회    |
| PUT    | `/api/data/{id}`    | 데이터 수정    |
| DELETE | `/api/data/{id}`    | 개별 데이터 삭제 |
| DELETE | `/api/data`         | 전체 데이터 삭제 |
| GET    | `/api/data/summary` | 데이터 요약    |

### AI

| Method | Endpoint      | 기능                       |
| ------ | ------------- | ------------------------ |
| POST   | `/api/chat`   | 관광 데이터 기반 AI 질문 및 답변     |
| POST   | `/api/ai/ask` | 자연어 질문 분석 및 관광 데이터 필터 추출 |

### 대화 기록

| Method | Endpoint                  | 기능       |
| ------ | ------------------------- | -------- |
| POST   | `/api/conversations`      | 대화 저장    |
| GET    | `/api/conversations`      | 대화 목록 조회 |
| GET    | `/api/conversations/{id}` | 특정 대화 조회 |
| DELETE | `/api/conversations/{id}` | 대화 삭제    |

---

## 12. Swagger UI

FastAPI 실행 후 다음 주소에서 API 문서를 확인할 수 있습니다.

```text
127.0.0.1:8000/docs
```

Swagger UI를 통해 각 API의 요청 및 응답 형식을 직접 확인하고 테스트할 수 있습니다.

---

## 13. 로컬 실행 방법

### 1. 저장소 클론

```bash
git clone <GitHub Repository URL>

cd <project-directory>
```

### 2. 가상환경 생성

```bash
python -m venv .venv
```

### 3. 가상환경 활성화

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

### 4. 라이브러리 설치

```bash
pip install -r requirements.txt
```

### 5. 환경변수 설정

프로젝트 루트에 `.env` 파일을 생성합니다.

```text
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_codyssey_virtual_key
OPENAI_BASE_URL=https://copa.codyssey.kr/v1
OPENAI_MODEL=gpt-5-mini
```

Firebase Firestore 사용을 위한 인증 설정도 필요합니다.

실제 API 키와 Firebase 인증정보는 GitHub에 업로드하지 않습니다.

### 6. FastAPI 실행

```bash
uvicorn main:app --reload
```

실행 후:

```text
127.0.0.1:8000
```

Swagger:

```text
127.0.0.1:8000/docs
```

### 7. 프론트엔드 실행

`frontend/index.html`을 브라우저에서 실행합니다.

프론트엔드는 실행 중인 FastAPI 서버와 통신합니다.

```text
127.0.0.1:8000
```

---

## 14. 분석 코드 실행

관광 데이터 분석에 사용한 Python 파일은 다음과 같이 실행할 수 있습니다.

```bash
python check_data.py

python merge_2026.py

python eda.py

python visualize.py

python tourist_forecast_holtwinter.py
```

2026년 지역별 데이터를 하나의 파일로 통합하려면:

```bash
python merge_2026.py
```

실행 결과:

```text
data/지역별_관광현황_2026.csv
```

---

## 15. 화면

### 관광 데이터 요약

데이터의 분석 기간, 데이터 수, 평균 방문자 수, 최근 추세를 확인할 수 있습니다.

### AI 채팅

관광 데이터에 대해 자연어로 질문하고 AI의 답변을 확인할 수 있습니다.

### 데이터 관리

관광 데이터를 추가, 수정, 삭제하고 지역 및 기간별로 조회할 수 있습니다.

### 그래프

조회한 관광 데이터의 월별 방문자 수 추이를 선 그래프로 확인할 수 있습니다.

### 대화 기록

이전에 AI에게 질문했던 내용과 답변을 다시 확인할 수 있습니다.

> 실제 배포 후 주요 화면 캡처를 추가할 예정입니다.

---

## 16. 배포

### Backend

FastAPI 서버는 Render를 이용하여 배포할 예정입니다.

```text
Backend URL
배포 후 입력
```

배포 시 다음과 같은 환경변수를 Render에 설정합니다.

```text
GEMINI_API_KEY
OPENAI_API_KEY
OPENAI_BASE_URL
OPENAI_MODEL
Firebase 관련 인증 설정
```

### Frontend

HTML/CSS/JavaScript 기반 프론트엔드는 Vercel을 이용하여 배포할 예정입니다.

```text
Frontend URL
배포 후 입력
```

프론트엔드 배포 후에는 API 서버 주소를 배포된 Backend 주소에 맞게 설정합니다.

---

## 17. 프로젝트 발전 방향

현재 프로젝트는 관광 데이터를 조회하고 관리하며, 저장된 데이터의 요약 정보를 바탕으로 자연어 질문에 답변하는 AI 비서의 기본 기능을 구현하는 것을 목표로 했습니다.

향후 다음 기능으로 확장할 수 있습니다.

* 지역별 관광객 비교 기능
* CSV / JSON 데이터 다운로드
* 지역별 관광 수요 예측
* 관광객 증가·감소 원인 분석을 위한 외부 데이터 연동
* 날씨·행사·교통 등 외부 관광 데이터 연동
* 지역별 관광지 추천
* 사용자 질문 기반 맞춤형 관광 정보 제공
* Function Calling을 활용한 실시간 데이터 조회 자동화
* MCP 기반 외부 관광 데이터 연동

---

## 18. AI 활용

본 프로젝트에서는 AI를 개발 과정의 보조 도구로 활용했습니다.

AI의 제안은 그대로 사용하지 않고 실제 코드 실행과 API 테스트, 데이터 검증을 통해 확인한 후 프로젝트에 반영했습니다.

주요 활용 영역:

* 프로젝트 구조 설계
* FastAPI Router / Service 구조 검토
* Pydantic 데이터 검증
* Firestore CRUD 구현
* 관광 데이터 요약 로직 설계
* AI 프롬프트 구조 설계
* HTML/CSS/JavaScript UI 구현 보조
* 오류 원인 분석 및 디버깅
* README 및 프로젝트 문서 작성

분석 과정에서는 Python을 이용하여 데이터 수, 기간, 통계값 및 분석 결과를 직접 검증했습니다.

---

## 19. 프로젝트 문서

시계열 관광 데이터 분석의 상세 내용은 다음 문서에서 확인할 수 있습니다.

```text
REPORT.md
```

REPORT.md에는 다음 내용이 포함되어 있습니다.

* 분석 주제
* 분석 질문
* 데이터 설명
* 데이터 전처리
* 시계열 분석
* 계절성 분석
* 지역별 변화율
* 2026년 비교 분석
* Holt-Winters 예측
* 분석 결과 및 인사이트
* 한계점
* 데이터 출처

---

## 20. 프로젝트 요약

```text
관광 데이터
     ↓
Python 데이터 분석
     ↓
Firestore 저장
     ↓
FastAPI API
     ↓
관광 데이터 요약
     ↓
GPT-5 mini 기반 AI 관광 데이터 비서
     ↓
자연어 질문 / 답변
     ↓
대화 기록 저장
```

**Local Guide AI는 관광 데이터를 단순히 분석하는 것에서 나아가, 사용자가 데이터를 직접 관리하고 저장된 관광 데이터에 대해 자연어로 질문할 수 있는 AI 기반 관광 데이터 비서입니다.**
