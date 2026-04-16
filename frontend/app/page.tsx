"use client";
import { useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState<"developer" | "recruiter">("developer");
  const router = useRouter();

  const handleAnalyze = () => {
    if (!username.trim()) return;
    router.push(`/profile/${username.trim()}?mode=${mode}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-surface">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold text-white mb-3">
          Dev<span className="text-brand">DNA</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-md mx-auto">
          AI-powered GitHub intelligence. Discover your developer archetype, skill fingerprint, and growth story.
        </p>
      </div>

      <div className="bg-card rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/5">
        <input
          type="text"
          placeholder="Enter GitHub username"
          value={username}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleAnalyze()}
          className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand mb-4"
        />

        <div className="flex gap-3 mb-6">
          {(["developer", "recruiter"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                mode === m
                  ? "bg-brand text-white"
                  : "bg-surface text-slate-400 border border-white/10 hover:border-brand"
              }`}
            >
              {m === "developer" ? "🧑‍💻 Developer" : "🧑‍💼 Recruiter"}
            </button>
          ))}
        </div>

        <button
          onClick={handleAnalyze}
          disabled={!username.trim()}
          className="w-full bg-brand hover:bg-brand-dark disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-all"
        >
          Analyze Profile →
        </button>

        <a href="/compare" className="block text-center text-slate-500 hover:text-slate-300 text-sm mt-4 transition-colors">
          ⚔️ Compare two developers
        </a>
      </div>

      <div className="mt-6 flex items-center gap-2 flex-wrap justify-center">
        <span className="text-slate-600 text-xs">Try:</span>
        {["torvalds", "gaearon", "sindresorhus", "yyx990803"].map((u) => (
          <button key={u} onClick={() => { setUsername(u); router.push(`/profile/${u}?mode=${mode}`); }}
            className="text-xs text-brand hover:underline">{u}</button>
        ))}
      </div>
    </main>
  );
}
