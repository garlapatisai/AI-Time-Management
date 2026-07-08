from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.core.database import get_db
from app.services.insights import generate_productivity_insights

router = APIRouter()

@router.get("/insights", response_model=List[Dict[str, Any]])
def get_insights(db: Session = Depends(get_db)):
    return generate_productivity_insights(db)
