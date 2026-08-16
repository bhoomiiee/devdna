"use client";
import { useState } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Twin {
  username: string;
  similarity_score: number;
  match_reason: string;
  shared_traits: string[];
  key_difference: string;
}

interface TwinResult {
  twins: Twin[];
  twin_summary: string;
}

interface GitHubTwinFinderProps {
  username: string;
  data: any;
}

function ScoreRing({ score }: { score: number }) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const fill = (score / 100) * circumference;
  const color =
    score >= 85 ? "#4ade80" : score >= 70 ? "#4ab5e0" : "#a78bfa";

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={color} strokeWidth="7"
        strokeDasharray={`${fill} ${circumference}`}
        strokeLinecap="round"
      />
      <text
        x="36" y="36"
        dominantBaseline="middle" textAnchor="middle"
        className="rotate-90"
        style={{ transform: "rotate(90deg)", transformOrigin: "36px 36px" }}
        fill={color} fontSize="14" fontWeight="700"
      >
        {score}%
      </text>
    </svg>
  );
}

export default function GitHubTwinFinder({ username, data }: GitHubTwinFinderProps) {
  const [result, setResult] = useState<TwinResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const find = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await axios.post(`${API}/api/twin-finder`, {
        username,
        context: {
          top_skills: data.top_skills,
          archetype: data.archetype,
          dna_scores: data.dna_scores,
          role_fit: data.role_fit,
          public_repos: data.public_repos,
          followers: data.followers,
          growth_narrative: data.growth_narrative,
        },
      });
      setResult(res.data);
    } catch {
      setError("Twin search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-slate-400 text-sm uppercase tracking-widest">GitHub Twin Finder</h3>
        {result && (
          <button
            onClick={() => { setResult(null); find(); }}
            className="text-xs text-slate-500 hover:text-brand transition-all"
          >
            ↺ Re-roll pool
          </button>
        )}
      </div>
      <p className="text-slate-500 text-sm mb-5">
        Matches {username}&apos;s coding DNA against real developers — find your GitHub doppelgängers.
      </p>

      {!result && (
        <button
          onClick={find}
          disabled={loading}
          className="bg-brand hover:bg-brand-dark disabled:opacity-40 text-white px-6 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Searching the pool…
            </>
          ) : (
            "🧬 Find My Twin"
          )}
        </button>
      )}

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

      {result && (
        <div className="space-y-5">
          {/* Summary banner */}
          <div className="bg-brand/5 border border-brand/15 rounded-xl px-4 py-3">
            <p className="text-slate-300 text-sm leading-relaxed">{result.twin_summary}</p>
          </div>

          {/* Twin cards */}
          <div className="space-y-4">
            {result.twins?.map((twin, i) => (
              <div
                key={twin.username}
                className="bg-surface rounded-2xl border border-white/5 hover:border-brand/30 transition-all p-4"
              >
                {/* Top row */}
                <div className="flex items-start gap-4">
                  {/* Avatar + score ring */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={`https://github.com/${twin.username}.png?size=56`}
                      alt={twin.username}
                      className="w-14 h-14 rounded-full border-2 border-white/10"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          `https://ui-avatars.com/api/?name=${twin.username}&background=0b1110&color=4ab5e0&size=56`;
                      }}
                    />
                    {i === 0 && (
                      <span className="absolute -top-1.5 -right-1.5 text-xs bg-brand text-white w-5 h-5 rounded-full flex items-center justify-center font-bold shadow">
                        1
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <a
                        href={`https://github.com/${twin.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white font-semibold hover:text-brand transition-all"
                      >
                        @{twin.username}
                      </a>
                      {i === 0 && (
                        <span className="text-xs bg-brand/10 text-brand border border-brand/20 px-2 py-0.5 rounded-full">
                          Closest twin
                        </span>
                      )}
                      <a
                        href={`/profile/${twin.username}`}
                        className="text-xs text-slate-500 hover:text-brand transition-all ml-auto flex-shrink-0"
                      >
                        View DNA →
                      </a>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed">{twin.match_reason}</p>
                  </div>

                  {/* Score ring */}
                  <div className="flex-shrink-0">
                    <ScoreRing score={twin.similarity_score} />
                  </div>
                </div>

                {/* Shared traits */}
                {twin.shared_traits?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {twin.shared_traits.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-white/5 border border-white/8 text-slate-400 px-2.5 py-1 rounded-full"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Key difference */}
                {twin.key_difference && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
                    <span className="text-yellow-400 flex-shrink-0 mt-0.5">△</span>
                    <span>{twin.key_difference}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
