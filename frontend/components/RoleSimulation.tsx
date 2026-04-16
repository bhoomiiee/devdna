"use client";
import { useState } from "react";
import axios from "axios";

const ROLES = [
  "Frontend Engineer @ Startup",
  "Backend Engineer @ FAANG",
  "Full Stack Developer",
  "DevOps / Platform Engineer",
  "AI/ML Engineer",
  "Mobile Developer",
  "Open Source Maintainer",
];

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface RoleSimulationProps {
  username: string;
  data: any;
}

export default function RoleSimulation({ username, data }: RoleSimulationProps) {
  const [selectedRole, setSelectedRole] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const simulate = async () => {
    if (!selectedRole) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post(`${API}/api/role-simulation`, {
        username,
        role: selectedRole,
        context: {
          top_skills: data.top_skills,
          dna_scores: data.dna_scores,
          role_fit: data.role_fit,
          archetype: data.archetype,
          gap_analysis: data.gap_analysis,
        },
      });
      setResult(res.data);
    } catch {
      setResult({ error: "Failed to simulate role" });
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (s: number) =>
    s >= 75 ? "text-green-400" : s >= 50 ? "text-yellow-400" : "text-red-400";

  const importanceColor = (i: string) =>
    i === "critical" ? "bg-red-500/20 text-red-400" :
    i === "important" ? "bg-yellow-500/20 text-yellow-400" :
    "bg-slate-500/20 text-slate-400";

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/5">
      <h3 className="text-slate-400 text-sm mb-4 uppercase tracking-widest">Role Simulation</h3>
      <p className="text-slate-400 text-sm mb-4">Select a role to see how ready {username} is for it.</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {ROLES.map((r) => (
          <button key={r} onClick={() => setSelectedRole(r)}
            className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
              selectedRole === r
                ? "bg-brand border-brand text-white"
                : "border-white/10 text-slate-400 hover:border-brand"
            }`}>
            {r}
          </button>
        ))}
      </div>

      <button onClick={simulate} disabled={!selectedRole || loading}
        className="bg-brand hover:bg-brand-dark disabled:opacity-40 text-white px-6 py-2.5 rounded-xl text-sm mb-6 transition-all">
        {loading ? "Evaluating..." : "Simulate"}
      </button>

      {result && !result.error && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className={`text-5xl font-bold ${scoreColor(result.readiness_score)}`}>
              {result.readiness_score}%
            </div>
            <div>
              <p className="text-white font-medium">{selectedRole}</p>
              <p className="text-slate-400 text-sm mt-1">{result.verdict}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-slate-400 text-xs uppercase tracking-widest mb-2">Strong Areas</h4>
              <ul className="space-y-1">
                {result.strong_areas?.map((a: string, i: number) => (
                  <li key={i} className="text-green-400 text-sm flex items-center gap-2">
                    <span className="text-green-400">+</span> {a}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-slate-400 text-xs uppercase tracking-widest mb-2">Missing Skills</h4>
              <ul className="space-y-2">
                {result.missing_skills?.map((s: any, i: number) => (
                  <li key={i} className="text-sm">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${importanceColor(s.importance)}`}>
                        {s.importance}
                      </span>
                      <span className="text-white">{s.skill}</span>
                    </div>
                    <p className="text-slate-500 text-xs pl-1">{s.how_to_learn}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-3 text-sm text-slate-400">
            Timeline: <span className="text-white">{result.timeline}</span>
          </div>
        </div>
      )}
    </div>
  );
}
