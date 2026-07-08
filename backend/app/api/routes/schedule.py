from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.models.task import Task
from app.models.schedule import ScheduleBlock
from app.schemas.schedule import ScheduleBlockResponse
from app.services.scheduling import generate_daily_schedule

router = APIRouter()

@router.get("/schedule", response_model=List[ScheduleBlockResponse])
def get_schedule(db: Session = Depends(get_db)):
    # Retrieve all blocks, sorted chronologically
    return db.query(ScheduleBlock).order_by(ScheduleBlock.start_time).all()

@router.post("/schedule/generate", response_model=List[ScheduleBlockResponse])
def generate_schedule(db: Session = Depends(get_db)):
    # 1. Clear existing schedule blocks
    db.query(ScheduleBlock).delete()
    db.commit()
    
    # 2. Get all incomplete tasks
    tasks = db.query(Task).filter(Task.completed == False).all()
    if not tasks:
        return []
        
    # 3. Solve and generate blocks
    blocks = generate_daily_schedule(tasks)
    
    # 4. Save to DB
    for block in blocks:
        db.add(block)
    db.commit()
    
    # Refresh to load relationships (tasks)
    for block in blocks:
        db.refresh(block)
        
    return blocks

@router.post("/schedule/reschedule", response_model=List[ScheduleBlockResponse])
def reschedule_remaining(db: Session = Depends(get_db)):
    # 1. Clear uncompleted schedule blocks from 'now' onwards
    now = datetime.now()
    db.query(ScheduleBlock).filter(ScheduleBlock.end_time > now).delete()
    db.commit()
    
    # 2. Get all incomplete tasks
    tasks = db.query(Task).filter(Task.completed == False).all()
    if not tasks:
        return db.query(ScheduleBlock).order_by(ScheduleBlock.start_time).all()
        
    # 3. Generate remaining schedule starting from now
    blocks = generate_daily_schedule(tasks, start_from=now)
    
    # 4. Save to DB
    for block in blocks:
        db.add(block)
    db.commit()
    
    for block in blocks:
        db.refresh(block)
        
    return db.query(ScheduleBlock).order_by(ScheduleBlock.start_time).all()
