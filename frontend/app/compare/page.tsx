"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import dynamic from "next/dynamic";
import {
  Chart as ChartJS, RadialLinearScale, PointElement,
  LineElement, Filler, Tooltip, Legend,
} from "chart.js";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const Radar = dynamic(() => import("react-chartjs-2").then((m) => m.Radar), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function CompareContent() {
  const searchParams = useSearchParams();
  const [u1, setU1] = useState(searchParams.get("u1") || "");
  const [u2, setU2] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const compare = async () => {
    if (!u1.trim() || !u2.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await axios.get(`${API}/api/compare/${u1.trim()}/${u2.trim()}`);
      setResult(res.data);
    } catch {
      setError("Failed to compare. Check both usernames and try again.");
    } finally {
      setLoading(false);
    }
  };

  const radarData = result ? {
    labels: ["Consistency", "Diversity", "Complexity", "Docs", "Collaboration"],
    datasets: [
      {
        label: result.user1.username,
        data: Object.values(result.user1.dna),
        backgroundColor: "rgba(108,99,255,0.15)",
        borderColor: "#6C63FF",
        borderWidth: 2,
        pointBackgroundColor: "#6C63FF",
      },
      {
        label: result.user2.username,
        data: Object.values(result.user2.dna),
        backgroundColor: "rgba(255,101,132,0.15)",
        borderColor: "#FF6584",
        borderWidth: 2,
        pointBackgroundColor: "#FF6584",
      },
    ],
  } : null;

  return (
    <main className="min-h-screen bg-surface px-4 py-10 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <a href="/" className="text-slate-500 hover:text-white text-sm transition-colors">← Back</a>
        <h1 className="text-2xl font-bold text-white">Developer Comparison</h1>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-white/5 mb-8">
        <div className="flex gap-3 flex-wrap items-center">
          <input value={u1} onChange={(e) => setU1(e.target.value)}
            placeholder="First GitHub username"
            className="flex-1 min-w-40 bg-surface border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand" />
          <span className="text-slate-500 font-bold">vs</span>
          <input value={u2} onChange={(e) => setU2(e.target.value)}
            placeholder="Second GitHub username"
            onKeyDown={(e) => e.key === "Enter" && compare()}
            className="flex-1 min-w-40 bg-surface border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand" />
          <button onClick={compare} disabled={loading || !u1.trim() || !u2.trim()}
            className="bg-brand hover:bg-brand-dark disabled:opacity-40 text-white px-6 py-3 rounded-xl font-medium transition-all">
            {loading ? "Comparing..." : "Compare →"}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>

      {result && (
        <div className="space-y-6">
          <div className="bg-card rounded-2xl p-6 border border-brand/30 text-center">
            <p className="text-slate-300 text-base">{result.verdict}</p>
          </div>

          <div className="bg-card rounded-2xl p-6 border border-white/5">
            <h3 className="text-slate-400 text-sm mb-4 uppercase tracking-widest">DNA Comparison</h3>
            <div className="max-w-md mx-auto">
              {radarData && <Radar data={radarData} options={{
                scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: "rgba(255,255,255,0.08)" }, pointLabels: { color: "#94a3b8" }, angleLines: { color: "rgba(255,255,255,0.08)" } } },
                plugins: { legend: { labels: { color: "#94a3b8" } } },
              }} />}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[result.user1, result.user2].map((u, idx) => (
              <div key={u.username} className="bg-card rounded-2xl p-6 border border-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <img src={u.avatar} alt={u.username} className="w-12 h-12 rounded-full border-2"
                    style={{ borderColor: idx === 0 ? "#6C63FF" : "#FF6584" }} />
                  <div>
                    <h3 className="text-white font-bold">{u.name || u.username}</h3>
                    <p className="text-slate-500 text-sm">@{u.username}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Top Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {u.skills.map((s: string) => (
                      <span key={s} className="text-xs bg-surface text-slate-400 px-2.5 py-1 rounded-full border border-white/10">{s}</span>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Role Fit</p>
                  {Object.entries(u.fit).map(([role, score]: [string, any]) => (
                    <div key={role} className="flex items-center gap-2 mb-1.5">
                      <span className="text-slate-400 text-xs w-20 capitalize">{role.replace("_", "/")}</span>
                      <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${score}%`, backgroundColor: idx === 0 ? "#6C63FF" : "#FF6584" }} />
                      </div>
                      <span className="text-slate-400 text-xs w-8 text-right">{score}%</span>
                    </div>
                  ))}
                </div>

                <div className="mb-3">
                  <p className="text-green-400 text-xs uppercase tracking-widest mb-1">Strengths</p>
                  {result.strengths?.[u.username]?.map((s: string, i: number) => (
                    <p key={i} className="text-slate-300 text-sm">✓ {s}</p>
                  ))}
                </div>

                <div className="mb-4">
                  <p className="text-red-400 text-xs uppercase tracking-widest mb-1">Weaknesses</p>
                  {result.weaknesses?.[u.username]?.map((w: string, i: number) => (
                    <p key={i} className="text-slate-400 text-sm">✗ {w}</p>
                  ))}
                </div>

                <div className="bg-surface rounded-xl p-3 text-sm">
                  <span className="text-slate-400">Best for: </span>
                  <span className="text-white">{result.best_for?.[u.username]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface flex items-center justify-center text-slate-400">Loading...</div>}>
      <CompareContent />
    </Suspense>
  );
}
