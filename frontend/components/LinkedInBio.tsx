"use client";
import { useState } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const TONES = [
  { id: "professional", label: "Professional", desc: "Formal, recruiter-ready" },
  { id: "casual", label: "Casual", desc: "Approachable, human" },
  { id: "technical", label: "Technical", desc: "Depth-first, IC-focused" },
  { id: "startup", label: "Startup", desc: "Builder energy, scrappy" },
];

interface LinkedInBioProps {
  username: string;
  data: any;
}

export default function LinkedInBio({ username, data }: LinkedInBioProps) {
  const [tone, setTone] = useState("professional");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await axios.post(`${API}/api/linkedin-bio`, {
        username,
        tone,
        context: {
          name: data.name,
          bio: data.bio,
          top_skills: data.top_skills,
          archetype: data.archetype,
          role_fit: data.role_fit,
          public_repos: data.public_repos,
          followers: data.followers,
          recruiter_summary: data.recruiter_summary,
          growth_narrative: data.growth_narrative,
        },
      });
      setResult(res.data);
    } catch {
      setError("Failed to generate bio. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/5">
      <h3 className="text-slate-400 text-sm uppercase tracking-widest mb-2">LinkedIn Bio &amp; Elevator Pitch</h3>
      <p className="text-slate-500 text-sm mb-5">
        AI-crafted LinkedIn copy and a 30-second pitch — based on your actual GitHub data.
      </p>

      {/* Tone selector */}
      <div className="mb-5">
        <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Tone</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {TONES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTone(t.id)}
              className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                tone === t.id
                  ? "bg-brand/10 border-brand text-white"
                  : "border-white/8 text-slate-400 hover:border-white/20 hover:text-white"
              }`}
            >
              <div className="font-medium">{t.label}</div>
              <div className="text-xs opacity-60 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={generate}
        disabled={loading}
        className="bg-brand hover:bg-brand-dark disabled:opacity-40 text-white px-6 py-2.5 rounded-xl text-sm transition-all mb-2"
      >
        {loading ? "Writing…" : "✍️ Generate Bio"}
      </button>

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

      {result && (
        <div className="space-y-4 mt-5">
          {/* Headline */}
          <div className="bg-surface rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-slate-400 text-xs uppercase tracking-widest">LinkedIn Headline</h4>
              <button
                onClick={() => copyText(result.headline, "headline")}
                className="text-xs text-slate-500 hover:text-brand transition-all"
              >
                {copied === "headline" ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <p className="text-white text-sm font-medium leading-snug">{result.headline}</p>
            <p className="text-slate-600 text-xs mt-1">{result.headline?.length || 0}/220 chars</p>
          </div>

          {/* LinkedIn About */}
          <div className="bg-surface rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-slate-400 text-xs uppercase tracking-widest">LinkedIn About Section</h4>
              <button
                onClick={() => copyText(result.linkedin_about, "about")}
                className="text-xs text-slate-500 hover:text-brand transition-all"
              >
                {copied === "about" ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{result.linkedin_about}</p>
          </div>

          {/* Elevator Pitch */}
          <div className="bg-surface rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-slate-400 text-xs uppercase tracking-widest">30-Second Elevator Pitch</h4>
              <button
                onClick={() => copyText(result.elevator_pitch, "pitch")}
                className="text-xs text-slate-500 hover:text-brand transition-all"
              >
                {copied === "pitch" ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <div className="bg-brand/5 border border-brand/15 rounded-xl p-4">
              <p className="text-slate-300 text-sm leading-relaxed italic">&ldquo;{result.elevator_pitch}&rdquo;</p>
            </div>
          </div>

          {/* Short pitch */}
          {result.short_pitch && (
            <div className="bg-surface rounded-xl p-4 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-slate-400 text-xs uppercase tracking-widest">Twitter / X Bio</h4>
                <button
                  onClick={() => copyText(result.short_pitch, "short")}
                  className="text-xs text-slate-500 hover:text-brand transition-all"
                >
                  {copied === "short" ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <p className="text-slate-300 text-sm">{result.short_pitch}</p>
              <p className="text-slate-600 text-xs mt-1">{result.short_pitch?.length || 0}/160 chars</p>
            </div>
          )}

          {/* Keywords */}
          {result.keywords?.length > 0 && (
            <div className="bg-surface rounded-xl p-4 border border-white/5">
              <h4 className="text-slate-400 text-xs uppercase tracking-widest mb-3">SEO Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {result.keywords.map((kw: string, i: number) => (
                  <span key={i} className="text-xs bg-brand/8 text-brand border border-brand/15 px-2.5 py-1 rounded-full">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setResult(null)}
            className="text-xs text-slate-500 hover:text-brand transition-all"
          >
            ↺ Try a different tone
          </button>
        </div>
      )}
    </div>
  );
}
