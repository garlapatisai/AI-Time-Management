from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.schemas.task import TaskResponse

class ScheduleBlockBase(BaseModel):
    task_id: Optional[int] = None
    start_time: datetime
    end_time: datetime
    is_completed: bool
    label: Optional[str] = "Work"

class ScheduleBlockCreate(ScheduleBlockBase):
    pass

class ScheduleBlockResponse(ScheduleBlockBase):
    id: int
    task: Optional[TaskResponse] = None

    class Config:
        from_attributes = True
