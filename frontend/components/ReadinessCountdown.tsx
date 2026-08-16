"use client";
import { useState } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ReadinessCountdownProps {
  username: string;
  data: any;
}

export default function ReadinessCountdown({ username, data }: ReadinessCountdownProps) {
  const [jd, setJd] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedWeek, setExpandedWeek] = useState<number | null>(0);

  const analyze = async () => {
    if (!jd.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setExpandedWeek(0);
    try {
      const res = await axios.post(`${API}/api/jd-readiness`, {
        username,
        jobDescription: jd,
        context: {
          top_skills: data.top_skills,
          archetype: data.archetype,
          role_fit: data.role_fit,
          gap_analysis: data.gap_analysis,
          interview_readiness: data.interview_readiness,
        },
      });
      setResult(res.data);
    } catch {
      setError("Failed to analyze job description. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (s: number) =>
    s >= 75 ? "text-green-400" : s >= 50 ? "text-yellow-400" : "text-red-400";
  const barColor = (s: number) =>
    s >= 75 ? "bg-green-400" : s >= 50 ? "bg-yellow-400" : "bg-red-400";
  const importanceBadge = (i: string) =>
    i === "critical"
      ? "bg-red-500/15 text-red-400 border-red-500/20"
      : i === "important"
      ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20"
      : "bg-slate-500/15 text-slate-400 border-slate-500/20";

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/5">
      <h3 className="text-slate-400 text-sm uppercase tracking-widest mb-2">Readiness Countdown</h3>
      <p className="text-slate-500 text-sm mb-4">
        Paste a job description to get a gap score and week-by-week prep plan.
      </p>

      {!result && (
        <>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description here…"
            rows={7}
            className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand resize-none mb-3"
          />
          <button
            onClick={analyze}
            disabled={loading || !jd.trim()}
            className="bg-brand hover:bg-brand-dark disabled:opacity-40 text-white px-6 py-2.5 rounded-xl text-sm transition-all"
          >
            {loading ? "Analyzing…" : "🎯 Analyze Readiness"}
          </button>
        </>
      )}

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

      {result && (
        <div className="space-y-5 mt-2">
          {/* Score hero */}
          <div className="bg-surface rounded-xl p-5 border border-white/5 flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <circle
                  cx="36" cy="36" r="30" fill="none"
                  stroke={result.gap_score >= 75 ? "#4ade80" : result.gap_score >= 50 ? "#facc15" : "#f87171"}
                  strokeWidth="8"
                  strokeDasharray={`${(result.gap_score / 100) * 188.5} 188.5`}
                  strokeLinecap="round"
                />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-xl font-bold ${scoreColor(result.gap_score)}`}>
                {result.gap_score}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium mb-1">Gap Score</p>
              <p className="text-slate-400 text-sm leading-relaxed">{result.verdict}</p>
              {result.total_weeks_to_ready > 0 && (
                <p className="text-brand text-xs mt-2">
                  ⏱ ~{result.total_weeks_to_ready} week{result.total_weeks_to_ready !== 1 ? "s" : ""} to job-ready
                </p>
              )}
            </div>
          </div>

          {/* Matched vs Missing */}
          <div className="grid md:grid-cols-2 gap-4">
            {result.matched_skills?.length > 0 && (
              <div className="bg-surface rounded-xl p-4 border border-white/5">
                <h4 className="text-slate-400 text-xs uppercase tracking-widest mb-3">You Already Have</h4>
                <div className="flex flex-wrap gap-2">
                  {result.matched_skills.map((s: string, i: number) => (
                    <span key={i} className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-full">
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {result.missing_skills?.length > 0 && (
              <div className="bg-surface rounded-xl p-4 border border-white/5">
                <h4 className="text-slate-400 text-xs uppercase tracking-widest mb-3">Gaps to Close</h4>
                <ul className="space-y-2">
                  {result.missing_skills.map((s: any, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${importanceBadge(s.importance)}`}>
                        {s.importance}
                      </span>
                      <span className="text-slate-300">{s.skill}</span>
                      {s.estimated_weeks > 0 && (
                        <span className="text-slate-500 text-xs ml-auto flex-shrink-0">~{s.estimated_weeks}w</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Quick Wins */}
          {result.quick_wins?.length > 0 && (
            <div className="bg-brand/5 border border-brand/15 rounded-xl p-4">
              <h4 className="text-brand text-xs uppercase tracking-widest mb-2">⚡ Quick Wins This Week</h4>
              <ul className="space-y-1.5">
                {result.quick_wins.map((w: string, i: number) => (
                  <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                    <span className="text-brand mt-0.5 flex-shrink-0">→</span> {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weekly Plan */}
          {result.weekly_plan?.length > 0 && (
            <div className="bg-surface rounded-xl p-4 border border-white/5">
              <h4 className="text-slate-400 text-xs uppercase tracking-widest mb-3">Week-by-Week Prep Plan</h4>
              <div className="space-y-2">
                {result.weekly_plan.map((week: any, i: number) => (
                  <div key={i} className="border border-white/5 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedWeek(expandedWeek === i ? null : i)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/3 transition-all"
                    >
                      <span className="w-6 h-6 rounded-full bg-brand/15 text-brand text-xs flex items-center justify-center flex-shrink-0 font-medium">
                        {week.week}
                      </span>
                      <span className="text-white text-sm flex-1">{week.goal}</span>
                      <span className="text-slate-500 text-xs">{expandedWeek === i ? "▲" : "▼"}</span>
                    </button>
                    {expandedWeek === i && (
                      <ul className="px-4 pb-3 space-y-1.5 border-t border-white/5">
                        {week.tasks?.map((task: string, j: number) => (
                          <li key={j} className="text-slate-400 text-sm flex items-start gap-2 pt-1.5">
                            <span className="text-slate-600 mt-0.5 flex-shrink-0">•</span> {task}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setResult(null)}
            className="text-xs text-slate-500 hover:text-brand transition-all"
          >
            ↺ Analyze a different JD
          </button>
        </div>
      )}
    </div>
  );
}
