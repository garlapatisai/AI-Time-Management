from datetime import datetime, timedelta
from app.core.database import SessionLocal, Base, engine
from app.models.task import Task
from app.models.schedule import ScheduleBlock
from app.models.activity import ActivityLog

def seed_database():
    print("Connecting to database and dropping existing tables for a clean seed...")
    # Recreate tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        
        # 1. Add Mock Tasks
        print("Seeding tasks...")
        tasks = [
            Task(
                title="Study for AI Midterm Exam",
                deadline=now + timedelta(days=5),
                priority=5,
                estimated_duration=180,
                completed=False
            ),
            Task(
                title="Code FastAPI Backend Models",
                deadline=now + timedelta(days=2),
                priority=4,
                estimated_duration=120,
                completed=False
            ),
            Task(
                title="Prepare Final Presentation Slides",
                deadline=now + timedelta(days=3),
                priority=4,
                estimated_duration=90,
                completed=False
            ),
            Task(
                title="Read Transformer PDF Paper",
                deadline=now + timedelta(hours=6),
                priority=3,
                estimated_duration=60,
                completed=False
            ),
            Task(
                title="UI Mockup Design Iteration",
                deadline=now - timedelta(days=1),
                priority=3,
                estimated_duration=90,
                completed=True
            ),
            Task(
                title="Reply to Project Professor",
                deadline=now - timedelta(days=2),
                priority=2,
                estimated_duration=15,
                completed=True
            )
        ]
        db.add_all(tasks)
        db.commit()

        # 2. Add Mock Activity Logs (Last 24 Hours)
        print("Seeding activity logs (productive coding vs distraction window blocks)...")
        logs = []
        
        # Productive coding sessions (VS Code)
        for i in range(40):
            logs.append(ActivityLog(
                app_name="Visual Studio Code",
                window_title="main.py — AI TIME MANAGMENT",
                timestamp=now - timedelta(minutes=i * 5),
                category="Productive"
            ))
            
        # Productive research sessions (Chrome - Stack Overflow)
        for i in range(12):
            logs.append(ActivityLog(
                app_name="Google Chrome",
                window_title="How to solve CP-SAT solver constraint - Stack Overflow",
                timestamp=now - timedelta(hours=2, minutes=i * 5),
                category="Productive"
            ))

        # Distracting sessions (Chrome - YouTube)
        for i in range(15):
            logs.append(ActivityLog(
                app_name="Google Chrome",
                window_title="Lofi hip hop radio - beats to study/relax to - YouTube",
                timestamp=now - timedelta(hours=4, minutes=i * 5),
                category="Distracting"
            ))
            
        # Neutral Finder sessions
        for i in range(5):
            logs.append(ActivityLog(
                app_name="Finder",
                window_title="Documents",
                timestamp=now - timedelta(hours=1, minutes=i * 5),
                category="Neutral"
            ))
            
        db.add_all(logs)
        db.commit()
        
        print("Database seeded successfully with Tasks and Activity Logs!")
        print("Navigate to the browser, go to 'Schedule' and click 'Run OR-Tools Solver' to populate timeline.")
        
    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
