from fastapi import APIRouter
from app.schemas import HealthResponse
from app.config import settings

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(mock_mode=settings.mock_mode)
