import streamlit as st
import requests
import datetime
import pandas as pd
import time

# Set Page Config
st.set_page_config(
    page_title="AI Time Assistant",
    page_icon="⏰",
    layout="wide",
    initial_sidebar_state="expanded"
)

# API Configuration
API_URL = "http://localhost:8000/api"

# Global Styles (Custom Dark Mode CSS)
st.markdown("""
<style>
    /* Global Styles */
    .stApp {
        background-color: #030712;
        color: #ffffff;
    }
    
    /* Card Styles */
    .metric-card {
        background: rgba(17, 24, 39, 0.6);
        border: 1px solid #1f2937;
        border-radius: 20px;
        padding: 20px;
        margin-bottom: 15px;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    
    .metric-value {
        font-size: 2rem;
        font-weight: 800;
        color: #6366f1;
        margin-top: 5px;
    }
    
    /* Title Styles */
    .main-title {
        font-size: 3rem;
        font-weight: 800;
        background: linear-gradient(to right, #60a5fa, #6366f1, #a855f7);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 25px;
        text-align: center;
    }
    
    /* Task Cards */
    .task-card {
        background: rgba(17, 24, 39, 0.4);
        border: 1px solid #374151;
        border-radius: 16px;
        padding: 15px;
        margin-bottom: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.3s;
    }
    .task-card:hover {
        border-color: #4f46e5;
    }
    .task-card-completed {
        background: rgba(17, 24, 39, 0.2);
        border: 1px solid #111827;
        opacity: 0.6;
    }
    
    /* Insights alert styling */
    .insight-box {
        padding: 15px;
        border-radius: 16px;
        margin-bottom: 12px;
        font-size: 0.9rem;
        border-left: 5px solid;
    }
    .insight-critical {
        background-color: rgba(239, 68, 68, 0.1);
        border-color: #ef4444;
        color: #fca5a5;
    }
    .insight-warning {
        background-color: rgba(245, 158, 11, 0.1);
        border-color: #f59e0b;
        color: #fcd34d;
    }
    .insight-success {
        background-color: rgba(16, 185, 129, 0.1);
        border-color: #10b981;
        color: #6ee7b7;
    }
    .insight-info {
        background-color: rgba(99, 102, 241, 0.1);
        border-color: #6366f1;
        color: #a5b4fc;
    }
</style>
""", unsafe_allow_html=True)

# Helper functions to talk to FastAPI backend
def get_tasks():
    try:
        res = requests.get(f"{API_URL}/tasks")
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        st.error(f"Error fetching tasks: {e}")
    return []

def get_schedule():
    try:
        res = requests.get(f"{API_URL}/schedule")
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        st.error(f"Error fetching schedule: {e}")
    return []

def get_insights():
    try:
        res = requests.get(f"{API_URL}/insights")
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        st.error(f"Error fetching insights: {e}")
    return []

def get_activity_summary():
    try:
        res = requests.get(f"{API_URL}/activity/summary")
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        pass
    return {"productive_minutes": 0, "distracting_minutes": 0, "neutral_minutes": 0, "focus_score": 100, "active_project": "None"}

def get_activity_settings():
    try:
        res = requests.get(f"{API_URL}/activity/settings")
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        pass
    return {"tracking_enabled": True}

def toggle_tracking():
    try:
        requests.post(f"{API_URL}/activity/settings/toggle")
    except Exception as e:
        st.error(f"Error toggling tracking: {e}")

