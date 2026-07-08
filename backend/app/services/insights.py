from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.models.task import Task
from app.models.activity import ActivityLog

def generate_productivity_insights(db: Session) -> List[Dict[str, Any]]:
    insights = []
    now = datetime.utcnow()

    # 1. Deadline Risk Check
    three_days_later = now + timedelta(days=3)
    incomplete_tasks = db.query(Task).filter(
        Task.completed == False,
        Task.deadline != None,
        Task.deadline <= three_days_later
    ).all()

    total_est_duration = sum(t.estimated_duration or 45 for t in incomplete_tasks)
    
    # Calculate available work minutes before the nearest deadline
    if incomplete_tasks:
        nearest_deadline = min(t.deadline for t in incomplete_tasks)
        time_to_deadline = nearest_deadline - now
        
        # Simple estimation: Assume 8 hours of work time per day (480 mins)
        days_remaining = max(0.1, time_to_deadline.total_seconds() / (24 * 3600))
        available_work_minutes = int(days_remaining * 8 * 60)
        
        if total_est_duration > available_work_minutes:
            insights.append({
                "severity": "critical",
                "message": f"Critical: You are at risk of missing deadlines! You have {total_est_duration} mins of work estimated but only {available_work_minutes} mins of focus hours left before the nearest deadline."
            })

    # 2. Work Hour Preferences (Peak Focus)
    # Query all productive activity logs
    productive_logs = db.query(ActivityLog).filter(
        ActivityLog.category == "Productive"
    ).all()

    if productive_logs:
        # Group by hour
        hour_counts = {}
        for log in productive_logs:
            log_hour = log.timestamp.hour
            hour_counts[log_hour] = hour_counts.get(log_hour, 0) + 1
            
        peak_hour = max(hour_counts, key=hour_counts.get)
        
        # Shift hour to local timezone (approximate mock shift to +5:30 if user is IST, or just print relative)
        # For simplicity, print local hour names
        if 5 <= peak_hour < 12:
            insights.append({
                "severity": "success",
                "message": f"Peak focus detected in the morning (around {peak_hour}:00). You complete coding tasks faster during these hours!"
            })
        elif 12 <= peak_hour < 17:
            insights.append({
                "severity": "success",
                "message": f"Peak focus detected in the afternoon (around {peak_hour - 12 if peak_hour > 12 else 12} PM). Schedule your deep design sessions now."
            })
        else:
            insights.append({
                "severity": "success",
                "message": "Your focus is highest in the evening. Protect this block for uninterrupted coding."
            })

    # 3. Distraction Check
    one_day_ago = now - timedelta(hours=24)
    tracked_logs = db.query(ActivityLog).filter(ActivityLog.timestamp >= one_day_ago).all()
    
    productive_count = sum(1 for l in tracked_logs if l.category == "Productive")
    distracting_count = sum(1 for l in tracked_logs if l.category == "Distracting")
    
    if distracting_count > productive_count and distracting_count > 5:
        insights.append({
            "severity": "warning",
            "message": "Distraction Alert: You spent more time on distracting pages than IDE/coding today. Start a Pomodoro block to recover focus."
        })

    # 4. Streak / Task Encouragement
    completed_today = db.query(Task).filter(
        Task.completed == True,
        Task.created_at >= now.replace(hour=0, minute=0, second=0)
    ).count()

    active_tasks_count = db.query(Task).filter(Task.completed == False).count()

    if completed_today >= 3:
        insights.append({
            "severity": "info",
            "message": f"Great progress! You completed {completed_today} tasks today. Your streak is active."
        })
    elif active_tasks_count > 0 and not insights:
        insights.append({
            "severity": "info",
            "message": f"You have {active_tasks_count} active tasks waiting. Focus on the highest priority item first."
        })

    # Default insight if database is empty
    if not insights:
        insights.append({
            "severity": "info",
            "message": "AI is gathering activity patterns. Add tasks and start coding to generate personalized insights."
        })

    return insights
