from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ActivityLogCreate(BaseModel):
    app_name: str
    window_title: Optional[str] = None
    category: str  # "Productive", "Neutral", "Distracting"

class ActivityLogResponse(ActivityLogCreate):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class ActivitySummaryResponse(BaseModel):
    productive_minutes: int
    distracting_minutes: int
    neutral_minutes: int
    focus_score: int
    active_project: Optional[str] = "None"
