"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const OPERATIONS = [
  { id: "analyze", label: "Analyze Developer", icon: "🧬", fields: ["username"] },
  { id: "roast", label: "GitHub Roast", icon: "🔥", fields: ["username"] },
  { id: "gap_analysis", label: "Gap Analysis", icon: "🎯", fields: ["username"] },
  { id: "interview_readiness", label: "Interview Readiness", icon: "🎤", fields: ["username"] },
  { id: "compare", label: "Compare Developers", icon: "⚔️", fields: ["user1", "user2"] },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400 bg-yellow-400/10",
  running: "text-blue-400 bg-blue-400/10",
  success: "text-green-400 bg-green-400/10",
  failed: "text-red-400 bg-red-400/10",
};

export default function TasksPage() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedOp, setSelectedOp] = useState(OPERATIONS[0]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [activeTask, setActiveTask] = useState<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("devdna_token");
    if (t) { setToken(t); fetchTasks(t); }
  }, []);

  const fetchTasks = async (t: string) => {
    try {
      const res = await axios.get(`${API}/api/tasks`, { headers: { Authorization: `Bearer ${t}` } });
      setTasks(res.data);
    } catch { setToken(null); localStorage.removeItem("devdna_token"); }
  };

  const handleAuth = async () => {
    setAuthError("");
    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await axios.post(`${API}${endpoint}`, { email, password });
      if (authMode === "register") { setAuthMode("login"); return; }
      const t = res.data.token;
      localStorage.setItem("devdna_token", t);
      setToken(t);
      fetchTasks(t);
    } catch (err: any) {
      setAuthError(err.response?.data?.error || "Auth failed");
    }
  };

  const createTask = async () => {
    if (!token) return;
    setCreating(true);
    try {
      const res = await axios.post(`${API}/api/tasks`,
        { operation: selectedOp.id, input: inputs },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const task = res.data;
      setTasks((prev) => [task, ...prev]);
      setActiveTask(task);
      streamTask(task.id);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const streamTask = (taskId: string) => {
    eventSourceRef.current?.close();
    const es = new EventSource(`${API}/api/tasks/${taskId}/stream?token=${token}`);
    es.onmessage = (e) => {
      const updated = JSON.parse(e.data);
      setActiveTask(updated);
      setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
      if (updated.status === "success" || updated.status === "failed") es.close();
    };
    eventSourceRef.current = es;
  };

  const logout = () => {
    localStorage.removeItem("devdna_token");
    setToken(null);
    setTasks([]);
  };

  if (!token) return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="bg-card rounded-2xl p-8 w-full max-w-sm border border-white/5">
        <h1 className="text-2xl font-bold text-white mb-2">DevDNA Tasks</h1>
        <p className="text-slate-400 text-sm mb-6">Sign in to run AI tasks on GitHub profiles</p>
        <div className="flex gap-2 mb-4">
          {(["login", "register"] as const).map((m) => (
            <button key={m} onClick={() => setAuthMode(m)}
              className={`flex-1 py-2 rounded-xl text-sm transition-all ${authMode === m ? "bg-brand text-white" : "bg-surface text-slate-400 border border-white/10"}`}>
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand mb-3 text-sm" />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAuth()}
          className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand mb-4 text-sm" />
        {authError && <p className="text-red-400 text-xs mb-3">{authError}</p>}
        <button onClick={handleAuth} className="w-full bg-brand hover:bg-brand-dark text-white py-3 rounded-xl text-sm font-medium">
          {authMode === "login" ? "Sign In" : "Create Account"}
        </button>
        <a href="/" className="block text-center text-slate-500 hover:text-white text-xs mt-4">← Back to DevDNA</a>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-surface px-4 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Task Runner</h1>
          <p className="text-slate-400 text-sm">Queue and track AI analysis tasks</p>
        </div>
        <div className="flex gap-3">
          <a href="/" className="text-sm bg-card border border-white/10 text-slate-400 hover:text-white px-4 py-2 rounded-xl">← Home</a>
          <button onClick={logout} className="text-sm bg-card border border-white/10 text-slate-400 hover:text-white px-4 py-2 rounded-xl">Logout</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Create Task */}
        <div className="bg-card rounded-2xl p-6 border border-white/5">
          <h2 className="text-white font-semibold mb-4">New Task</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {OPERATIONS.map((op) => (
              <button key={op.id} onClick={() => { setSelectedOp(op); setInputs({}); }}
                className={`text-sm px-3 py-1.5 rounded-full border transition-all ${selectedOp.id === op.id ? "bg-brand border-brand text-white" : "border-white/10 text-slate-400 hover:border-brand"}`}>
                {op.icon} {op.label}
              </button>
            ))}
          </div>
          {selectedOp.fields.map((field) => (
            <input key={field} placeholder={field === "username" ? "GitHub username" : `${field} username`}
              value={inputs[field] || ""}
              onChange={(e) => setInputs((prev) => ({ ...prev, [field]: e.target.value }))}
              className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand mb-3 text-sm" />
          ))}
          <button onClick={createTask} disabled={creating || selectedOp.fields.some(f => !inputs[f])}
            className="w-full bg-brand hover:bg-brand-dark disabled:opacity-40 text-white py-3 rounded-xl text-sm font-medium">
            {creating ? "Queuing..." : "Run Task →"}
          </button>
        </div>

        {/* Active Task */}
        <div className="bg-card rounded-2xl p-6 border border-white/5">
          <h2 className="text-white font-semibold mb-4">Live Output</h2>
          {activeTask ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[activeTask.status]}`}>
                  {activeTask.status === "running" && <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse mr-1" />}
                  {activeTask.status}
                </span>
                <span className="text-slate-400 text-xs">{activeTask.operation}</span>
              </div>
              <div className="bg-surface rounded-xl p-3 mb-3 font-mono text-xs text-slate-400 max-h-32 overflow-y-auto">
                {activeTask.logs?.map((log: string, i: number) => <div key={i}>{log}</div>)}
              </div>
              {activeTask.result && (
                <div className="bg-surface rounded-xl p-3 text-sm text-slate-300 leading-relaxed">
                  {typeof activeTask.result === "object"
                    ? Object.entries(activeTask.result).map(([k, v]) => (
                        <div key={k} className="mb-2">
                          <span className="text-brand text-xs uppercase">{k}: </span>
                          <span>{String(v)}</span>
                        </div>
                      ))
                    : String(activeTask.result)}
                </div>
              )}
              {activeTask.error && <p className="text-red-400 text-sm">{activeTask.error}</p>}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Run a task to see live output here</p>
          )}
        </div>
      </div>

      {/* Task History */}
      <div className="mt-6 bg-card rounded-2xl p-6 border border-white/5">
        <h2 className="text-white font-semibold mb-4">Task History</h2>
        {tasks.length === 0 ? (
          <p className="text-slate-500 text-sm">No tasks yet</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} onClick={() => setActiveTask(task)}
                className="flex items-center justify-between bg-surface rounded-xl p-3 cursor-pointer hover:border-brand border border-white/5 transition-all">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status]}`}>{task.status}</span>
                  <span className="text-white text-sm">{task.operation}</span>
                  <span className="text-slate-500 text-xs">{JSON.stringify(task.input)}</span>
                </div>
                <span className="text-slate-600 text-xs">{new Date(task.createdAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
