"use client";
import { useEffect, useState, useRef } from "react";

type View = "home" | "focus" | "schedule";

interface Task {
  id: number;
  title: string;
  deadline: string | null;
  priority: number;
  estimated_duration: number;
  completed: boolean;
  created_at: string;
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
  const [view, setView] = useState<View>("home");
  const [backendStatus, setBackendStatus] = useState<string>("Checking backend connection...");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [isProcessingInput, setIsProcessingInput] = useState(false);

  // Manual Task Creation State
  const [manualTitle, setManualTitle] = useState("");
  const [manualPriority, setManualPriority] = useState(3);
  const [manualDuration, setManualDuration] = useState(45);
  const [manualDeadline, setManualDeadline] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);

  // Activity Tracking state
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [activitySummary, setActivitySummary] = useState<ActivitySummary>({
    productive_minutes: 0,
    distracting_minutes: 0,
    neutral_minutes: 0,
    focus_score: 100,
    active_project: "None"
  });

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email Sync State
  const [isSyncingEmails, setIsSyncingEmails] = useState(false);

  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pomodoro States
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Scheduling State
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Fetch all tasks from DB
  const fetchTasks = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    }
  };

  // Fetch schedule timeline
  const fetchSchedule = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/schedule");
      if (res.ok) {
        const data = await res.json();
        setScheduleBlocks(data);
      }
    } catch (err) {
      console.error("Failed to fetch schedule:", err);
    }
  };

  // Fetch activity stats & settings
  const fetchActivitySummary = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/activity/summary");
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
      const res = await fetch("http://localhost:8000/api/activity/settings");
      if (res.ok) {
        const data = await res.json();
        setTrackingEnabled(data.tracking_enabled);
      }
    } catch (err) {
      console.error("Failed to fetch activity settings:", err);
    }
  };

  // Fetch AI Insights
  const fetchInsights = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/insights");
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      }
    } catch (err) {
      console.error("Failed to fetch insights:", err);
    }
  };

  const toggleTracking = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/activity/settings/toggle", {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setTrackingEnabled(data.tracking_enabled);
        if (!data.tracking_enabled) {
          setActivitySummary(prev => ({ ...prev, active_project: "None" }));
        }
        await fetchInsights();
      }
    } catch (err) {
      console.error("Failed to toggle tracking:", err);
    }
  };

  useEffect(() => {
    fetch("http://localhost:8000/api/health")
      .then((res) => res.json())
      .then((data) => setBackendStatus(data.message))
      .catch(() => setBackendStatus("Backend is disconnected"));
    
    fetchTasks();
    fetchSchedule();
    fetchActivitySummary();
    fetchActivitySettings();
    fetchInsights();

    // Poll activity logs and insights every 5 seconds to show real-time changes
    const interval = setInterval(() => {
      fetchActivitySummary();
      fetchInsights();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (view === "schedule") {
      fetchSchedule();
    }
  }, [view]);

  // Pomodoro Timer Logic
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        if (timerSeconds > 0) {
          setTimerSeconds(timerSeconds - 1);
        } else if (timerMinutes > 0) {
          setTimerMinutes(timerMinutes - 1);
          setTimerSeconds(59);
        } else {
          clearInterval(timerRef.current!);
          setIsActive(false);
          alert(isBreak ? "Break finished! Time to focus." : "Focus session finished! Take a break.");
          setIsBreak(!isBreak);
          setTimerMinutes(isBreak ? 25 : 5);
          setTimerSeconds(0);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timerMinutes, timerSeconds, isBreak]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setTimerMinutes(25);
    setTimerSeconds(0);
  };

  // Text task extraction
  const handleNLSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!naturalLanguageInput.trim()) return;
    setIsProcessingInput(true);

    try {
      const res = await fetch("http://localhost:8000/api/tasks/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: naturalLanguageInput }),
      });
      if (res.ok) {
        setNaturalLanguageInput("");
        await fetchTasks();
        await handleGenerateSchedule();
        await fetchInsights();
      }
    } catch (err) {
      console.error("NLP extraction failed:", err);
    } finally {
      setIsProcessingInput(false);
    }
  };

  // Manual Task Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    try {
      const res = await fetch("http://localhost:8000/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: manualTitle,
          deadline: manualDeadline ? new Date(manualDeadline).toISOString() : null,
          priority: manualPriority,
          estimated_duration: manualDuration
        }),
      });
      if (res.ok) {
        setManualTitle("");
        setManualDeadline("");
        setManualPriority(3);
        setManualDuration(45);
        setShowManualForm(false);
        await fetchTasks();
        await handleGenerateSchedule();
        await fetchInsights();
      }
    } catch (err) {
      console.error("Manual task creation failed:", err);
    }
  };

  // File task extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/tasks/extract-file", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        await fetchTasks();
        await handleGenerateSchedule();
        await fetchInsights();
      }
    } catch (err) {
      console.error("File upload extraction failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  // Email sync task extraction
  const handleSyncEmails = async () => {
    setIsSyncingEmails(true);
    try {
      const res = await fetch("http://localhost:8000/api/tasks/sync-emails", {
        method: "POST"
      });
      if (res.ok) {
        await fetchTasks();
        await handleGenerateSchedule();
        await fetchInsights();
        alert("Successfully synced academic emails! Tasks extracted.");
      }
    } catch (err) {
      console.error("Email sync extraction failed:", err);
    } finally {
      setIsSyncingEmails(false);
    }
  };

  // Voice recording controls
  const startRecording = async () => {
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
    } catch (err) {
      console.error("Audio recording failed:", err);
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
    setIsProcessingInput(true);
    const formData = new FormData();
    formData.append("file", blob, "voicenote.webm");

    try {
      const res = await fetch("http://localhost:8000/api/tasks/extract-file", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        await fetchTasks();
        await handleGenerateSchedule();
        await fetchInsights();
      }
    } catch (err) {
      console.error("Voice task extraction failed:", err);
    } finally {
      setIsProcessingInput(false);
    }
  };

  // Toggle task complete status and reschedule remaining day
  const toggleTask = async (id: number, currentCompleted: boolean) => {
    try {
      const res = await fetch(`http://localhost:8000/api/tasks/${id}`, {
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

  const handleDeleteTask = async (id: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`http://localhost:8000/api/tasks/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchTasks();
        await handleReschedule();
        await fetchInsights();
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };


  // Run CP-SAT schedule generation
  const handleGenerateSchedule = async () => {
    setIsRescheduling(true);
    try {
      const res = await fetch("http://localhost:8000/api/schedule/generate", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setScheduleBlocks(data);
      }
    } catch (err) {
      console.error("Failed to generate schedule:", err);
    } finally {
      setIsRescheduling(false);
    }
  };

  // Dynamic reschedule
  const handleReschedule = async () => {
    setIsRescheduling(true);
    try {
      const res = await fetch("http://localhost:8000/api/schedule/reschedule", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setScheduleBlocks(data);
      }
    } catch (err) {
      console.error("Failed to reschedule:", err);
    } finally {
      setIsRescheduling(false);
    }
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Goal Progress Helpers
  const completedTasksCount = tasks.filter(t => t.completed).length;
  const totalTasksCount = tasks.length;
  const taskProgressPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-gray-950 to-gray-950 pointer-events-none"></div>

      {/* Top Navbar */}
      <header className="z-10 border-b border-gray-900 bg-gray-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView("home")}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">AI Time Assistant</span>
        </div>

        <nav className="flex gap-1 bg-gray-900/60 p-1.5 rounded-2xl border border-gray-800/80">
          <button 
            onClick={() => setView("home")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${view === "home" ? "bg-indigo-600 text-white shadow-md" : "text-gray-400 hover:text-gray-200"}`}>
            Home
          </button>
          <button 
            onClick={() => setView("focus")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${view === "focus" ? "bg-indigo-600 text-white shadow-md" : "text-gray-400 hover:text-gray-200"}`}>
            Focus Mode
          </button>
          <button 
            onClick={() => setView("schedule")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${view === "schedule" ? "bg-indigo-600 text-white shadow-md" : "text-gray-400 hover:text-gray-200"}`}>
            Schedule
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 z-10 w-full max-w-6xl mx-auto">
        
        {/* VIEW 1: HOME */}
        {view === "home" && (
          <div className="text-center max-w-3xl flex flex-col items-center justify-center w-full animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-6">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
              AI-Powered Adaptive Assistant
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 mb-6 leading-tight">
              Master Your Time, <br/> Effortlessly
            </h1>
            <p className="text-lg md:text-xl text-gray-400 mb-8 font-light max-w-2xl">
              Upload class syllabus PDFs, speak voice tasks naturally, or sync your inbox. Let Google OR-Tools optimize your daily workspace.
            </p>

            {/* AI Real-time Insights Bar */}
            {insights.length > 0 && (
              <div className="w-full max-w-2xl mb-8 space-y-3">
                {insights.map((insight, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-2xl border text-sm text-left flex items-start gap-3 backdrop-blur-md transition-all duration-300 shadow-lg ${
                      insight.severity === "critical" ? "bg-red-500/10 border-red-500/30 text-red-300" :
                      insight.severity === "warning" ? "bg-amber-500/10 border-amber-500/30 text-amber-300" :
                      insight.severity === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" :
                      "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                    }`}>
                    <span className="text-lg leading-none mt-0.5">
                      {insight.severity === "critical" ? "⚠️" :
                       insight.severity === "warning" ? "🔔" :
                       insight.severity === "success" ? "💡" : "⚡"}
                    </span>
                    <div>
                      <span className="font-semibold block mb-0.5">
                        {insight.severity === "critical" ? "Critical Risk" :
                         insight.severity === "warning" ? "Productivity Warning" :
                         insight.severity === "success" ? "AI Behavioral Insight" : "System Status Update"}
                      </span>
                      <p className="font-light text-xs opacity-90">{insight.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AI Creation Container */}
            <div className="w-full max-w-2xl bg-gray-900/60 border border-gray-800 rounded-3xl p-6 mb-8 shadow-2xl backdrop-blur-md text-left">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-200 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="indigo" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  AI NLP Task Creator
                </h3>
                <button 
                  onClick={() => setShowManualForm(!showManualForm)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                  {showManualForm ? "Use AI NLP Input" : "Add Task Manually"}
                </button>
              </div>
              
              {!showManualForm ? (
                <form onSubmit={handleNLSubmit} className="flex gap-2 mb-4">
                  <input 
                    type="text" 
                    value={naturalLanguageInput}
                    onChange={(e) => setNaturalLanguageInput(e.target.value)}
                    placeholder="e.g. 'I have an AI assignment due next Friday at 6pm'" 
                    disabled={isProcessingInput}
                    className="flex-1 bg-gray-950 border border-gray-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 text-gray-200"
                  />
                  <button 
                    type="submit"
                    disabled={isProcessingInput || !naturalLanguageInput}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-50 px-6 rounded-2xl text-sm font-semibold transition-all">
                    {isProcessingInput ? "Processing..." : "Generate"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleManualSubmit} className="space-y-4 mb-4 bg-gray-950/40 p-4 border border-gray-800 rounded-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xxs uppercase tracking-wider text-gray-500 block mb-1">Task Title</label>
                      <input 
                        type="text" 
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        placeholder="e.g. Write literature review" 
                        required
                        className="w-full bg-gray-950 border border-gray-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-gray-200"
                      />
                    </div>
                    <div>
                      <label className="text-xxs uppercase tracking-wider text-gray-500 block mb-1">Deadline Date & Time</label>
                      <input 
                        type="datetime-local" 
                        value={manualDeadline}
                        onChange={(e) => setManualDeadline(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-gray-200"
                      />
                    </div>
                    <div>
                      <label className="text-xxs uppercase tracking-wider text-gray-500 block mb-1">Priority (1 - 5)</label>
                      <select 
                        value={manualPriority}
                        onChange={(e) => setManualPriority(Number(e.target.value))}
                        className="w-full bg-gray-950 border border-gray-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-gray-200">
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
                        value={manualDuration}
                        onChange={(e) => setManualDuration(Number(e.target.value))}
                        placeholder="45"
                        min={5}
                        required
                        className="w-full bg-gray-950 border border-gray-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-gray-200"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button 
                      type="button" 
                      onClick={() => setShowManualForm(false)}
                      className="px-4 py-2 border border-gray-800 rounded-xl text-xs font-semibold text-gray-400 hover:text-gray-200">
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold">
                      Add Task
                    </button>
                  </div>
                </form>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-800/80">
                <div className="flex flex-wrap gap-2">
                  {/* PDF Upload */}
                  <input 
                    type="file" 
                    accept=".pdf,text/plain" 
                    onChange={handleFileUpload} 
                    ref={fileInputRef} 
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-4 py-2.5 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-800 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                    {isUploading ? "Reading PDF..." : "Upload Syllabus / PDF"}
                  </button>

                  {/* Sync Emails */}
                  <button 
                    onClick={handleSyncEmails}
                    disabled={isSyncingEmails}
                    className="px-4 py-2.5 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-800 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    {isSyncingEmails ? "Syncing..." : "Sync Emails"}
                  </button>
                </div>

                {/* Voice Note Creation */}
                <div>
                  {isRecording ? (
                    <button 
                      onClick={stopRecording}
                      className="px-4 py-2.5 bg-red-600 hover:bg-red-500 border border-red-500 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all animate-pulse">
                      <span className="w-2.5 h-2.5 bg-white rounded-full"></span>
                      Stop Recording ({recordingSeconds}s)
                    </button>
                  ) : (
                    <button 
                      onClick={startRecording}
                      className="px-4 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>
                      Speak Task
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Goal Progress Tracker */}
            {totalTasksCount > 0 && (
              <div className="w-full max-w-2xl bg-gray-900/40 border border-gray-900 rounded-3xl p-6 mb-8 shadow-xl text-left">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-300">Goal Completion Progress</span>
                  <span className="text-sm font-bold text-indigo-400">{taskProgressPercentage}% ({completedTasksCount}/{totalTasksCount} tasks)</span>
                </div>
                <div className="w-full bg-gray-950 h-3.5 rounded-full overflow-hidden border border-gray-800">
                  <div 
                    className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 h-full transition-all duration-500" 
                    style={{ width: `${taskProgressPercentage}%` }}>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Tasks Quick-View */}
            {totalTasksCount > 0 && (
              <div className="w-full max-w-2xl bg-gray-900/45 border border-gray-900 rounded-3xl p-6 mb-8 shadow-xl text-left">
                <h3 className="font-semibold text-sm text-gray-300 mb-4 flex items-center justify-between">
                  <span>Recent Tasks</span>
                  <button 
                    onClick={() => setView("schedule")}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                    View Full Schedule →
                  </button>
                </h3>
                <div className="space-y-3">
                  {tasks.slice(-5).reverse().map(task => (
                    <div key={task.id} className={`p-3.5 border rounded-2xl flex items-center justify-between transition-all duration-300 ${
                      task.completed 
                        ? "bg-gray-950/25 border-gray-900/60 opacity-60" 
                        : "bg-gray-950/40 border-gray-900/50 hover:border-gray-800"
                    }`}>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => toggleTask(task.id, task.completed)}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                            task.completed ? "bg-emerald-600 border-emerald-500 text-white" : "border-gray-750 hover:border-gray-500"
                          }`}>
                          {task.completed && <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </button>
                        <div>
                          <span className={`block font-medium text-sm ${task.completed ? "line-through text-gray-500" : "text-gray-200"}`}>{task.title}</span>
                          {task.deadline && (
                            <span className="text-2xs text-gray-500 font-light">
                              Due: {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.completed ? (
                          <span className="px-2 py-0.5 rounded-lg text-xxs font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Completed
                          </span>
                        ) : (
                          <>
                            <span className="px-2 py-0.5 rounded-lg text-xxs font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {task.estimated_duration}m
                            </span>
                            <span className="px-2 py-0.5 rounded-lg text-xxs font-semibold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                              P{task.priority}
                            </span>
                          </>
                        )}
                        <button 
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-red-400 transition-all"
                          title="Delete task">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <p className="text-gray-500 text-xs font-light text-center py-4">No tasks found. Use the AI panel to create one.</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button onClick={() => setView("focus")} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-all">Start Session</button>
              <button onClick={() => setView("schedule")} className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-semibold transition-all border border-gray-800">View Schedule</button>
            </div>
          </div>
        )}

        {/* VIEW 2: FOCUS MODE & ANALYTICS */}
        {view === "focus" && (
          <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-fade-in">
            
            {/* Left: Pomodoro Timer */}
            <div className="flex flex-col items-center bg-gray-900/40 border border-gray-900 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
              <h2 className="text-2xl font-bold mb-2">Focus Mode</h2>
              <p className="text-gray-400 text-sm mb-6">{isBreak ? "Rest Period" : "Deep Work Session"}</p>

              <div className="relative w-64 h-64 flex items-center justify-center rounded-full border-4 border-indigo-900 bg-gray-950/40 backdrop-blur-sm mb-6 shadow-xl">
                <div className="text-center">
                  <div className="text-5xl font-mono font-bold tracking-tight">
                    {timerMinutes.toString().padStart(2, '0')}:{timerSeconds.toString().padStart(2, '0')}
                  </div>
                  <span className="text-xs uppercase tracking-widest text-indigo-400 font-semibold mt-2 block">
                    {isBreak ? "Break" : "Active Focus"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 w-full mb-6">
                <button 
                  onClick={toggleTimer}
                  className={`flex-1 py-3.5 rounded-xl font-semibold transition-all duration-300 transform hover:scale-102 ${isActive ? "bg-amber-600 hover:bg-amber-500" : "bg-indigo-600 hover:bg-indigo-500"}`}>
                  {isActive ? "Pause" : "Start Session"}
                </button>
                <button 
                  onClick={resetTimer}
                  className="px-5 py-3.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl font-medium transition-all">
                  Reset
                </button>
              </div>

              {/* Micro Session Stats */}
              <div className="grid grid-cols-3 gap-4 w-full text-center">
                <div className="p-3 bg-gray-950/40 border border-gray-900 rounded-xl">
                  <span className="block text-xl font-bold text-indigo-400">92</span>
                  <span className="text-xxs text-gray-500 uppercase tracking-wider">Focus</span>
                </div>
                <div className="p-3 bg-gray-950/40 border border-gray-900 rounded-xl">
                  <span className="block text-xl font-bold text-indigo-400">5d</span>
                  <span className="text-xxs text-gray-500 uppercase tracking-wider">Streak</span>
                </div>
                <div className="p-3 bg-gray-950/40 border border-gray-900 rounded-xl">
                  <span className="block text-xl font-bold text-indigo-400">180m</span>
                  <span className="text-xxs text-gray-500 uppercase tracking-wider">Time</span>
                </div>
              </div>
            </div>

            {/* Right: Live Activity & Analytics */}
            <div className="flex flex-col gap-6 w-full">
              
              {/* Privacy Setting Card */}
              <div className="bg-gray-900/40 border border-gray-900 rounded-3xl p-6 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg">Privacy & Monitoring</h3>
                    <p className="text-xs text-gray-500">Track local desktop activity to generate insights</p>
                  </div>
                  <button 
                    onClick={toggleTracking}
                    className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 ${trackingEnabled ? "bg-indigo-600" : "bg-gray-800"}`}>
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform duration-300 transform ${trackingEnabled ? "translate-x-6" : "translate-x-0"}`}></div>
                  </button>
                </div>
                
                {trackingEnabled ? (
                  <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                    Local activity tracking agent is active. Telemetry is scrubbed locally.
                  </div>
                ) : (
                  <div className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl">
                    Activity tracking is disabled. Focus analysis is paused.
                  </div>
                )}
              </div>

              {/* Productivity SVG Trend Chart */}
              {trackingEnabled && (
                <div className="bg-gray-900/40 border border-gray-900 rounded-3xl p-6 backdrop-blur-xl shadow-2xl text-left">
                  <h3 className="font-bold text-sm text-gray-300 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="indigo" strokeWidth="2.5"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                    Focus Score Trend (Last 6 Hours)
                  </h3>
                  
                  {/* Custom Responsive SVG Chart */}
                  <div className="w-full h-36">
                    <svg viewBox="0 0 500 150" className="w-full h-full">
                      <defs>
                        <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4"/>
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0"/>
                        </linearGradient>
                      </defs>
                      
                      {/* Grid Lines */}
                      <line x1="0" y1="37.5" x2="500" y2="37.5" stroke="#1f2937" strokeWidth="1" strokeDasharray="5,5" />
                      <line x1="0" y1="75" x2="500" y2="75" stroke="#1f2937" strokeWidth="1" strokeDasharray="5,5" />
                      <line x1="0" y1="112.5" x2="500" y2="112.5" stroke="#1f2937" strokeWidth="1" strokeDasharray="5,5" />

                      {/* Area Fill */}
                      <path 
                        d="M 20 150 L 20 90 Q 100 50 180 30 T 340 120 T 480 35 L 480 150 Z" 
                        fill="url(#chart-grad)" 
                      />
                      
                      {/* Line Stroke */}
                      <path 
                        d="M 20 90 Q 100 50 180 30 T 340 120 T 480 35" 
                        fill="none" 
                        stroke="#6366f1" 
                        strokeWidth="3.5" 
                        strokeLinecap="round"
                      />

                      {/* Nodes */}
                      <circle cx="20" cy="90" r="4.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                      <circle cx="180" cy="30" r="4.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                      <circle cx="340" cy="120" r="4.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                      <circle cx="480" cy="35" r="4.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />

                      {/* Labels */}
                      <text x="20" y="145" fill="#6b7280" fontSize="10" textAnchor="middle">10:00</text>
                      <text x="180" y="145" fill="#6b7280" fontSize="10" textAnchor="middle">12:00</text>
                      <text x="340" y="145" fill="#6b7280" fontSize="10" textAnchor="middle">14:00</text>
                      <text x="480" y="145" fill="#6b7280" fontSize="10" textAnchor="middle">16:00</text>
                    </svg>
                  </div>
                </div>
              )}

              {/* Activity Summary Stats */}
              <div className="bg-gray-900/40 border border-gray-900 rounded-3xl p-6 backdrop-blur-xl shadow-2xl grid grid-cols-2 gap-4">
                
                <div className="col-span-2 p-4 bg-gray-950/40 border border-gray-900 rounded-2xl">
                  <span className="text-xxs uppercase tracking-wider text-gray-500 block mb-1">Active Project Workspace</span>
                  <span className="text-lg font-bold text-gray-200 truncate block">
                    {trackingEnabled ? activitySummary.active_project : "Tracking Disabled"}
                  </span>
                </div>

                <div className="p-4 bg-gray-950/40 border border-gray-900 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-xxs uppercase tracking-wider text-gray-500 block mb-1">Focus Score</span>
                    <span className="text-3xl font-extrabold text-indigo-400">
                      {trackingEnabled ? activitySummary.focus_score : "—"}
                    </span>
                  </div>
                  <span className="text-2xs text-gray-500 block mt-2">Ratio of focus vs. distractions</span>
                </div>

                <div className="p-4 bg-gray-950/40 border border-gray-900 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-xxs uppercase tracking-wider text-gray-500 block mb-1">Telemetry Metrics</span>
                    <div className="space-y-1.5 mt-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Productive:</span>
                        <span className="font-semibold text-emerald-400">{trackingEnabled ? `${activitySummary.productive_minutes}m` : "—"}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Distractions:</span>
                        <span className="font-semibold text-red-400">{trackingEnabled ? `${activitySummary.distracting_minutes}m` : "—"}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-2xs text-gray-500 block mt-1">Updates live every 5s</span>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* VIEW 3: SCHEDULE */}
        {view === "schedule" && (
          <div className="w-full max-w-2xl bg-gray-900/40 border border-gray-900 rounded-3xl p-6 backdrop-blur-xl shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Daily Timeline</h2>
                <p className="text-gray-400 text-sm">AI optimized schedule via Google OR-Tools</p>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={handleGenerateSchedule}
                  disabled={isRescheduling}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all">
                  Optimize
                </button>
                <button 
                  onClick={handleReschedule}
                  disabled={isRescheduling}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 rounded-xl text-sm font-medium border border-gray-700 transition-all flex items-center gap-2">
                  {isRescheduling && <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>}
                  Reschedule
                </button>
              </div>
            </div>

            {/* Timeline Schedule Blocks */}
            {scheduleBlocks.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-800 rounded-2xl text-gray-500 flex flex-col items-center justify-center gap-4">
                <span>No schedule computed. If you have tasks, let the solver organize your work!</span>
                <button 
                  onClick={handleGenerateSchedule}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg transition-all">
                  Run OR-Tools Solver
                </button>
              </div>
            ) : (
              <div className="relative pl-6 border-l-2 border-indigo-900/50 space-y-6">
                {scheduleBlocks.map((block) => (
                  <div key={block.id} className="relative group">
                    {/* Time Dot Indicator */}
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
                          : "bg-gray-900/60 border-gray-800/80 hover:border-indigo-800/50" 
                        : "bg-gray-950/40 border-dashed border-gray-850 text-gray-400 font-light"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {block.task_id && (
                            <button 
                              onClick={() => toggleTask(block.task_id!, block.task?.completed || false)}
                              className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                block.task?.completed ? "bg-emerald-600 border-emerald-500 text-white" : "border-gray-750 hover:border-gray-500"
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
                            <span className="px-2 py-0.5 rounded-lg text-xxs font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              Priority {block.task?.priority}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-xxs font-medium tracking-wide bg-gray-800/40 text-gray-500 border border-gray-800/30">
                              Buffer
                            </span>
                          )}
                          {block.task_id && (
                            <button 
                              onClick={() => handleDeleteTask(block.task_id!)}
                              className="p-1 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-red-400 transition-all"
                              title="Delete task">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>
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

      </main>
    </div>
  );
}
