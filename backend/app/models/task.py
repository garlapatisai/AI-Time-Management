from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from app.core.database import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    deadline = Column(DateTime, nullable=True)
    priority = Column(Integer, default=3)  # Scale of 1-5
    estimated_duration = Column(Integer, default=30)  # In minutes
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
