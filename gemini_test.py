import os

from dotenv import load_dotenv
from google import genai


# .env 파일 불러오기
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY가 설정되지 않았습니다.")


# Gemini 클라이언트 생성
client = genai.Client(
    api_key=api_key
)


# Gemini 테스트
interaction = client.interactions.create(
    model="gemini-3.6-flash",
    input="안녕하세요. 관광 데이터 분석 AI입니다. 한 문장으로 자기소개해주세요."
)


print("=" * 50)
print("Gemini 연결 테스트")
print("=" * 50)

print(interaction.output_text)