# Sidebar - Tracking Status & Pomodoro
with st.sidebar:
    st.markdown("<h2 style='text-align: center;'>⏰ AI Time Assistant</h2>", unsafe_allow_html=True)
    st.write("---")
    
    # 1. Telemetry Privacy Settings
    st.markdown("### Privacy & Tracking")
    settings = get_activity_settings()
    tracking_enabled = settings.get("tracking_enabled", True)
    
    # Custom switch button or status indicator
    if tracking_enabled:
        st.success("Monitoring: ACTIVE")
        if st.button("Pause Tracking Mode"):
            toggle_tracking()
            st.rerun()
    else:
        st.warning("Monitoring: OFF")
        if st.button("Enable Tracking Mode"):
            toggle_tracking()
            st.rerun()
            
    st.write("---")
    
    # 2. Activity Telemetry Stats
    st.markdown("### Telemetry metrics")
    summary = get_activity_summary()
    
    st.markdown(f"""
    <div class="metric-card">
        <div style="font-size:0.8rem; color:#9ca3af; text-transform:uppercase;">Active Project</div>
        <div style="font-size:1.1rem; font-weight:700; color:#e5e7eb;">{summary.get("active_project", "None") if tracking_enabled else "Disabled"}</div>
    </div>
    """, unsafe_allow_html=True)
    
    col_score, col_metrics = st.columns(2)
    with col_score:
        st.markdown(f"""
        <div class="metric-card">
            <div style="font-size:0.7rem; color:#9ca3af; text-transform:uppercase;">Focus Score</div>
            <div class="metric-value">{summary.get("focus_score", 100) if tracking_enabled else "—"}</div>
        </div>
        """, unsafe_allow_html=True)
    with col_metrics:
        prod_min = summary.get("productive_minutes", 0)
        dist_min = summary.get("distracting_minutes", 0)
        st.markdown(f"""
        <div class="metric-card" style="padding:15px;">
            <div style="font-size:0.7rem; color:#9ca3af; text-transform:uppercase;">Minutes</div>
            <div style="font-size:0.8rem; margin-top:5px;">🟢 Prod: <b>{prod_min if tracking_enabled else "—"}m</b></div>
            <div style="font-size:0.8rem;">🔴 Dist: <b>{dist_min if tracking_enabled else "—"}m</b></div>
        </div>
        """, unsafe_allow_html=True)

    # Focus Chart Trend
    if tracking_enabled:
        st.markdown("### Focus Score Trend")
        # Generate clean line chart
        chart_data = pd.DataFrame(
            [45, 80, 95, 30, 85, 90],
            index=["10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM"],
            columns=["Focus Value"]
        )
        st.line_chart(chart_data, height=130)
        
    st.write("---")
    
    # 3. Pomodoro Timer Widget
    st.markdown("### Focus Session")
    
    if "pomo_minutes" not in st.session_state:
        st.session_state.pomo_minutes = 25
        st.session_state.pomo_seconds = 0
        st.session_state.pomo_active = False

    time_str = f"{st.session_state.pomo_minutes:02d}:{st.session_state.pomo_seconds:02d}"
    st.markdown(f"<h1 style='text-align: center; font-family: monospace; font-size:3rem;'>{time_str}</h1>", unsafe_allow_html=True)
    
    col_p1, col_p2 = st.columns(2)
    with col_p1:
        if st.button("Start/Pause Timer", use_container_width=True):
            st.session_state.pomo_active = not st.session_state.pomo_active
            st.rerun()
    with col_p2:
        if st.button("Reset Timer", use_container_width=True):
            st.session_state.pomo_minutes = 25
            st.session_state.pomo_seconds = 0
            st.session_state.pomo_active = False
            st.rerun()

# Tabs on the main view
tab_dashboard, tab_schedule = st.tabs(["📋 Dashboard", "📅 Chronological Schedule"])

