from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.core.database import Base

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    app_name = Column(String, index=True, nullable=False)
    window_title = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    category = Column(String, nullable=False)  # "Productive", "Neutral", "Distracting"
