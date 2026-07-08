from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import health, tasks, schedule, activity, insights
from app.core.database import engine, Base

# Import models to register them with Base
from app.models.task import Task
from app.models.schedule import ScheduleBlock
from app.models.activity import ActivityLog

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Time Management Assistant API",
    description="Backend API for the final year project",
    version="1.0.0"
)

# CORS Middleware for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(schedule.router, prefix="/api")
app.include_router(activity.router, prefix="/api")
app.include_router(insights.router, prefix="/api")