# TAB 1: DASHBOARD
with tab_dashboard:
    st.markdown("<h1 class='main-title'>Master Your Time, Effortlessly</h1>", unsafe_allow_html=True)
    
    # AI insights Box
    insights_list = get_insights()
    if insights_list:
        st.write("")
        for insight in insights_list:
            sev = insight["severity"]
            msg = insight["message"]
            alert_class = f"insight-{sev}"
            
            st.markdown(f"""
            <div class="insight-box {alert_class}">
                <b>{"⚠️ Critical Risk" if sev == "critical" else "🔔 Warning" if sev == "warning" else "💡 Peak Period" if sev == "success" else "⚡ Status Update"}</b>: {msg}
            </div>
            """, unsafe_allow_html=True)
            
    # Goal Completion Progress
    all_tasks = get_tasks()
    total_tasks = len(all_tasks)
    completed_tasks = len([t for t in all_tasks if t["completed"]])
    
    if total_tasks > 0:
        pct = completed_tasks / total_tasks
        st.write("")
        st.write(f"**Goal Progress**: {pct:.0%} completed ({completed_tasks}/{total_tasks} tasks)")
        st.progress(pct)
        st.write("")
        
    # Main Dashboard layout split
    col_left, col_right = st.columns([3, 2])
    
    with col_left:
        st.subheader("Recent Tasks")
        
        if not all_tasks:
            st.info("No tasks created yet. Use the NLP creator or manual add box on the right.")
        else:
            for task in reversed(all_tasks[-5:]):
                t_id = task["id"]
                completed = task["completed"]
                title_style = "text-decoration: line-through; color: #6b7280;" if completed else "color: #ffffff;"
                card_style = "task-card task-card-completed" if completed else "task-card"
                
                # Render Row
                col_t1, col_t2, col_t3 = st.columns([1, 10, 2])
                with col_t1:
                    # Toggle completion checkbox
                    if st.checkbox("", value=completed, key=f"check_{t_id}"):
                        if not completed:
                            requests.put(f"{API_URL}/tasks/{t_id}", json={"completed": True})
                            requests.post(f"{API_URL}/schedule/reschedule")
                            st.rerun()
                    else:
                        if completed:
                            requests.put(f"{API_URL}/tasks/{t_id}", json={"completed": False})
                            requests.post(f"{API_URL}/schedule/reschedule")
                            st.rerun()
                            
                with col_t2:
                    st.markdown(f"<span style='{title_style} font-weight:600;'>{task['title']}</span>", unsafe_allow_html=True)
                    if task["deadline"]:
                        dl = datetime.datetime.fromisoformat(task["deadline"])
                        st.markdown(f"<span style='font-size:0.75rem; color:#9ca3af;'>Due: {dl.strftime('%d %b at %I:%M %p')}</span>", unsafe_allow_html=True)
                        
                with col_t3:
                    # Show priority or completed status
                    if completed:
                        st.markdown("<span style='color: #10b981; font-size:0.75rem; font-weight:700;'>Completed</span>", unsafe_allow_html=True)
                    else:
                        st.markdown(f"<span style='background-color:#1e1b4b; color:#818cf8; border: 1px solid #3730a3; padding:2px 8px; border-radius:8px; font-size:0.7rem;'>P{task['priority']} ({task['estimated_duration']}m)</span>", unsafe_allow_html=True)
                    
                    # Delete task
                    if st.button("🗑️", key=f"del_{t_id}"):
                        requests.delete(f"{API_URL}/tasks/{t_id}")
                        requests.post(f"{API_URL}/schedule/reschedule")
                        st.rerun()
                        
    with col_right:
        st.subheader("AI Task Creator")
        
        # 1. Natural Language Form
        with st.form("nlp_form", clear_on_submit=True):
            nl_input = st.text_input("Speak/Type Naturally", placeholder="e.g. syllabus midterm due next Thursday at 3 PM")
            submit_nlp = st.form_submit_button("Extract with AI", use_container_width=True)
            if submit_nlp and nl_input.strip():
                with st.spinner("Processing text..."):
                    requests.post(f"{API_URL}/tasks/extract-text", json={"content": nl_input})
                    requests.post(f"{API_URL}/schedule/generate")
                st.success("NLP Task successfully created!")
                st.rerun()
                
        # 2. PDF Syllabus Upload
        uploaded_file = st.file_uploader("Upload class syllabus (PDF/Text)", type=["pdf", "txt"])
        if uploaded_file is not None:
            if st.button("Parse Syllabus PDF", use_container_width=True):
                with st.spinner("Parsing PDF content..."):
                    files = {"file": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)}
                    requests.post(f"{API_URL}/tasks/extract-file", files=files)
                    requests.post(f"{API_URL}/schedule/generate")
                st.success("Syllabus parsed! Tasks extracted.")
                st.rerun()
                
        # 3. Email Synchronization
        if st.button("Sync Unread Emails", use_container_width=True):
            with st.spinner("Scanning inbox..."):
                requests.post(f"{API_URL}/tasks/sync-emails")
                requests.post(f"{API_URL}/schedule/generate")
            st.success("Academic email sync complete!")
            st.rerun()
            
        st.write("---")
        
        # 4. Manual Task Creation Form
        with st.expander("Add Task Manually"):
            with st.form("manual_form", clear_on_submit=True):
                title = st.text_input("Task Title", required=True)
                deadline_date = st.date_input("Deadline Date", datetime.date.today())
                deadline_time = st.time_input("Deadline Time", datetime.time(17, 0))
                priority = st.slider("Priority Level (1 - 5)", 1, 5, 3)
                duration = st.number_input("Est. Duration (minutes)", min_value=5, value=45)
                
                submit_manual = st.form_submit_button("Add Task", use_container_width=True)
                if submit_manual and title.strip():
                    dt = datetime.datetime.combine(deadline_date, deadline_time).isoformat()
                    payload = {
                        "title": title,
                        "deadline": dt,
                        "priority": priority,
                        "estimated_duration": duration
                    }
                    requests.post(f"{API_URL}/tasks", json=payload)
                    requests.post(f"{API_URL}/schedule/generate")
                    st.success("Manual task successfully added!")
                    st.rerun()

