import os
import json
from datetime import datetime, timedelta
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    # Using Gemini 1.5 Flash for fast extraction
    model = genai.GenerativeModel('gemini-1.5-flash')
else:
    model = None

# Helper prompt for task extraction
SYSTEM_PROMPT = """
You are an AI Time Management Assistant. Your task is to analyze the provided input (which may be text, note transcripts, email transcripts, or syllabus lists) and extract a list of actionable tasks.

For each task, you MUST extract:
1. "title": A clear, concise, actionable task name.
2. "deadline": An absolute deadline in ISO 8601 format (YYYY-MM-DDTHH:MM:SS). If the input mentions a relative deadline (e.g., "next Friday" or "tomorrow"), calculate it relative to the current date/time provided. If no deadline is mentioned, return null.
3. "priority": An integer between 1 and 5 (1 = very low, 3 = normal, 5 = critical/urgent). Estimate this based on the language.
4. "estimated_duration": The estimated time in minutes to complete the task. Default to 45 minutes if not specified.

You MUST respond ONLY with a raw JSON array of objects, like this:
[
  {
    "title": "Solve AI Assignment 1",
    "deadline": "2026-07-15T18:00:00",
    "priority": 4,
    "estimated_duration": 90
  }
]
Do not wrap it in markdown code blocks like ```json. Return raw text representing the valid JSON array.
"""

def extract_tasks_from_text(text: str) -> list:
    current_time_str = datetime.now().isoformat()
    prompt = f"Current Time: {current_time_str}\n\nInput Content:\n{text}\n\nExtract the tasks now:"
    
    if not api_key or not model:
        # Robust Mock Fallback
        return get_mock_tasks(text)
        
    try:
        response = model.generate_content([SYSTEM_PROMPT, prompt])
        response_text = response.text.strip()
        # Clean markdown wrappers if any
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        tasks_data = json.loads(response_text)
        return tasks_data
    except Exception as e:
        print(f"Gemini API error, falling back to mock: {e}")
        return get_mock_tasks(text)

def get_mock_tasks(text: str) -> list:
    """Smarter rule-based task extractor when API Key is missing"""
    tasks = []
    import re
    
    # Split text into lines/sentences
    lines = [line.strip() for line in re.split(r'[\n\.]', text) if len(line.strip()) > 8]
    
    keywords = ["due", "deadline", "submit", "exam", "quiz", "test", "project", "assignment", "read", "study", "homework", "meet", "schedule", "review", "discuss", "guidelines", "reminder"]
    
    for line in lines:
        line_lower = line.lower()
        if any(kw in line_lower for kw in keywords):
            # Clean title
            title = line.strip()
            if len(title) > 60:
                title = title[:57] + "..."
                
            # Exclude lines that are headers
            if title.lower().startswith(("from:", "subject:", "to:")):
                continue
                
            # Deadline estimation
            days_offset = 2
            if "tomorrow" in line_lower:
                days_offset = 1
            elif "next week" in line_lower:
                days_offset = 7
            elif "friday" in line_lower:
                today_wd = datetime.now().weekday()
                days_offset = (4 - today_wd) % 7
                if days_offset == 0:
                    days_offset = 7
            elif "thursday" in line_lower:
                today_wd = datetime.now().weekday()
                days_offset = (3 - today_wd) % 7
                if days_offset == 0:
                    days_offset = 7
            elif "monday" in line_lower:
                today_wd = datetime.now().weekday()
                days_offset = (0 - today_wd) % 7
                if days_offset == 0:
                    days_offset = 7
                    
            deadline = (datetime.now() + timedelta(days=days_offset)).replace(hour=17, minute=0, second=0).isoformat()
            
            # Priority estimation
            priority = 3
            if any(x in line_lower for x in ["exam", "midterm", "final", "quiz", "test"]):
                priority = 5
            elif any(x in line_lower for x in ["assignment", "project", "homework", "submit"]):
                priority = 4
                
            # Duration estimation
            duration = 60
            if "2 hours" in line_lower or "120 mins" in line_lower or "120 minutes" in line_lower:
                duration = 120
            elif "3 hours" in line_lower or "180 mins" in line_lower:
                duration = 180
            elif "30 mins" in line_lower or "30 minutes" in line_lower:
                duration = 30
                
            tasks.append({
                "title": title,
                "deadline": deadline,
                "priority": priority,
                "estimated_duration": duration
            })
            
            if len(tasks) >= 4:
                break
                
    # Default fallback if nothing matches
    if not tasks:
        tasks.append({
            "title": f"Review PDF: {text[:30]}...",
            "deadline": (datetime.now() + timedelta(days=2)).isoformat(),
            "priority": 3,
            "estimated_duration": 45
        })
        
    return tasks
