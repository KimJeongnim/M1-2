from pydantic import BaseModel, Field


class DataCreate(BaseModel):
    date: str = Field(
        ...,
        min_length=6,
        max_length=6,
        description="기준년월 (예: 202607)"
    )

    region: str = Field(
        ...,
        description="지역명 (예: 충북)"
    )

    visitor_count: int = Field(
        ...,
        ge=0,
        description="방문자 수"
    )

    previous_count: int = Field(
        ...,
        ge=0,
        description="전년동월 방문자 수"
    )

    # 기존 데이터 업로드와의 호환을 위해 받을 수는 있지만
    # 실제 저장값은 서버에서 자동 계산한다.
    change_rate: float | None = Field(
        default=None,
        description="증감률 (%) - 서버에서 자동 계산"
    )


class DataUpdate(BaseModel):
    date: str = Field(
        ...,
        min_length=6,
        max_length=6,
        description="기준년월 (예: 202607)"
    )

    region: str = Field(
        ...,
        description="지역명 (예: 충북)"
    )

    visitor_count: int = Field(
        ...,
        ge=0,
        description="방문자 수"
    )

    previous_count: int = Field(
        ...,
        ge=0,
        description="전년동월 방문자 수"
    )

    # 수정 시에도 서버에서 자동 계산한다.
    change_rate: float | None = Field(
        default=None,
        description="증감률 (%) - 서버에서 자동 계산"
    )