# TAB 2: CHRONOLOGICAL TIMELINE SCHEDULE
with tab_schedule:
    st.subheader("Daily Calendar Schedule Optimization")
    st.write("OR-Tools Constraint Optimization schedules tasks dynamically around boundaries and priority weights.")
    
    col_s1, col_s2, _ = st.columns([1, 1, 3])
    with col_s1:
        if st.button("Optimize Schedule Blocks", use_container_width=True):
            with st.spinner("Solving constraint CP-SAT solver..."):
                requests.post(f"{API_URL}/schedule/generate")
            st.rerun()
    with col_s2:
        if st.button("Dynamic Reschedule", use_container_width=True):
            with st.spinner("Shifting remaining items..."):
                requests.post(f"{API_URL}/schedule/reschedule")
            st.rerun()
            
    # Timeline blocks render
    blocks = get_schedule()
    
    if not blocks:
        st.info("Daily timeline is currently empty. Add tasks and click 'Optimize Schedule Blocks'.")
    else:
        st.write("")
        for idx, block in enumerate(blocks):
            has_task = block["task_id"] is not None
            task_completed = block["task"]["completed"] if (has_task and block["task"]) else False
            
            # Format times
            start_dt = datetime.datetime.fromisoformat(block["start_time"])
            end_dt = datetime.datetime.fromisoformat(block["end_time"])
            time_display = f"{start_dt.strftime('%I:%M %p')} - {end_dt.strftime('%I:%M %p')}"
            
            # Container card styling
            card_class = "task-card task-card-completed" if task_completed else "task-card"
            
            # Display item
            st.markdown(f"""
            <div class="{card_class}">
                <div>
                    <span style="font-weight:700; font-size:1.05rem; {'text-decoration: line-through; color: #6b7280;' if task_completed else 'color: #ffffff;'}">
                        {block['label']}
                    </span>
                    <br/>
                    <span style="font-size:0.75rem; color:#9ca3af;">⏱️ {time_display}</span>
                </div>
                <div>
                    {"<span style='background-color:#065f46; color:#a7f3d0; border: 1px solid #047857; padding:2px 8px; border-radius:8px; font-size:0.7rem;'>COMPLETED</span>" if task_completed 
                      else f"<span style='background-color:#1e1b4b; color:#818cf8; border: 1px solid #3730a3; padding:2px 8px; border-radius:8px; font-size:0.7rem;'>P{block['task']['priority']}</span>" if has_task 
                      else "<span style='background-color:#374151; color:#9ca3af; padding:2px 8px; border-radius:8px; font-size:0.7rem;'>Buffer</span>"}
                </div>
            </div>
            """, unsafe_allow_html=True)
