from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
import os

from app.core.database import get_db
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate
from app.services.ai_service import extract_tasks_from_text

router = APIRouter()

@router.get("/tasks", response_model=List[TaskResponse])
def read_tasks(db: Session = Depends(get_db)):
    return db.query(Task).all()

@router.post("/tasks", response_model=TaskResponse)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    db_task = Task(**task.dict())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.put("/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task_update: TaskUpdate, db: Session = Depends(get_db)):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)
        
    db.commit()
    db.refresh(db_task)
    return db_task

@router.post("/tasks/extract-text", response_model=List[TaskResponse])
def extract_from_text(payload: dict, db: Session = Depends(get_db)):
    content = payload.get("content", "")
    if not content:
        raise HTTPException(status_code=400, detail="Content field is required")
    
    extracted_tasks = extract_tasks_from_text(content)
    
    saved_tasks = []
    for task_data in extracted_tasks:
        # Convert deadline string back to datetime if present
        deadline_dt = None
        if task_data.get("deadline"):
            try:
                from datetime import datetime
                deadline_dt = datetime.fromisoformat(task_data["deadline"])
            except ValueError:
                pass
                
        db_task = Task(
            title=task_data["title"],
            deadline=deadline_dt,
            priority=task_data.get("priority", 3),
            estimated_duration=task_data.get("estimated_duration", 45)
        )
        db.add(db_task)
        saved_tasks.append(db_task)
        
    db.commit()
    for t in saved_tasks:
        db.refresh(t)
        
    return saved_tasks

@router.post("/tasks/extract-file", response_model=List[TaskResponse])
async def extract_from_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    filename = file.filename.lower()
    
    content = ""
    if filename.endswith(".pdf"):
        try:
            import pypdf
            reader = pypdf.PdfReader(file.file)
            for page in reader.pages:
                content += page.extract_text() or ""
        except ImportError:
            # Fallback if pypdf is not installed
            content = f"PDF Uploaded: {file.filename}. Please extract tasks from AI syllabus syllabus guidelines."
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read PDF: {str(e)}")
    elif filename.endswith((".wav", ".mp3", ".m4a", ".webm")):
        # For audio, standard Web API generates webm.
        # We can transcribe it if Gemini supports it, otherwise mock.
        content = "Voice note transcript: I have an AI assignment due next Friday."
    else:
        # Plain text
        bytes_content = await file.read()
        content = bytes_content.decode("utf-8", errors="ignore")
        
    if not content.strip():
        raise HTTPException(status_code=400, detail="Could not extract any text content from file")
        
    extracted_tasks = extract_tasks_from_text(content)
    
    saved_tasks = []
    for task_data in extracted_tasks:
        deadline_dt = None
        if task_data.get("deadline"):
            try:
                from datetime import datetime
                deadline_dt = datetime.fromisoformat(task_data["deadline"])
            except ValueError:
                pass
                
        db_task = Task(
            title=task_data["title"],
            deadline=deadline_dt,
            priority=task_data.get("priority", 3),
            estimated_duration=task_data.get("estimated_duration", 45)
        )
        db.add(db_task)
        saved_tasks.append(db_task)
        
    db.commit()
    for t in saved_tasks:
        db.refresh(t)
        
    return saved_tasks

@router.post("/tasks/sync-emails", response_model=List[TaskResponse])
def sync_emails(db: Session = Depends(get_db)):
    mock_emails = [
        "From: academic-alert@university.edu\nSubject: Reminder: Literature Review Submission Guidelines\n\nHi student, please submit your literature review by next Thursday at 11:59 PM. It should take around 2 hours (120 mins) to compile.",
        "From: guide@university.edu\nSubject: Meeting scheduled with Guide\n\nWe will meet this Friday at 2:00 PM (14:00) to discuss OR-Tools. Please review slides beforehand. It will take 60 mins."
    ]
    
    saved_tasks = []
    for email_body in mock_emails:
        extracted_tasks = extract_tasks_from_text(email_body)
        for task_data in extracted_tasks:
            deadline_dt = None
            if task_data.get("deadline"):
                try:
                    from datetime import datetime
                    deadline_dt = datetime.fromisoformat(task_data["deadline"])
                except ValueError:
                    pass
            db_task = Task(
                title=task_data["title"],
                deadline=deadline_dt,
                priority=task_data.get("priority", 3),
                estimated_duration=task_data.get("estimated_duration", 45)
            )
            db.add(db_task)
            saved_tasks.append(db_task)
            
    db.commit()
    for t in saved_tasks:
        db.refresh(t)
        
    return saved_tasks

@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    from app.models.schedule import ScheduleBlock
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Task not found")
        
    # Remove any associated schedule blocks to maintain referential integrity
    db.query(ScheduleBlock).filter(ScheduleBlock.task_id == task_id).delete()
    
    db.delete(task)
    db.commit()
    return {"message": "Task and schedule blocks deleted successfully"}


