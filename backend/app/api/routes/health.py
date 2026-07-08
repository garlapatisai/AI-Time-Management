from fastapi import APIRouter

router = APIRouter()

@router.get("/health", tags=["Health"])
async def check_health():
    return {"status": "ok", "message": "Backend is running!"}
