"use client";
import { useState } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ExplainRepoProps {
  username: string;
  repos: { name: string; language: string | null; stars: number; description: string }[];
}

export default function ExplainRepo({ username, repos }: ExplainRepoProps) {
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const explain = async () => {
    if (!selected) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post(`${API}/api/explain-repo`, { username, repo: selected });
      setResult(res.data);
    } catch {
      setResult({ error: "Failed to explain repo. Try again." });
    } finally {
      setLoading(false);
    }
  };

  const complexityColor = (c: string) =>
    c === "advanced" ? "text-red-400" : c === "intermediate" ? "text-yellow-400" : "text-green-400";

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/5">
      <h3 className="text-slate-400 text-sm mb-4 uppercase tracking-widest">Explain My Codebase</h3>
      <p className="text-slate-400 text-sm mb-4">Select a repo and AI will explain its architecture and purpose.</p>

      <div className="flex gap-3 mb-4">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}
          className="flex-1 bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand">
          <option value="">Select a repository...</option>
          {repos.map((r) => (
            <option key={r.name} value={r.name}>
              {r.name} {r.language ? `(${r.language})` : ""} — {r.stars} stars
            </option>
          ))}
        </select>
        <button onClick={explain} disabled={!selected || loading}
          className="bg-brand hover:bg-brand-dark disabled:opacity-40 text-white px-5 py-2.5 rounded-xl text-sm transition-all">
          {loading ? "Analyzing..." : "Explain"}
        </button>
      </div>

      {result && !result.error && (
        <div className="space-y-4">
          <div className="bg-surface rounded-xl p-4">
            <p className="text-slate-300 leading-relaxed">{result.summary}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-slate-400 text-xs uppercase tracking-widest mb-2">Tech Stack</h4>
              <div className="flex flex-wrap gap-2">
                {result.tech_stack?.map((t: string) => (
                  <span key={t} className="text-xs bg-brand/20 text-brand px-2.5 py-1 rounded-full">{t}</span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-slate-400 text-xs uppercase tracking-widest mb-2">Key Features</h4>
              <ul className="space-y-1">
                {result.key_features?.map((f: string, i: number) => (
                  <li key={i} className="text-slate-300 text-sm flex items-center gap-2">
                    <span className="text-brand text-xs">-</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="bg-surface rounded-xl p-4">
            <h4 className="text-slate-400 text-xs uppercase tracking-widest mb-2">Architecture</h4>
            <p className="text-slate-300 text-sm">{result.architecture}</p>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Complexity: <span className={complexityColor(result.complexity)}>{result.complexity}</span></span>
            <span className="text-slate-400 text-xs">{result.use_case}</span>
          </div>
        </div>
      )}

      {result?.error && (
        <p className="text-red-400 text-sm">{result.error}</p>
      )}
    </div>
  );
}
