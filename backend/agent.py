import time
import subprocess
import requests

API_URL = "http://localhost:8000/api"

# Basic categorization rules
PRODUCTIVE_APPS = ["code", "cursor", "terminal", "iterm", "xcode", "sublime", "postman"]
PRODUCTIVE_KEYWORDS = ["stack overflow", "github", "leetcode", "documentation", "api", "localhost", ".pdf", "classroom", "jupyter"]
DISTRACTING_APPS = ["youtube", "netflix", "facebook", "instagram", "twitter", "spotify", "slack", "discord"]
DISTRACTING_KEYWORDS = ["youtube.com", "netflix.com", "reddit.com", "facebook.com", "instagram.com"]

def get_active_window_mac():
    """
    Uses AppleScript to get the frontmost application name and window title.
    Only works on macOS.
    """
    applescript = """
    global frontApp, windowTitle
    set windowTitle to ""
    tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
    end tell
    try
        tell application frontApp
            set windowTitle to name of front window
        end tell
    on error
        try
            tell application "System Events"
                tell application process frontApp
                    set windowTitle to name of front window
                end tell
            end tell
        on error
            set windowTitle to ""
        end try
    end try
    return frontApp & "|||" & windowTitle
    """
    try:
        proc = subprocess.Popen(
            ['osascript', '-e', applescript],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, _ = proc.communicate(timeout=2)
        if "|||" in stdout:
            app, title = stdout.strip().split("|||", 1)
            return app, title
    except Exception as e:
        print(f"Error getting window: {e}")
    return "Unknown", "Unknown"

def categorize_activity(app_name: str, window_title: str) -> str:
    app_lower = app_name.lower()
    title_lower = window_title.lower()

    # Check if app name matches distraction list
    for dist in DISTRACTING_APPS:
        if dist in app_lower:
            return "Distracting"
            
    # Check if window title contains distracting websites
    for kw in DISTRACTING_KEYWORDS:
        if kw in title_lower:
            return "Distracting"

    # Check if app name matches productive list
    for prod in PRODUCTIVE_APPS:
        if prod in app_lower:
            return "Productive"

    # Check if window title matches productive keywords
    for kw in PRODUCTIVE_KEYWORDS:
        if kw in title_lower:
            return "Productive"

    return "Neutral"

def main():
    print("MacOS Digital Activity Tracking Agent started.")
    print("Posting active window titles to FastAPI backend every 5 seconds...")
    
    while True:
        try:
            # 1. Check if tracking is permitted by backend
            # For simplicity, we directly post. The backend logs it if opt-in is active.
            app_name, window_title = get_active_window_mac()
            category = categorize_activity(app_name, window_title)
            
            payload = {
                "app_name": app_name,
                "window_title": window_title,
                "category": category
            }
            
            response = requests.post(f"{API_URL}/activity/log", json=payload)
            if response.status_code == 200:
                print(f"Logged: [{category}] {app_name} - {window_title[:30]}...")
            else:
                print("Failed to post log. Tracking might be disabled.")
        except requests.exceptions.ConnectionError:
            print("Backend disconnected. Retrying in 10s...")
            time.sleep(10)
            continue
        except Exception as e:
            print(f"Agent error: {e}")
            
        time.sleep(5)

if __name__ == "__main__":
    main()
