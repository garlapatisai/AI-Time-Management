from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List

from app.core.database import get_db
from app.models.activity import ActivityLog
from app.schemas.activity import ActivityLogCreate, ActivityLogResponse, ActivitySummaryResponse

router = APIRouter()

# Global state for privacy setting
TRACKING_ENABLED = True

@router.get("/activity/settings")
def get_settings():
    return {"tracking_enabled": TRACKING_ENABLED}

@router.post("/activity/settings/toggle")
def toggle_settings():
    global TRACKING_ENABLED
    TRACKING_ENABLED = not TRACKING_ENABLED
    return {"tracking_enabled": TRACKING_ENABLED}

@router.post("/activity/log", response_model=ActivityLogResponse)
def log_activity(activity: ActivityLogCreate, db: Session = Depends(get_db)):
    if not TRACKING_ENABLED:
        raise HTTPException(status_code=403, detail="Tracking is disabled due to privacy settings.")
        
    db_log = ActivityLog(**activity.dict())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

@router.get("/activity/summary", response_model=ActivitySummaryResponse)
def get_activity_summary(db: Session = Depends(get_db)):
    # Fetch logs from the last 24 hours
    one_day_ago = datetime.utcnow() - timedelta(hours=24)
    logs = db.query(ActivityLog).filter(ActivityLog.timestamp >= one_day_ago).all()

    productive_count = 0
    distracting_count = 0
    neutral_count = 0
    
    active_project = "None"
    
    for log in logs:
        if log.category == "Productive":
            productive_count += 1
            if "code" in log.app_name.lower() or "cursor" in log.app_name.lower() or "visual studio code" in log.app_name.lower():
                if log.window_title and " — " in log.window_title:
                    parts = log.window_title.split(" — ")
                    if len(parts) > 1:
                        active_project = parts[-2].strip()  # In VS Code, workspace name is often second to last
        elif log.category == "Distracting":
            distracting_count += 1
        else:
            neutral_count += 1

    # Frequency is every 5 seconds. Count * 5 / 60 = minutes.
    productive_mins = int(productive_count * 5 / 60)
    distracting_mins = int(distracting_count * 5 / 60)
    neutral_mins = int(neutral_count * 5 / 60)

    # Focus Score: Productive ratio
    total_tracked = productive_count + distracting_count
    if total_tracked > 0:
        focus_score = int((productive_count / total_tracked) * 100)
    else:
        focus_score = 100  # Default to 100 if no activity recorded

    return ActivitySummaryResponse(
        productive_minutes=productive_mins,
        distracting_minutes=distracting_mins,
        neutral_minutes=neutral_mins,
        focus_score=focus_score,
        active_project=active_project
    )
