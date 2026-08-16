"use client";
import { useState } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const HACKATHON_THEMES = [
  "General / Full-Stack",
  "AI / Machine Learning",
  "Web3 / Blockchain",
  "Climate Tech",
  "DevTools / Infrastructure",
  "Mobile App",
  "Open Source",
  "FinTech",
];

const ROLE_COLORS: Record<string, string> = {
  frontend: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  backend: "text-green-400 bg-green-500/10 border-green-500/20",
  ai: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  ml: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  devops: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  product: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  fullstack: "text-brand bg-brand/10 border-brand/20",
  default: "text-slate-400 bg-slate-500/10 border-slate-500/20",
};

function getRoleColor(role: string): string {
  const lower = role.toLowerCase();
  for (const [key, cls] of Object.entries(ROLE_COLORS)) {
    if (lower.includes(key)) return cls;
  }
  return ROLE_COLORS.default;
}

function ScoreBar({ score, label, color }: { score: number; label: string; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-medium">{score}/100</span>
      </div>
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

interface HackathonSquadBuilderProps {
  defaultUsername?: string;
}

export default function HackathonSquadBuilder({ defaultUsername }: HackathonSquadBuilderProps) {
  const [members, setMembers] = useState<string[]>(
    defaultUsername ? [defaultUsername, ""] : ["", ""]
  );
  const [theme, setTheme] = useState("General / Full-Stack");
  const [customTheme, setCustomTheme] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addMember = () => {
    if (members.length < 6) setMembers([...members, ""]);
  };

  const removeMember = (i: number) => {
    if (members.length <= 2) return;
    setMembers(members.filter((_, idx) => idx !== i));
  };

  const updateMember = (i: number, val: string) => {
    const updated = [...members];
    updated[i] = val;
    setMembers(updated);
  };

  const build = async () => {
    const usernames = members.map((m) => m.trim()).filter(Boolean);
    if (usernames.length < 2) {
      setError("Enter at least 2 GitHub usernames.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await axios.post(`${API}/api/squad-builder`, {
        usernames,
        hackathonTheme: customTheme.trim() || theme,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to build squad. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/5">
      <h3 className="text-slate-400 text-sm uppercase tracking-widest mb-1">Hackathon Squad Builder</h3>
      <p className="text-slate-500 text-sm mb-5">
        Enter 2–6 GitHub usernames to get optimal role assignments and a win strategy.
      </p>

      {!result && (
        <div className="space-y-4">
          {/* Member inputs */}
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Team Members</p>
            <div className="space-y-2">
              {members.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-slate-600 text-xs w-5 text-right flex-shrink-0">{i + 1}</span>
                  <input
                    type="text"
                    value={m}
                    onChange={(e) => updateMember(i, e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && i === members.length - 1 && members.length < 6 && addMember()}
                    placeholder={`GitHub username${i === 0 && defaultUsername ? ` (e.g. ${defaultUsername})` : ""}`}
                    className="flex-1 bg-surface border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand"
                  />
                  {members.length > 2 && (
                    <button
                      onClick={() => removeMember(i)}
                      className="text-slate-600 hover:text-red-400 transition-all text-lg leading-none w-6 flex-shrink-0"
                      aria-label="Remove member"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {members.length < 6 && (
              <button
                onClick={addMember}
                className="mt-2 text-xs text-slate-500 hover:text-brand transition-all flex items-center gap-1"
              >
                <span className="text-base leading-none">+</span> Add member ({members.length}/6)
              </button>
            )}
          </div>

          {/* Theme selector */}
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Hackathon Theme</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {HACKATHON_THEMES.map((t) => (
                <button
                  key={t}
                  onClick={() => { setTheme(t); setCustomTheme(""); }}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    theme === t && !customTheme
                      ? "bg-brand/10 border-brand text-white"
                      : "border-white/8 text-slate-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customTheme}
              onChange={(e) => setCustomTheme(e.target.value)}
              placeholder="Or type a custom theme…"
              className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand"
            />
          </div>

          <button
            onClick={build}
            disabled={loading || members.filter((m) => m.trim()).length < 2}
            className="bg-brand hover:bg-brand-dark disabled:opacity-40 text-white px-6 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing team…
              </>
            ) : (
              "⚡ Build Squad"
            )}
          </button>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      )}

      {result && (
        <div className="space-y-5">
          {/* Squad hero */}
          <div className="bg-surface rounded-2xl p-5 border border-white/5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-white text-xl font-bold mb-1">
                  {result.squad_name}
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xl">{result.squad_verdict}</p>
              </div>
              <div className="flex gap-4 flex-shrink-0">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${result.squad_score >= 75 ? "text-green-400" : result.squad_score >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                    {result.squad_score}
                  </div>
                  <div className="text-slate-500 text-xs mt-0.5">Squad Score</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${result.chemistry_score >= 75 ? "text-green-400" : result.chemistry_score >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                    {result.chemistry_score}
                  </div>
                  <div className="text-slate-500 text-xs mt-0.5">Chemistry</div>
                </div>
              </div>
            </div>
          </div>

          {/* Role assignments */}
          <div>
            <h4 className="text-slate-400 text-xs uppercase tracking-widest mb-3">Role Assignments</h4>
            <div className="space-y-3">
              {result.roles?.map((role: any, i: number) => (
                <div key={i} className="bg-surface rounded-xl p-4 border border-white/5 flex gap-4">
                  <img
                    src={`https://github.com/${role.username}.png?size=48`}
                    alt={role.username}
                    className="w-12 h-12 rounded-full border border-white/10 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        `https://ui-avatars.com/api/?name=${role.username}&background=0b1110&color=4ab5e0&size=48`;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <a
                        href={`/profile/${role.username}`}
                        className="text-white font-medium text-sm hover:text-brand transition-all"
                      >
                        @{role.username}
                      </a>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border ${getRoleColor(role.assigned_role)}`}>
                        {role.assigned_role}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed mb-2">{role.why}</p>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <span className="text-green-400 flex items-start gap-1">
                        <span className="mt-0.5">⚡</span>
                        <span>{role.superpower}</span>
                      </span>
                      <span className="text-yellow-400 flex items-start gap-1">
                        <span className="mt-0.5">△</span>
                        <span>{role.watch_out}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths + Gaps */}
          <div className="grid md:grid-cols-2 gap-4">
            {result.team_strengths?.length > 0 && (
              <div className="bg-surface rounded-xl p-4 border border-white/5">
                <h4 className="text-slate-400 text-xs uppercase tracking-widest mb-3">Team Strengths</h4>
                <ul className="space-y-1.5">
                  {result.team_strengths.map((s: string, i: number) => (
                    <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                      <span className="text-green-400 flex-shrink-0 mt-0.5">✓</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.team_gaps?.length > 0 && (
              <div className="bg-surface rounded-xl p-4 border border-white/5">
                <h4 className="text-slate-400 text-xs uppercase tracking-widest mb-3">Gaps to Watch</h4>
                <ul className="space-y-1.5">
                  {result.team_gaps.map((g: string, i: number) => (
                    <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                      <span className="text-orange-400 flex-shrink-0 mt-0.5">!</span> {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Win Strategy */}
          {result.win_strategy && (
            <div className="bg-green-500/5 border border-green-500/15 rounded-xl p-4">
              <h4 className="text-green-400 text-xs uppercase tracking-widest mb-2">🏆 Win Strategy</h4>
              <p className="text-slate-300 text-sm leading-relaxed">{result.win_strategy}</p>
            </div>
          )}

          {/* Suggested Stack */}
          {result.suggested_stack?.length > 0 && (
            <div className="bg-surface rounded-xl p-4 border border-white/5">
              <h4 className="text-slate-400 text-xs uppercase tracking-widest mb-3">Suggested Stack</h4>
              <div className="flex flex-wrap gap-2">
                {result.suggested_stack.map((tech: string, i: number) => (
                  <span key={i} className="text-xs bg-brand/8 text-brand border border-brand/15 px-3 py-1.5 rounded-full">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Wildcard tip */}
          {result.wildcard_tip && (
            <div className="bg-purple-500/5 border border-purple-500/15 rounded-xl p-4">
              <h4 className="text-purple-400 text-xs uppercase tracking-widest mb-2">🃏 Wildcard Tip</h4>
              <p className="text-slate-300 text-sm leading-relaxed">{result.wildcard_tip}</p>
            </div>
          )}

          <button
            onClick={() => setResult(null)}
            className="text-xs text-slate-500 hover:text-brand transition-all"
          >
            ↺ Build a different squad
          </button>
        </div>
      )}
    </div>
  );
}
