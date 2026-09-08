from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime

from firebase_config import db


router = APIRouter(
    prefix="/api/conversations",
    tags=["conversations"]
)


class ConversationCreate(BaseModel):
    question: str = Field(
        ...,
        min_length=1,
        description="사용자가 AI에게 질문한 내용"
    )

    answer: str = Field(
        ...,
        min_length=1,
        description="AI의 답변"
    )


@router.post("")
def create_conversation(conversation: ConversationCreate):
    """
    AI와의 대화 내용을 Firestore에 저장한다.
    """

    data = {
        "question": conversation.question,
        "answer": conversation.answer,
        "created_at": datetime.now().isoformat()
    }

    doc_ref = db.collection("conversations").add(data)

    return {
        "message": "대화가 저장되었습니다.",
        "id": doc_ref[1].id,
        "conversation": data
    }


@router.get("")
def get_conversations():
    """
    저장된 대화 목록을 조회한다.
    """

    docs = db.collection("conversations").stream()

    results = []

    for doc in docs:
        data = doc.to_dict()

        results.append({
            "id": doc.id,
            **data
        })

    results.sort(
        key=lambda x: x.get("created_at", ""),
        reverse=True
    )

    return {
        "count": len(results),
        "conversations": results
    }


@router.get("/{conversation_id}")
def get_conversation(conversation_id: str):
    """
    특정 대화 내용을 조회한다.
    """

    doc_ref = db.collection("conversations").document(
        conversation_id
    )

    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(
            status_code=404,
            detail="해당 대화를 찾을 수 없습니다."
        )

    return {
        "id": doc.id,
        **doc.to_dict()
    }


@router.delete("/{conversation_id}")
def delete_conversation(conversation_id: str):
    """
    특정 대화를 삭제한다.
    """

    doc_ref = db.collection("conversations").document(
        conversation_id
    )

    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(
            status_code=404,
            detail="해당 대화를 찾을 수 없습니다."
        )

    doc_ref.delete()

    return {
        "message": "대화가 삭제되었습니다.",
        "id": conversation_id
    }