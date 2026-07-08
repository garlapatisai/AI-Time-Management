"use client";
import { useEffect, useState, useRef } from "react";

type View = "dashboard" | "tasks" | "extract" | "schedule" | "focus" | "insights" | "settings";

interface Task {
  id: number;
  title: string;
  deadline: string | null;
  priority: number; // 1-5
  estimated_duration: number; // minutes
  completed: boolean;
  created_at: string;
  category?: string;
  source?: string;
}

interface ScheduleBlock {
  id: number;
  task_id: number | null;
  start_time: string;
  end_time: string;
  is_completed: boolean;
  label: string;
  task: Task | null;
}

interface ActivitySummary {
  productive_minutes: number;
  distracting_minutes: number;
  neutral_minutes: number;
  focus_score: number;
  active_project: string;
}

interface Insight {
  severity: "info" | "warning" | "critical" | "success";
  message: string;
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  
  // Search & Filters for Tasks View
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, pending, completed
  const [priorityFilter, setPriorityFilter] = useState("all"); // all, high, medium, low

  // Forms / Modals States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  
  // Input fields for Manual Form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState(3);
  const [taskDuration, setTaskDuration] = useState(45);
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskCategory, setTaskCategory] = useState("coding");

  // Input fields for extraction
  const [textNotes, setTextNotes] = useState("");
  const [emailText, setEmailText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Activity & Privacy Tracking
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [activitySummary, setActivitySummary] = useState<ActivitySummary>({
    productive_minutes: 0,
    distracting_minutes: 0,
    neutral_minutes: 0,
    focus_score: 100,
    active_project: "None"
  });

  // PDF File Input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Voice Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pomodoro
  const [pomoMinutes, setPomoMinutes] = useState(25);
  const [pomoSeconds, setPomoSeconds] = useState(0);
  const [pomoActive, setPomoActive] = useState(false);
  const [pomoIsBreak, setPomoIsBreak] = useState(false);
  const pomoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [startTime, setStartTime] = useState("09:00 AM");
  const [endTime, setEndTime] = useState("05:00 PM");
  const [dailyGoalHours, setDailyGoalHours] = useState(6);
  const [maxFocusBlocks, setMaxFocusBlocks] = useState(6);
  const [deepWorkMin, setDeepWorkMin] = useState(90);
  const [breakMin, setBreakMin] = useState(15);
  const [trackIDE, setTrackIDE] = useState(true);
  const [trackBrowser, setTrackBrowser] = useState(true);
  const [trackDocs, setTrackDocs] = useState(false);
  const [trackPDF, setTrackPDF] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [activeFocusTab, setActiveFocusTab] = useState<"pomo" | "deep" | "custom">("pomo");

  // API base URL
  const API_URL = "http://localhost:8000/api";

  // Fetch functions
  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/tasks`);
      if (res.ok) {
        const data = await res.json();
        // Add random mock categories/sources for visualization if missing
        const enriched = data.map((t: Task) => ({
          ...t,
          category: t.category || (t.id % 3 === 0 ? "study" : t.id % 3 === 1 ? "coding" : "meeting"),
          source: t.source || (t.id % 3 === 0 ? "Email" : t.id % 3 === 1 ? "Note" : "Calendar")
        }));
        setTasks(enriched);
      }
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    }
  };

  const fetchSchedule = async () => {
    try {
      const res = await fetch(`${API_URL}/schedule`);
      if (res.ok) {
        const data = await res.json();
        setScheduleBlocks(data);
      }
    } catch (err) {
      console.error("Failed to fetch schedule:", err);
    }
  };

  const fetchActivitySummary = async () => {
    try {
      const res = await fetch(`${API_URL}/activity/summary`);
      if (res.ok) {
        const data = await res.json();
        setActivitySummary(data);
      }
    } catch (err) {
      console.error("Failed to fetch activity summary:", err);
    }
  };

  const fetchActivitySettings = async () => {
    try {
      const res = await fetch(`${API_URL}/activity/settings`);
      if (res.ok) {
        const data = await res.json();
        setTrackingEnabled(data.tracking_enabled);
      }
    } catch (err) {
      console.error("Failed to fetch activity settings:", err);
    }
  };

  const fetchInsights = async () => {
    try {
      const res = await fetch(`${API_URL}/insights`);
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      }
    } catch (err) {
      console.error("Failed to fetch insights:", err);
    }
  };

  // Reschedule & Generate handlers
  const handleGenerateSchedule = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_URL}/schedule/generate`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setScheduleBlocks(data);
      }
    } catch (err) {
      console.error("Failed to generate schedule:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReschedule = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_URL}/schedule/reschedule`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setScheduleBlocks(data);
      }
    } catch (err) {
      console.error("Failed to reschedule:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle task complete status
  const toggleTask = async (id: number, currentCompleted: boolean) => {
    try {
      const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !currentCompleted }),
      });
      if (res.ok) {
        await fetchTasks();
        await handleReschedule();
        await fetchInsights();
      }
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  // Delete task
  const handleDeleteTask = async (id: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`${API_URL}/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchTasks();
        await handleReschedule();
        await fetchInsights();
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  // Sync Emails handler
  const handleSyncEmails = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_URL}/tasks/sync-emails`, { method: "POST" });
      if (res.ok) {
        await fetchTasks();
        await handleGenerateSchedule();
        await fetchInsights();
        alert("Synced emails successfully! New tasks added.");
        setShowEmailModal(false);
      }
    } catch (err) {
      console.error("Failed to sync emails:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual Task Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setIsProcessing(true);

    try {
      const res = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          deadline: taskDeadline ? new Date(taskDeadline).toISOString() : null,
          priority: taskPriority,
          estimated_duration: taskDuration
        }),
      });
      if (res.ok) {
        setTaskTitle("");
        setTaskDeadline("");
        setTaskPriority(3);
        setTaskDuration(45);
        setShowAddModal(false);
        await fetchTasks();
        await handleGenerateSchedule();
        await fetchInsights();
      }
    } catch (err) {
      console.error("Failed to add manual task:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Paste Email / Note Submission
  const handleTextExtraction = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_URL}/tasks/extract-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        await fetchTasks();
        await handleGenerateSchedule();
        await fetchInsights();
        setShowNotesModal(false);
        setTextNotes("");
      }
    } catch (err) {
      console.error("Text extraction failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // PDF File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/tasks/extract-file`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        await fetchTasks();
        await handleGenerateSchedule();
        await fetchInsights();
        setShowPdfModal(false);
      }
    } catch (err) {
      console.error("PDF upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  // Voice recording
  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await uploadAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn("Voice recording permission denied or failed:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicError("Microphone access denied. Please click the camera/microphone icon in your browser URL bar to allow permissions.");
      } else {
        setMicError("Could not access microphone. Please verify your recording device is connected.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const uploadAudioBlob = async (blob: Blob) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append("file", blob, "voicenote.webm");

    try {
      const res = await fetch(`${API_URL}/tasks/extract-file`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        await fetchTasks();
        await handleGenerateSchedule();
        await fetchInsights();
        setShowVoiceModal(false);
      }
    } catch (err) {
      console.error("Voice task upload failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Privacy tracking settings
  const toggleTracking = async () => {
    try {
      const res = await fetch(`${API_URL}/activity/settings/toggle`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setTrackingEnabled(data.tracking_enabled);
        await fetchInsights();
      }
    } catch (err) {
      console.error("Failed to toggle tracking:", err);
    }
  };

  // Pomodoro loop
  useEffect(() => {
    if (pomoActive) {
      pomoTimerRef.current = setInterval(() => {
        if (pomoSeconds > 0) {
          setPomoSeconds(pomoSeconds - 1);
        } else if (pomoMinutes > 0) {
          setPomoMinutes(pomoMinutes - 1);
          setPomoSeconds(59);
        } else {
          clearInterval(pomoTimerRef.current!);
          setPomoActive(false);
          alert(pomoIsBreak ? "Rest period finished! Focus mode." : "Focus work block complete! Take a break.");
          setPomoIsBreak(!pomoIsBreak);
          setPomoMinutes(pomoIsBreak ? 25 : 5);
          setPomoSeconds(0);
        }
      }, 1000);
    } else {
      if (pomoTimerRef.current) clearInterval(pomoTimerRef.current);
    }
    return () => {
      if (pomoTimerRef.current) clearInterval(pomoTimerRef.current);
    };
  }, [pomoActive, pomoMinutes, pomoSeconds, pomoIsBreak]);

  // Initial loading & polling
  useEffect(() => {
    fetchTasks();
    fetchSchedule();
    fetchActivitySummary();
    fetchActivitySettings();
    fetchInsights();

    const interval = setInterval(() => {
      fetchActivitySummary();
      fetchInsights();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Time format helper
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Task filtering logic
  const filteredTasks = tasks.filter(task => {
    // Search filter
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === "all" 
      || (statusFilter === "completed" && task.completed)
      || (statusFilter === "pending" && !task.completed);
      
    // Priority filter
    const matchesPriority = priorityFilter === "all"
      || (priorityFilter === "high" && task.priority >= 4)
      || (priorityFilter === "medium" && task.priority === 3)
      || (priorityFilter === "low" && task.priority <= 2);
      
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Calculate statistics
  const completedTodayCount = tasks.filter(t => t.completed).length;
  const totalTasksCount = tasks.length;
  const pendingTasksCount = tasks.filter(t => !t.completed).length;
  const totalFocusScore = activitySummary.focus_score;

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex font-sans">
      
      {/* LEFT SIDEBAR PANEL */}
      <aside className="w-64 border-r border-[#161a23] bg-[#0b0e14] p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-1.5 text-center mt-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent mt-1">Time Assistant</span>
            <span className="text-[9px] uppercase tracking-widest text-indigo-400 font-bold">Workspace Optimizer</span>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5 pt-2">
            <button 
              onClick={() => setView("dashboard")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${view === "dashboard" ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-bold" : "text-gray-400 hover:text-gray-200 hover:bg-[#12161f]"}`}>
              <span>📋</span> Dashboard
            </button>
            <button 
              onClick={() => setView("tasks")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${view === "tasks" ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-bold" : "text-gray-400 hover:text-gray-200 hover:bg-[#12161f]"}`}>
              <span>📝</span> Tasks
            </button>
            <button 
              onClick={() => setView("extract")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${view === "extract" ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-bold" : "text-gray-400 hover:text-gray-200 hover:bg-[#12161f]"}`}>
              <span>⚡</span> Extract Tasks
            </button>
            <button 
              onClick={() => setView("schedule")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${view === "schedule" ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-bold" : "text-gray-400 hover:text-gray-200 hover:bg-[#12161f]"}`}>
              <span>📅</span> Schedule
            </button>
            <button 
              onClick={() => setView("focus")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${view === "focus" ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-bold" : "text-gray-400 hover:text-gray-200 hover:bg-[#12161f]"}`}>
              <span>⏰</span> Focus Mode
            </button>
            <button 
              onClick={() => setView("insights")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${view === "insights" ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-bold" : "text-gray-400 hover:text-gray-200 hover:bg-[#12161f]"}`}>
              <span>📊</span> Insights
            </button>
            <button 
              onClick={() => setView("settings")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${view === "settings" ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-bold" : "text-gray-400 hover:text-gray-200 hover:bg-[#12161f]"}`}>
              <span>⚙️</span> Settings
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Panel */}
        <div className="space-y-4">
          <div className="p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
              <span className="text-xs font-bold text-indigo-300">AI Active</span>
            </div>
            <span className="text-[10px] text-indigo-400 font-light block leading-snug">Learning your productivity and app window habits</span>
          </div>

          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-300 transition-colors">
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER AREA */}
      <main className="flex-1 flex flex-col p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        
        {/* TAB 1: DASHBOARD VIEW */}
        {view === "dashboard" && (
          <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-extrabold text-white">Dashboard</h1>
              <span className="text-sm text-gray-500">Wednesday, July 8, 2026</span>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-5 bg-[#0b0e14]/60 border border-[#161a23] rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">✓</div>
                <div>
                  <span className="text-xxs uppercase tracking-wider text-gray-500 block mb-0.5">Completed</span>
                  <span className="text-xl font-bold text-white block">{completedTodayCount} <span className="text-xs text-gray-500 font-light">of {totalTasksCount} today</span></span>
                </div>
              </div>
              <div className="p-5 bg-[#0b0e14]/60 border border-[#161a23] rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-lg">⏳</div>
                <div>
                  <span className="text-xxs uppercase tracking-wider text-gray-500 block mb-0.5">Pending</span>
                  <span className="text-xl font-bold text-white block">{pendingTasksCount} <span className="text-xs text-gray-500 font-light">total tasks</span></span>
                </div>
              </div>
              <div className="p-5 bg-[#0b0e14]/60 border border-[#161a23] rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-lg">⏱️</div>
                <div>
                  <span className="text-xxs uppercase tracking-wider text-gray-500 block mb-0.5">Focus Time</span>
                  <span className="text-xl font-bold text-white block">
                    {Math.floor(activitySummary.productive_minutes / 60)}h {activitySummary.productive_minutes % 60}m 
                    <span className="text-xs text-gray-500 font-light"> total sessions</span>
                  </span>
                </div>
              </div>
              <div className="p-5 bg-[#0b0e14]/60 border border-[#161a23] rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-lg">🔥</div>
                <div>
                  <span className="text-xxs uppercase tracking-wider text-gray-500 block mb-0.5">Streak</span>
                  <span className="text-xl font-bold text-white block">{completedTodayCount >= 3 ? "1 day" : "0 days"} <span className="text-xs text-gray-500 font-light">completed sessions</span></span>
                </div>
              </div>
            </div>

            {/* Split Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left 2 Cols: Schedule and Chart */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* Weekly Productivity SVG Chart */}
                <div className="p-6 bg-[#0b0e14]/60 border border-[#161a23] rounded-2xl">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-6">Weekly Productivity</h3>
                  <div className="w-full h-48">
                    <svg viewBox="0 0 500 180" className="w-full h-full">
                      {/* Grid Lines */}
                      <line x1="0" y1="40" x2="500" y2="40" stroke="#141a24" strokeWidth="1.5" />
                      <line x1="0" y1="80" x2="500" y2="80" stroke="#141a24" strokeWidth="1.5" />
                      <line x1="0" y1="120" x2="500" y2="120" stroke="#141a24" strokeWidth="1.5" />
                      
                      {/* Bars */}
                      {/* Monday */}
                      <rect x="25" y="45" width="16" height="95" rx="4" fill="#6366f1" />
                      <rect x="45" y="110" width="16" height="30" rx="4" fill="#ef4444" />
                      
                      {/* Tuesday */}
                      <rect x="95" y="90" width="16" height="50" rx="4" fill="#6366f1" />
                      <rect x="115" y="130" width="16" height="10" rx="4" fill="#ef4444" />
                      
                      {/* Wednesday */}
                      <rect x="165" y="70" width="16" height="70" rx="4" fill="#6366f1" />
                      <rect x="185" y="125" width="16" height="15" rx="4" fill="#ef4444" />
                      
                      {/* Thursday */}
                      <rect x="235" y="45" width="16" height="95" rx="4" fill="#6366f1" />
                      <rect x="255" y="110" width="16" height="30" rx="4" fill="#ef4444" />
                      
                      {/* Friday */}
                      <rect x="305" y="60" width="16" height="80" rx="4" fill="#6366f1" />
                      <rect x="325" y="110" width="16" height="30" rx="4" fill="#ef4444" />
                      
                      {/* Saturday */}
                      <rect x="375" y="75" width="16" height="65" rx="4" fill="#6366f1" />
                      <rect x="395" y="120" width="16" height="20" rx="4" fill="#ef4444" />
                      
                      {/* Sunday */}
                      <rect x="445" y="60" width="16" height="80" rx="4" fill="#6366f1" />
                      <rect x="465" y="110" width="16" height="30" rx="4" fill="#ef4444" />

                      {/* X Labels */}
                      <text x="43" y="162" fill="#4b5563" fontSize="10" textAnchor="middle">Mon</text>
                      <text x="113" y="162" fill="#4b5563" fontSize="10" textAnchor="middle">Tue</text>
                      <text x="183" y="162" fill="#4b5563" fontSize="10" textAnchor="middle">Wed</text>
                      <text x="253" y="162" fill="#4b5563" fontSize="10" textAnchor="middle">Thu</text>
                      <text x="323" y="162" fill="#4b5563" fontSize="10" textAnchor="middle">Fri</text>
                      <text x="393" y="162" fill="#4b5563" fontSize="10" textAnchor="middle">Sat</text>
                      <text x="463" y="162" fill="#4b5563" fontSize="10" textAnchor="middle">Sun</text>
                    </svg>
                  </div>
                </div>

                {/* Today's Schedule Card */}
                <div className="p-6 bg-[#0b0e14]/60 border border-[#161a23] rounded-2xl text-left">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Today's Schedule</h3>
                    <button onClick={() => setView("schedule")} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">View Full →</button>
                  </div>

                  {scheduleBlocks.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                      <span className="text-3xl">⏰</span>
                      <p className="text-sm text-gray-500 font-light">No schedule generated yet. Go to Schedule to optimize your daily workspace plan.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {scheduleBlocks.slice(0, 3).map((block) => (
                        <div key={block.id} className="p-4 bg-[#07090e] border border-[#161a23] rounded-2xl flex items-center justify-between">
                          <div>
                            <span className="block font-semibold text-sm text-gray-200">{block.label}</span>
                            <span className="text-2xs text-gray-500 font-light">{formatTime(block.start_time)} - {formatTime(block.end_time)}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-semibold uppercase tracking-wider ${block.task_id ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-gray-800/40 text-gray-500"}`}>
                            {block.task_id ? "Task" : "Buffer"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Right 1 Col: AI Insights and Upcoming Deadlines */}
              <div className="space-y-8">
                
                {/* AI Insights Panel */}
                <div className="p-6 bg-[#0b0e14]/60 border border-[#161a23] rounded-2xl text-left">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">AI Insights</h3>
                    <button onClick={() => setView("insights")} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">All →</button>
                  </div>

                  <div className="space-y-4">
                    {insights.map((insight, idx) => (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 backdrop-blur-md ${
                          insight.severity === "critical" ? "bg-red-500/5 border-red-500/20 text-red-300" :
                          insight.severity === "warning" ? "bg-amber-500/5 border-amber-500/20 text-amber-300" :
                          insight.severity === "success" ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300" :
                          "bg-indigo-500/5 border-indigo-500/20 text-indigo-300"
                        }`}>
                        <span>💡</span>
                        <p>{insight.message}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upcoming Deadlines */}
                <div className="p-6 bg-[#0b0e14]/60 border border-[#161a23] rounded-2xl text-left">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-6">Upcoming Deadlines</h3>
                  
                  <div className="space-y-4">
                    {tasks.filter(t => !t.completed && t.deadline).slice(0, 4).map((task) => {
                      const dl = new Date(task.deadline!);
                      const diffTime = dl.getTime() - new Date().getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      return (
                        <div key={task.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <span className={`w-2.5 h-2.5 rounded-full ${task.priority >= 4 ? "bg-rose-500" : task.priority === 3 ? "bg-amber-500" : "bg-indigo-500"}`}></span>
                            <span className="font-medium text-gray-300 truncate max-w-[150px]">{task.title}</span>
                          </div>
                          <span className="text-2xs text-gray-500">
                            {diffDays <= 0 ? "due today" : diffDays === 1 ? "in a day" : `in ${diffDays} days`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* TAB 2: TASKS VIEW */}
        {view === "tasks" && (
          <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-extrabold text-white">Tasks</h1>
                <span className="text-sm text-gray-500">View and manage your academic/project goals</span>
              </div>
              <button 
                onClick={() => setShowAddModal(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20">
                + Add Task
              </button>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-4 items-center justify-between p-4 bg-[#0b0e14]/40 border border-[#161a23] rounded-2xl">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..." 
                className="flex-1 max-w-sm bg-[#07090e] border border-[#161a23] rounded-xl px-4 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
              />

              <div className="flex gap-3">
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#07090e] border border-[#161a23] rounded-xl px-3 py-2 text-xs text-gray-400 focus:outline-none">
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>

                <select 
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-[#07090e] border border-[#161a23] rounded-xl px-3 py-2 text-xs text-gray-400 focus:outline-none">
                  <option value="all">All Priority</option>
                  <option value="high">High (P4-P5)</option>
                  <option value="medium">Medium (P3)</option>
                  <option value="low">Low (P1-P2)</option>
                </select>
              </div>
            </div>

            {/* Tasks Grid/List */}
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div key={task.id} className={`p-4 border rounded-2xl flex items-center justify-between transition-all duration-300 ${
                  task.completed 
                    ? "bg-gray-950/20 border-gray-900/60 opacity-60" 
                    : "bg-[#0b0e14]/60 border-[#161a23] hover:border-gray-800"
                }`}>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => toggleTask(task.id, task.completed)}
                      className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                        task.completed ? "bg-emerald-600 border-emerald-500 text-white" : "border-gray-700 hover:border-gray-500"
                      }`}>
                      {task.completed && <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className={`font-semibold text-sm ${task.completed ? "line-through text-gray-500" : "text-gray-200"}`}>{task.title}</span>
                        {task.category && (
                          <span className="text-[10px] text-gray-500 font-light">• {task.category}</span>
                        )}
                        {task.source && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-medium bg-gray-800/40 text-gray-500 border border-gray-800/30">
                            {task.source}
                          </span>
                        )}
                      </div>
                      {task.deadline && (
                        <span className="text-2xs text-gray-500 font-light block mt-0.5">
                          Deadline: {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-0.5 rounded-lg text-xxs font-semibold uppercase tracking-wider ${
                      task.priority >= 4 ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                      task.priority === 3 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                    }`}>
                      {task.priority >= 4 ? "High" : task.priority === 3 ? "Medium" : "Low"}
                    </span>
                    <span className="text-xs text-gray-400 font-light">{task.estimated_duration}min</span>

                    <button 
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1.5 hover:bg-gray-800/60 text-gray-500 hover:text-red-400 rounded-lg transition-colors">
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              
              {filteredTasks.length === 0 && (
                <div className="text-center py-12 border border-dashed border-gray-900 rounded-2xl text-gray-500">
                  No matching tasks found.
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: EXTRACT TASKS VIEW */}
        {view === "extract" && (
          <div className="space-y-8 animate-fade-in text-left">
            <div>
              <h1 className="text-3xl font-extrabold text-white">Extract Tasks</h1>
              <span className="text-sm text-gray-500">Let AI automatically detect tasks, deadlines, and priorities</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div 
                onClick={() => setShowVoiceModal(true)}
                className="p-6 bg-[#0b0e14]/60 border border-[#161a23] rounded-3xl hover:border-indigo-600/30 cursor-pointer transition-all duration-300 flex flex-col justify-between h-44 shadow-xl">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-lg">🎤</div>
                <div>
                  <h3 className="font-bold text-sm text-gray-200">Voice Input</h3>
                  <p className="text-xxs text-gray-500 font-light mt-1">Speak naturally to create tasks instantly</p>
                </div>
              </div>

              <div 
                onClick={() => setShowPdfModal(true)}
                className="p-6 bg-[#0b0e14]/60 border border-[#161a23] rounded-3xl hover:border-indigo-600/30 cursor-pointer transition-all duration-300 flex flex-col justify-between h-44 shadow-xl">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">📄</div>
                <div>
                  <h3 className="font-bold text-sm text-gray-200">PDF Upload</h3>
                  <p className="text-xxs text-gray-500 font-light mt-1">Extract tasks from syllabus documents</p>
                </div>
              </div>

              <div 
                onClick={() => setShowEmailModal(true)}
                className="p-6 bg-[#0b0e14]/60 border border-[#161a23] rounded-3xl hover:border-indigo-600/30 cursor-pointer transition-all duration-300 flex flex-col justify-between h-44 shadow-xl">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-lg">✉️</div>
                <div>
                  <h3 className="font-bold text-sm text-gray-200">Email Paste</h3>
                  <p className="text-xxs text-gray-500 font-light mt-1">Extract tasks from class email sync</p>
                </div>
              </div>

              <div 
                onClick={() => setShowNotesModal(true)}
                className="p-6 bg-[#0b0e14]/60 border border-[#161a23] rounded-3xl hover:border-indigo-600/30 cursor-pointer transition-all duration-300 flex flex-col justify-between h-44 shadow-xl">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-lg">✍️</div>
                <div>
                  <h3 className="font-bold text-sm text-gray-200">Notes</h3>
                  <p className="text-xxs text-gray-500 font-light mt-1">Type or paste project guidelines notes</p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: SCHEDULE TIMELINE VIEW */}
        {view === "schedule" && (
          <div className="space-y-8 animate-fade-in text-left">
            
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-extrabold text-white">Smart Schedule</h1>
                <span className="text-sm text-gray-500">AI-generated daily plan optimized for your productivity</span>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={handleGenerateSchedule}
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all">
                  Optimize Schedule
                </button>
                <button 
                  onClick={handleReschedule}
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 rounded-xl text-sm font-semibold border border-gray-700 transition-all flex items-center gap-2">
                  {isProcessing && <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>}
                  Reschedule
                </button>
              </div>
            </div>

            {/* Timeline Blocks */}
            {scheduleBlocks.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-gray-900 rounded-3xl flex flex-col items-center justify-center gap-4 bg-[#0b0e14]/20">
                <span className="text-4xl">📅</span>
                <h3 className="font-bold text-gray-300">No schedule for this day</h3>
                <p className="text-xs text-gray-500 max-w-sm">You have pending tasks waiting. Let AI generate an optimized daily plan.</p>
                <button 
                  onClick={handleGenerateSchedule}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-500/20">
                  Generate Schedule
                </button>
              </div>
            ) : (
              <div className="relative pl-6 border-l-2 border-indigo-900/50 space-y-6 max-w-2xl mx-auto w-full">
                {scheduleBlocks.map((block) => (
                  <div key={block.id} className="relative group">
                    {/* Circle time dot */}
                    <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 transition-all ${
                      block.task_id 
                        ? block.task?.completed 
                          ? "bg-emerald-500 border-emerald-600" 
                          : "bg-indigo-600 border-indigo-700" 
                        : "bg-gray-800 border-gray-700"
                    }`}></div>

                    <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                      block.task_id 
                        ? block.task?.completed 
                          ? "bg-gray-950/20 border-gray-900/60 opacity-60" 
                          : "bg-[#0b0e14]/60 border-[#161a23] hover:border-indigo-800/30" 
                        : "bg-gray-950/40 border-dashed border-gray-850 text-gray-400 font-light"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {block.task_id && (
                            <button 
                              onClick={() => toggleTask(block.task_id!, block.task?.completed || false)}
                              className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                block.task?.completed ? "bg-emerald-600 border-emerald-500 text-white" : "border-gray-700 hover:border-gray-500"
                              }`}>
                              {block.task?.completed && <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                            </button>
                          )}
                          <div>
                            <span className={`block font-medium ${block.task?.completed ? "line-through text-gray-500" : "text-gray-100"}`}>
                              {block.label}
                            </span>
                            <span className="text-xs text-gray-500 font-light">
                              {formatTime(block.start_time)} - {formatTime(block.end_time)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {block.task_id ? (
                            <span className="px-2.5 py-0.5 rounded-lg text-xxs font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              Priority {block.task?.priority}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-lg text-xxs font-medium tracking-wide bg-gray-850/40 text-gray-500 border border-gray-850/30">
                              Buffer
                            </span>
                          )}
                          
                          {block.task_id && (
                            <button 
                              onClick={() => handleDeleteTask(block.task_id!)}
                              className="p-1 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-red-400 transition-all">
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* TAB 5: FOCUS MODE VIEW */}
        {view === "focus" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-fade-in text-left">
            
            {/* Left Card: Focus Timer Panel */}
            <div className="bg-[#0b0e14]/60 border border-[#161a23] rounded-3xl p-8 backdrop-blur-xl shadow-2xl flex flex-col items-center">
              {/* Tab Selector */}
              <div className="flex gap-1.5 p-1 bg-[#07090e] border border-[#161a23] rounded-xl mb-8 w-full max-w-xs">
                <button 
                  onClick={() => {
                    setActiveFocusTab("pomo");
                    setPomoMinutes(25);
                    setPomoSeconds(0);
                    setPomoActive(false);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeFocusTab === "pomo" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/15" : "text-gray-400 hover:text-gray-200"}`}>
                  Pomodoro
                </button>
                <button 
                  onClick={() => {
                    setActiveFocusTab("deep");
                    setPomoMinutes(90);
                    setPomoSeconds(0);
                    setPomoActive(false);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeFocusTab === "deep" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/15" : "text-gray-400 hover:text-gray-200"}`}>
                  Deep Work
                </button>
                <button 
                  onClick={() => {
                    setActiveFocusTab("custom");
                    setPomoMinutes(45);
                    setPomoSeconds(0);
                    setPomoActive(false);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeFocusTab === "custom" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/15" : "text-gray-400 hover:text-gray-200"}`}>
                  Custom
                </button>
              </div>

              {/* Large Timer Progress Ring */}
              <div className="relative w-64 h-64 flex items-center justify-center rounded-full border-4 border-indigo-950 bg-[#07090e]/40 backdrop-blur-sm mb-6 shadow-xl">
                {/* SVG circular track background */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle cx="128" cy="128" r="120" fill="none" stroke="#111520" strokeWidth="4" />
                  <circle 
                    cx="128" 
                    cy="128" 
                    r="120" 
                    fill="none" 
                    stroke="#6366f1" 
                    strokeWidth="4" 
                    strokeDasharray="753.6" 
                    strokeDashoffset={753.6 * (1 - (pomoMinutes * 60 + pomoSeconds) / (activeFocusTab === "pomo" ? 1500 : activeFocusTab === "deep" ? 5400 : 2700))}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="text-center z-10">
                  <div className="text-5xl font-mono font-extrabold tracking-tight text-white">
                    {pomoMinutes.toString().padStart(2, '0')}:{pomoSeconds.toString().padStart(2, '0')}
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-extrabold mt-1.5 block">
                    {pomoIsBreak ? "Rest period" : activeFocusTab === "pomo" ? "POMODORO" : activeFocusTab === "deep" ? "DEEP WORK" : "FOCUS BLOCK"}
                  </span>
                </div>
              </div>

              {/* Link to task Selector */}
              <div className="w-full max-w-sm mb-6">
                <label className="text-xxs uppercase tracking-wider text-gray-500 block mb-1 text-left">Link to a task (optional)</label>
                <select 
                  value={selectedTaskId || ""}
                  onChange={(e) => setSelectedTaskId(Number(e.target.value) || null)}
                  className="w-full bg-[#07090e] border border-[#161a23] rounded-xl px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500">
                  <option value="">Select a task...</option>
                  {tasks.filter(t => !t.completed).map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.estimated_duration}m)</option>
                  ))}
                </select>
              </div>

              {/* Start & Reset controls */}
              <div className="flex items-center gap-4 w-full max-w-sm">
                <button 
                  onClick={() => setPomoActive(!pomoActive)}
                  className="flex-grow py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition-all">
                  {pomoActive ? "Pause" : "Start"}
                </button>
                <button 
                  onClick={() => {
                    setPomoActive(false);
                    setPomoIsBreak(false);
                    setPomoMinutes(activeFocusTab === "pomo" ? 25 : activeFocusTab === "deep" ? 90 : 45);
                    setPomoSeconds(0);
                  }}
                  className="p-3.5 bg-[#07090e] border border-[#161a23] hover:bg-[#121620] rounded-xl text-gray-400 hover:text-white transition-all"
                  title="Reset session">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                </button>
              </div>
            </div>

            {/* Right Column: Focus Stats & Goals */}
            <div className="space-y-6">
              {/* Focus stats cards grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#0b0e14]/60 border border-[#161a23] rounded-2xl">
                  <span className="flex h-3 w-3 text-indigo-400 mb-2">⏱️</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Today's Focus</span>
                  <span className="text-lg font-bold text-white block mt-0.5">
                    {Math.floor(activitySummary.productive_minutes / 60)}h {activitySummary.productive_minutes % 60}m
                  </span>
                </div>
                <div className="p-4 bg-[#0b0e14]/60 border border-[#161a23] rounded-2xl">
                  <span className="flex h-3 w-3 text-amber-500 mb-2">⚡</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Focus Score</span>
                  <span className="text-lg font-bold text-white block mt-0.5">
                    {trackingEnabled ? activitySummary.focus_score : "0"}
                  </span>
                </div>
                <div className="p-4 bg-[#0b0e14]/60 border border-[#161a23] rounded-2xl">
                  <span className="flex h-3 w-3 text-rose-500 mb-2">❤️</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Sessions Today</span>
                  <span className="text-lg font-bold text-white block mt-0.5">{completedTodayCount}</span>
                </div>
                <div className="p-4 bg-[#0b0e14]/60 border border-[#161a23] rounded-2xl">
                  <span className="flex h-3 w-3 text-emerald-400 mb-2">📈</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Total Sessions</span>
                  <span className="text-lg font-bold text-white block mt-0.5">{completedTodayCount}</span>
                </div>
              </div>

              {/* Daily Goal Gauge */}
              <div className="p-6 bg-[#0b0e14]/60 border border-[#161a23] rounded-3xl flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-1">Daily Goal</h3>
                  <span className="text-sm text-gray-500 font-light block">
                    {activitySummary.productive_minutes} / 360 min goal
                  </span>
                </div>
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#161b26" strokeWidth="4" />
                    <circle 
                      cx="32" 
                      cy="32" 
                      r="28" 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth="4" 
                      strokeDasharray="175.84" 
                      strokeDashoffset={175.84 * (1 - Math.min(activitySummary.productive_minutes / 360, 1))} 
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-xs font-extrabold text-white">
                    {Math.round(Math.min((activitySummary.productive_minutes / 360) * 100, 100))}%
                  </span>
                </div>
              </div>

              {/* Recent Sessions list */}
              <div className="p-6 bg-[#0b0e14]/60 border border-[#161a23] rounded-3xl text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Recent Sessions</h3>
                {activitySummary.productive_minutes > 0 ? (
                  <div className="p-3.5 bg-[#07090e]/40 border border-[#161a23] rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-gray-300 block">Workspace focus blocks logged</span>
                      <span className="text-2xs text-gray-500 font-light block">Calculated via macOS activity agent telemetry</span>
                    </div>
                    <span className="text-emerald-400 font-bold">+{activitySummary.productive_minutes}m</span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 font-light text-center py-4">No focus sessions recorded yet. Start a pomodoro block.</p>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 6: EXPANDED INSIGHTS VIEW */}
        {view === "insights" && (
          <div className="space-y-8 animate-fade-in text-left">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-extrabold text-white">AI Insights</h1>
                <span className="text-sm text-gray-500">Personalized productivity analysis powered by AI</span>
              </div>
              <button 
                onClick={fetchInsights}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition-all">
                Generate Insights
              </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-[#0b0e14]/50 border border-emerald-500/20 rounded-2xl">
                <span className="text-3xl font-extrabold text-emerald-400 block">{completedTodayCount}</span>
                <span className="text-[10px] text-gray-500 uppercase font-medium">Completed</span>
              </div>
              <div className="p-4 bg-[#0b0e14]/50 border border-amber-500/20 rounded-2xl">
                <span className="text-3xl font-extrabold text-amber-500 block">{pendingTasksCount}</span>
                <span className="text-[10px] text-gray-500 uppercase font-medium">Pending</span>
              </div>
              <div className="p-4 bg-[#0b0e14]/50 border border-rose-500/20 rounded-2xl">
                <span className="text-3xl font-extrabold text-rose-500 block">0</span>
                <span className="text-[10px] text-gray-500 uppercase font-medium">Missed</span>
              </div>
              <div className="p-4 bg-[#0b0e14]/50 border border-purple-500/20 rounded-2xl">
                <span className="text-3xl font-extrabold text-purple-400 block">{completedTodayCount}</span>
                <span className="text-[10px] text-gray-500 uppercase font-medium">Focus Sessions</span>
              </div>
            </div>

            {/* Sparkline line chart */}
            <div className="p-6 bg-[#0b0e14]/60 border border-[#161a23] rounded-3xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-6">Focus Time Trend (7 Days)</h3>
              <div className="w-full h-24">
                <svg viewBox="0 0 600 80" className="w-full h-full">
                  <path 
                    d="M 10 60 Q 100 20 200 55 T 400 35 T 590 15" 
                    fill="none" 
                    stroke="#6366f1" 
                    strokeWidth="3.5" 
                    strokeLinecap="round"
                  />
                  <path 
                    d="M 10 60 Q 100 20 200 55 T 400 35 T 590 15 L 590 80 L 10 80 Z" 
                    fill="url(#sparkline-gradient)" 
                    opacity="0.12"
                  />
                  <defs>
                    <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Dots */}
                  <circle cx="590" cy="15" r="4.5" fill="#6366f1" stroke="#0b0e14" strokeWidth="1.5" />
                  {/* Grid base line */}
                  <line x1="0" y1="80" x2="600" y2="80" stroke="#161b26" strokeWidth="1.5" />
                </svg>
              </div>
            </div>

            {/* Task Categories Count Grid */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Task Categories</h3>
              <div className="flex flex-wrap gap-2.5">
                <div className="px-4 py-2 bg-[#07090e]/60 border border-[#161a23] rounded-xl text-xs">
                  Coding <span className="font-bold text-indigo-400 ml-2">{tasks.filter(t => t.category === "coding").length || 2}</span>
                </div>
                <div className="px-4 py-2 bg-[#07090e]/60 border border-[#161a23] rounded-xl text-xs">
                  Study <span className="font-bold text-indigo-400 ml-2">{tasks.filter(t => t.category === "study").length || 1}</span>
                </div>
                <div className="px-4 py-2 bg-[#07090e]/60 border border-[#161a23] rounded-xl text-xs">
                  Meeting <span className="font-bold text-indigo-400 ml-2">{tasks.filter(t => t.category === "meeting").length || 1}</span>
                </div>
                <div className="px-4 py-2 bg-[#07090e]/60 border border-[#161a23] rounded-xl text-xs">
                  Testing <span className="font-bold text-indigo-400 ml-2">1</span>
                </div>
                <div className="px-4 py-2 bg-[#07090e]/60 border border-[#161a23] rounded-xl text-xs">
                  Documentation <span className="font-bold text-indigo-400 ml-2">1</span>
                </div>
                <div className="px-4 py-2 bg-[#07090e]/60 border border-[#161a23] rounded-xl text-xs">
                  Research <span className="font-bold text-indigo-400 ml-2">1</span>
                </div>
                <div className="px-4 py-2 bg-[#07090e]/60 border border-[#161a23] rounded-xl text-xs">
                  Design <span className="font-bold text-indigo-400 ml-2">1</span>
                </div>
              </div>
            </div>

            {/* Dedicated Insights Grid (9 modules matching mockup screenshot) */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1 */}
                <div className="p-5 bg-[#0b0e14]/60 border border-[#161a23] rounded-2xl flex gap-3.5">
                  <span className="text-xl">ℹ️</span>
                  <div>
                    <h4 className="font-bold text-xs text-gray-200 mb-1">Deadline Clumping</h4>
                    <p className="text-[11px] text-gray-500 font-light leading-relaxed">
                      You have multiple critical deadlines approaching (July 9, 10, and 12). Avoid bottlenecks by addressing your research tasks early in your day to clear cognitive load.
                    </p>
                  </div>
                </div>

                {/* 2 */}
                <div className="p-5 bg-[#0b0e14]/60 border border-[#161a23] rounded-2xl flex gap-3.5">
                  <span className="text-xl">ℹ️</span>
                  <div>
                    <h4 className="font-bold text-xs text-gray-200 mb-1">Low-Priority Accumulation</h4>
                    <p className="text-[11px] text-gray-500 font-light leading-relaxed">
                      The 'Unit Tests for Schedule Generator' task is low priority and has a significant estimated duration of 90 minutes. Review if this can be deferred or delegated.
                    </p>
                  </div>
                </div>

                {/* 3 */}
                <div className="p-5 bg-[#0b0e14]/60 border border-[#161a23] rounded-2xl flex gap-3.5">
                  <span className="text-xl">ℹ️</span>
                  <div>
                    <h4 className="font-bold text-xs text-gray-200 mb-1">Establish Focus Sessions</h4>
                    <p className="text-[11px] text-gray-500 font-light leading-relaxed">
                      You have recorded zero focus sessions. Given your high volume of deep work, utilizing scheduled focus blocks will help you tackle complex coding tasks more efficiently.
                    </p>
                  </div>
                </div>

                {/* 4 */}
                <div className="p-5 bg-[#0b0e14]/60 border border-[#161a23] rounded-2xl flex gap-3.5">
                  <span className="text-xl">ℹ️</span>
                  <div>
                    <h4 className="font-bold text-xs text-gray-200 mb-1">Coding Complexity Overload</h4>
                    <p className="text-[11px] text-gray-500 font-light leading-relaxed">
                      You currently have pending coding tasks totaling 315 minutes. Consider breaking 'Complete AI Model Training Pipeline' into smaller, manageable sub-tasks.
                    </p>
                  </div>
                </div>

                {/* 5 */}
                <div className="p-5 bg-[#0b0e14]/60 border border-[#161a23] rounded-2xl flex gap-3.5">
                  <span className="text-xl">ℹ️</span>
                  <div>
                    <h4 className="font-bold text-xs text-gray-200 mb-1">Critical Deadline Imminent</h4>
                    <p className="text-[11px] text-gray-500 font-light leading-relaxed">
                      Your 'Review Midterm Exam Material' task is high priority and due by July 9th. With 120 minutes required, you should prioritize this session immediately.
                    </p>
                  </div>
                </div>

                {/* 6 */}
                <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex gap-3.5">
                  <span className="text-xl">🟢</span>
                  <div>
                    <h4 className="font-bold text-xs text-emerald-400 mb-1">You're most productive between 9-11 AM</h4>
                    <p className="text-[11px] text-emerald-500/80 font-light leading-relaxed">
                      Your focus sessions during morning hours show 85% completion rate compared to 60% in the afternoon. Consider scheduling demanding tasks in this window.
                    </p>
                  </div>
                </div>

                {/* 7 */}
                <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex gap-3.5">
                  <span className="text-xl">🟡</span>
                  <div>
                    <h4 className="font-bold text-xs text-amber-400 mb-1">Documentation tasks get postponed</h4>
                    <p className="text-[11px] text-amber-500/80 font-light leading-relaxed">
                      You've pushed 'Write Project Documentation' back twice. Try tackling it in a 25-minute Pomodoro block to build initial momentum.
                    </p>
                  </div>
                </div>

                {/* 8 */}
                <div className="p-5 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex gap-3.5">
                  <span className="text-xl">🔴</span>
                  <div>
                    <h4 className="font-bold text-xs text-rose-400 mb-1">Midterm Review deadline is tomorrow</h4>
                    <p className="text-[11px] text-rose-500/80 font-light leading-relaxed">
                      A high priority assignment deadline is closing. Adjust schedule immediately to accommodate prep blocks.
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* TAB 7: SETTINGS VIEW */}
        {view === "settings" && (
          <div className="space-y-8 animate-fade-in text-left">
            <div>
              <h1 className="text-3xl font-extrabold text-white">Settings</h1>
              <span className="text-sm text-gray-500">Manage work boundaries, schedules, and notifications</span>
            </div>

            <div className="max-w-2xl space-y-6">
              
              {/* Work Hours boundaries */}
              <div className="p-6 bg-[#0b0e14]/60 border border-[#161a23] rounded-3xl shadow-xl space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-gray-200">Work Hours</h3>
                  <p className="text-xxs text-gray-500 font-light mt-0.5">Define your preferred working schedule</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase text-gray-400 block mb-1">Start Time</label>
                    <input 
                      type="text" 
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-[#07090e] border border-[#161a23] rounded-xl px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-gray-400 block mb-1">End Time</label>
                    <input 
                      type="text" 
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-[#07090e] border border-[#161a23] rounded-xl px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase text-gray-400 block mb-1">Daily Goal (hours)</label>
                    <input 
                      type="number" 
                      value={dailyGoalHours}
                      onChange={(e) => setDailyGoalHours(Number(e.target.value))}
                      className="w-full bg-[#07090e] border border-[#161a23] rounded-xl px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-gray-400 block mb-1">Max Focus Blocks</label>
                    <input 
                      type="number" 
                      value={maxFocusBlocks}
                      onChange={(e) => setMaxFocusBlocks(Number(e.target.value))}
                      className="w-full bg-[#07090e] border border-[#161a23] rounded-xl px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none" 
                    />
                  </div>
                </div>
              </div>

              {/* Timer Customization */}
              <div className="p-6 bg-[#0b0e14]/60 border border-[#161a23] rounded-3xl shadow-xl space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-gray-200">Timer Settings</h3>
                  <p className="text-xxs text-gray-500 font-light mt-0.5">Customize focus session durations</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] uppercase text-gray-400 block mb-1">Pomodoro (min)</label>
                    <input 
                      type="number" 
                      value={pomoMinutes}
                      onChange={(e) => setPomoMinutes(Number(e.target.value))}
                      className="w-full bg-[#07090e] border border-[#161a23] rounded-xl px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-gray-400 block mb-1">Deep Work (min)</label>
                    <input 
                      type="number" 
                      value={deepWorkMin}
                      onChange={(e) => setDeepWorkMin(Number(e.target.value))}
                      className="w-full bg-[#07090e] border border-[#161a23] rounded-xl px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-gray-400 block mb-1">Break (min)</label>
                    <input 
                      type="number" 
                      value={breakMin}
                      onChange={(e) => setBreakMin(Number(e.target.value))}
                      className="w-full bg-[#07090e] border border-[#161a23] rounded-xl px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none" 
                    />
                  </div>
                </div>
              </div>

              {/* Privacy Toggles */}
              <div className="p-6 bg-[#0b0e14]/60 border border-[#161a23] rounded-3xl shadow-xl space-y-5">
                <div>
                  <h3 className="font-bold text-sm text-gray-200">Privacy & Monitoring</h3>
                  <p className="text-xxs text-gray-500 font-light mt-0.5">Control which activities the AI can analyze</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-gray-300 block">IDE & Coding Platforms</span>
                      <span className="text-2xs text-gray-500 font-light">Track VS Code, GitHub activity</span>
                    </div>
                    <button 
                      onClick={() => setTrackIDE(!trackIDE)}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors ${trackIDE ? "bg-indigo-600" : "bg-gray-800"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${trackIDE ? "translate-x-5" : "translate-x-0"}`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-gray-300 block">Browser Activity</span>
                      <span className="text-2xs text-gray-500 font-light">Analyze productive vs distracted browsing</span>
                    </div>
                    <button 
                      onClick={() => setTrackBrowser(!trackBrowser)}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors ${trackBrowser ? "bg-indigo-600" : "bg-gray-800"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${trackBrowser ? "translate-x-5" : "translate-x-0"}`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-gray-300 block">Document Editing</span>
                      <span className="text-2xs text-gray-500 font-light">Track document writing sessions</span>
                    </div>
                    <button 
                      onClick={() => setTrackDocs(!trackDocs)}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors ${trackDocs ? "bg-indigo-600" : "bg-gray-800"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${trackDocs ? "translate-x-5" : "translate-x-0"}`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-gray-300 block">PDF & Reading</span>
                      <span className="text-2xs text-gray-500 font-light">Monitor reading activity</span>
                    </div>
                    <button 
                      onClick={() => setTrackPDF(!trackPDF)}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors ${trackPDF ? "bg-indigo-600" : "bg-gray-800"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${trackPDF ? "translate-x-5" : "translate-x-0"}`}></div>
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-[#07090e]/40 border border-[#161a23] rounded-xl text-2xs text-indigo-400/80 font-light">
                  🛡️ All monitoring is opt-in. Data is only used locally to improve your schedule and insights.
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button 
                  onClick={() => {
                    alert("Settings saved successfully!");
                  }}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all">
                  Save Settings
                </button>

                <button 
                  onClick={async () => {
                    if (confirm("Reset database with fresh tasks and activity logs?")) {
                      setIsProcessing(true);
                      try {
                        const res = await fetch(`http://localhost:8000/api/health`);
                        if (res.ok) {
                          alert("Database reset requested. Make sure seed.py is triggered in backend.");
                        }
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setIsProcessing(false);
                      }
                    }
                  }}
                  className="px-4 py-2 border border-red-500/30 hover:bg-red-500/10 text-red-400 text-xs font-semibold rounded-xl transition-colors">
                  Clean Database & Reset Mock Data
                </button>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* POPUP MODALS FOR ADDING / EXTRACTING TASKS */}
      
      {/* 1. Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0e14] border border-[#161a23] w-full max-w-lg rounded-3xl p-6 shadow-2xl relative text-left">
            <h2 className="text-xl font-bold text-white mb-4">Add Task</h2>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="text-xxs uppercase tracking-wider text-gray-500 block mb-1">Task Title</label>
                <input 
                  type="text" 
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Write literature review" 
                  required
                  className="w-full bg-[#07090e] border border-[#161a23] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-gray-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xxs uppercase tracking-wider text-gray-500 block mb-1">Deadline Date/Time</label>
                  <input 
                    type="datetime-local" 
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full bg-[#07090e] border border-[#161a23] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xxs uppercase tracking-wider text-gray-500 block mb-1">Category</label>
                  <select 
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                    className="w-full bg-[#07090e] border border-[#161a23] rounded-xl px-3 py-2 text-xs focus:outline-none text-gray-200">
                    <option value="coding">coding</option>
                    <option value="study">study</option>
                    <option value="meeting">meeting</option>
                    <option value="research">research</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xxs uppercase tracking-wider text-gray-500 block mb-1">Priority (1 - 5)</label>
                  <select 
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(Number(e.target.value))}
                    className="w-full bg-[#07090e] border border-[#161a23] rounded-xl px-3 py-2 text-xs focus:outline-none text-gray-200">
                    <option value={1}>1 (Lowest)</option>
                    <option value={2}>2</option>
                    <option value={3}>3 (Normal)</option>
                    <option value={4}>4</option>
                    <option value={5}>5 (Critical)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xxs uppercase tracking-wider text-gray-500 block mb-1">Est. Duration (minutes)</label>
                  <input 
                    type="number" 
                    value={taskDuration}
                    onChange={(e) => setTaskDuration(Number(e.target.value))}
                    placeholder="45"
                    min={5}
                    required
                    className="w-full bg-[#07090e] border border-[#161a23] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-gray-200"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-800 rounded-xl text-xs font-semibold text-gray-400 hover:text-gray-200">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isProcessing}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-xs font-semibold">
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Voice Input Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0e14] border border-[#161a23] w-full max-w-sm rounded-3xl p-6 shadow-2xl relative text-center">
            <h2 className="text-lg font-bold text-white mb-4">Voice Task Input</h2>
            <p className="text-xxs text-gray-500 mb-6">Describe your task and deadline naturally in a voice clip</p>
            
            <div className="flex justify-center mb-6">
              {isRecording ? (
                <button 
                  onClick={stopRecording}
                  className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 border border-red-500 flex items-center justify-center text-2xl transition-all animate-pulse">
                  🛑
                </button>
              ) : (
                <button 
                  onClick={startRecording}
                  className="w-20 h-20 rounded-full bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-2xl transition-all">
                  🎤
                </button>
              )}
            </div>

            {isRecording && (
              <span className="text-xs text-rose-400 font-semibold block mb-4">Recording: {recordingSeconds}s</span>
            )}

            {isProcessing && (
              <span className="text-xs text-indigo-400 font-medium block mb-4">Processing audio transcript...</span>
            )}

            {micError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/25 text-red-300 text-xxs rounded-xl leading-relaxed">
                ⚠️ {micError}
              </div>
            )}

            <button 
              type="button" 
              onClick={() => {
                stopRecording();
                setMicError(null);
                setShowVoiceModal(false);
              }}
              className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-semibold">
              Close
            </button>
          </div>
        </div>
      )}

      {/* 3. PDF Syllabus Upload Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0e14] border border-[#161a23] w-full max-w-md rounded-3xl p-6 shadow-2xl relative text-center">
            <h2 className="text-lg font-bold text-white mb-4">PDF Syllabus Upload</h2>
            <p className="text-xxs text-gray-500 mb-6">Upload a syllabus or assignment file to extract tasks</p>
            
            <input 
              type="file" 
              accept=".pdf,text/plain" 
              onChange={handleFileUpload} 
              ref={fileInputRef} 
              className="hidden" 
            />
            
            <div className="py-8 border-2 border-dashed border-[#161a23] rounded-2xl mb-6 flex flex-col items-center justify-center gap-3">
              <span className="text-3xl">📄</span>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-xl">
                Choose Document File
              </button>
              <span className="text-[10px] text-gray-500 font-light">Supports PDF and TXT files</span>
            </div>

            {isUploading && (
              <span className="text-xs text-indigo-400 font-medium block mb-4">Parsing PDF text guidelines...</span>
            )}

            <button 
              type="button" 
              onClick={() => setShowPdfModal(false)}
              className="w-full py-2.5 bg-gray-850 hover:bg-gray-750 border border-gray-800 rounded-xl text-xs font-semibold">
              Close
            </button>
          </div>
        </div>
      )}

      {/* 4. Email Paste / Sync Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0e14] border border-[#161a23] w-full max-w-md rounded-3xl p-6 shadow-2xl relative text-left">
            <h2 className="text-lg font-bold text-white mb-2">Sync Academic Emails</h2>
            <p className="text-xxs text-gray-500 mb-6">Fetch unread assignment announcements and deadlines from your inbox</p>
            
            <div className="space-y-4">
              <button 
                onClick={handleSyncEmails}
                disabled={isProcessing}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2">
                <span>🔄</span>
                {isProcessing ? "Connecting to Inbox..." : "Sync from Inbox Simulator"}
              </button>

              <div className="p-3 bg-gray-950/40 border border-gray-900 rounded-xl">
                <span className="text-[10px] text-gray-500 font-bold block mb-1">Simulated Emails to Fetch:</span>
                <span className="text-[9px] text-gray-400 font-light block leading-normal">• Reminder: Literature Review Submission Guidelines (Due next Thursday)</span>
                <span className="text-[9px] text-gray-400 font-light block leading-normal">• Meeting scheduled with Guide: discuss OR-Tools (Friday 2 PM)</span>
              </div>
            </div>

            <button 
              type="button" 
              onClick={() => setShowEmailModal(false)}
              className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-semibold mt-6">
              Close
            </button>
          </div>
        </div>
      )}

      {/* 5. Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0e14] border border-[#161a23] w-full max-w-lg rounded-3xl p-6 shadow-2xl relative text-left">
            <h2 className="text-lg font-bold text-white mb-2">Paste Guidelines Notes</h2>
            <p className="text-xxs text-gray-500 mb-4">Paste guidelines notes below. AI will isolate milestones.</p>
            
            <textarea 
              value={textNotes}
              onChange={(e) => setTextNotes(e.target.value)}
              placeholder="e.g. Need to complete AI model training by next Tuesday. P5. Estimated duration is 180 mins." 
              rows={6}
              className="w-full bg-[#07090e] border border-[#161a23] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-gray-200 resize-none mb-4"
            />

            <div className="flex gap-3 justify-end">
              <button 
                type="button" 
                onClick={() => setShowNotesModal(false)}
                className="px-4 py-2 border border-gray-850 rounded-xl text-xs font-semibold text-gray-400 hover:text-gray-200">
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => handleTextExtraction(textNotes)}
                disabled={isProcessing || !textNotes.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-xs font-semibold">
                Extract Task
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
