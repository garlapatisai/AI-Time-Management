# AI-Powered Adaptive Time Management Assistant
**Final Year Project Prototype**

An intelligent, context-aware productivity assistant that automates schedule planning using machine learning and operations research. The system extracts tasks from PDFs, text, and voice notes using the **Gemini NLP API**, schedules daily calendars using **Google OR-Tools**, and tracks active macOS window telemetry using a background agent.

---

## 🛠️ System Architecture

```
                    ┌──────────────────────────┐
                    │  Voice / PDF / Text NLP  │
                    └─────────────┬────────────┘
                                  │
                                  ▼
                         [ FastAPI Backend ]
                                  │
        ┌─────────────────────────┴─────────────────────────┐
        ▼                                                   ▼
[ SQLite Database ]                                [ OR-Tools Scheduler ]
  (Tasks, Logs, Schedule)                            (CP-SAT Constraint Engine)
        ▲                                                   │
        │                                                   ▼
[ Telemetry Agent ]                                [ Next.js Frontend ]
 (MacOS Window Tracker)                              (Live Timeline / Insights)
```

---

## 📂 Project Structure

```
/backend
├── app/
│   ├── api/routes/        # Routes (Tasks, Schedule, Telemetry, Insights)
│   ├── core/              # Database connection configuration
│   ├── models/            # SQLAlchemy database models
│   ├── schemas/           # Pydantic validation schemas
│   └── services/          # Core solvers (OR-Tools, Gemini API)
├── agent.py               # MacOS AppleScript window tracker daemon
├── seed.py                # Database seeding script for mock demos
└── main.py                # FastAPI app configuration
/frontend
├── src/app/               # Next.js App directory (UI dashboard / timeline)
└── package.json           # Node configuration
```

---

## 🚀 Running the Project

Follow these steps to initialize and start the entire application suite.

### Step 1: Initialize the Database (Seed Mock Data)
Create the local SQLite database and populate it with realistic exam tasks, coding tasks, and productivity logs for your presentation demo:
```bash
cd backend
source venv/bin/activate
python seed.py
```

### Step 2: Start the Backend (FastAPI)
Run the backend web API. It will start uvicorn on port `8000`:
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --port 8000 --reload
```

### Step 3: Start the Frontend (Next.js)
Open a new terminal tab and start the Next.js development server on port `3000`:
```bash
cd frontend
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### Step 4: Start the Telemetry Tracker (macOS Agent)
Open another terminal tab and launch the native activity tracker:
```bash
cd backend
source venv/bin/activate
python agent.py
```
This agent runs in the background and reports what windows you are working in (such as VS Code or Safari) to analyze your focus scores.

---

## 🔑 AI Features Highlighted

1. **Gemini NLP Task Extractor**: Speak task details naturally (e.g. *"I have a project presentation due next Friday"*) or drop a class syllabus PDF. The system automatically computes absolute deadlines, durations, and priorities.
2. **Google OR-Tools CP-SAT Solver**: Solves a complex scheduling model that prevents task overlaps, places rest buffers, and prioritizes urgent items.
3. **Adaptive Rescheduling**: Completing tasks early or running behind shifts all remaining work items in real-time.
4. **Behavioral Insights Engine**: Warns you if you are at risk of missing deadlines (estimated hours left > work hours available) and identifies your peak focus periods.
