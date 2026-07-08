from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class TaskBase(BaseModel):
    title: str
    deadline: Optional[datetime] = None
    priority: Optional[int] = 3
    estimated_duration: Optional[int] = 30

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    completed: Optional[bool] = None
    title: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Optional[int] = None
    estimated_duration: Optional[int] = None

class TaskResponse(TaskBase):
    id: int
    completed: bool
    created_at: datetime

    class Config:
        from_attributes = True
