"use client";
import { useState } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ResumeGeneratorProps {
  username: string;
  data: any;
}

export default function ResumeGenerator({ username, data }: ResumeGeneratorProps) {
  const [resume, setResume] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError("");
    setResume(null);
    try {
      const res = await axios.post(`${API}/api/generate-resume`, {
        username,
        context: {
          name: data.name,
          bio: data.bio,
          location: data.location,
          top_skills: data.top_skills,
          archetype: data.archetype,
          dna_scores: data.dna_scores,
          role_fit: data.role_fit,
          public_repos: data.public_repos,
          followers: data.followers,
          growth_narrative: data.growth_narrative,
          recruiter_summary: data.recruiter_summary,
          project_detection: data.project_detection,
        },
      });
      setResume(res.data);
    } catch {
      setError("Failed to generate resume. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const exportMarkdown = () => {
    if (!resume) return;
    const md = [
      `# ${data.name || username}`,
      `**${resume.headline}**`,
      data.location ? `📍 ${data.location}` : "",
      `🔗 github.com/${username}`,
      "",
      "## Summary",
      resume.summary,
      "",
      "## Skills",
      `**Primary:** ${resume.skills?.primary?.join(", ")}`,
      `**Secondary:** ${resume.skills?.secondary?.join(", ")}`,
      resume.skills?.learning?.length ? `**Exploring:** ${resume.skills.learning.join(", ")}` : "",
      "",
      "## Projects",
      ...(resume.projects || []).flatMap((p: any) => [
        `### ${p.name}`,
        p.description,
        `**Tech:** ${p.tech?.join(", ")}`,
        p.highlight ? `✨ ${p.highlight}` : "",
        "",
      ]),
      "## Strengths",
      ...(resume.strengths || []).map((s: string) => `- ${s}`),
      "",
      "## Suggested Roles",
      ...(resume.suggested_roles || []).map((r: string) => `- ${r}`),
      "",
      resume.github_stats_summary,
    ].filter(Boolean).join("\n");

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${username}-resume.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-slate-400 text-sm uppercase tracking-widest">Resume / Portfolio Generator</h3>
        {resume && (
          <button
            onClick={exportMarkdown}
            className="text-xs bg-surface border border-white/10 hover:border-brand text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition-all"
          >
            ↓ Export .md
          </button>
        )}
      </div>
      <p className="text-slate-500 text-sm mb-4">
        Auto-generate a professional resume from your DevDNA analysis.
      </p>

      {!resume && (
        <button
          onClick={generate}
          disabled={loading}
          className="bg-brand hover:bg-brand-dark disabled:opacity-40 text-white px-6 py-2.5 rounded-xl text-sm transition-all"
        >
          {loading ? "Generating…" : "✨ Generate Resume"}
        </button>
      )}

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

      {resume && (
        <div className="mt-4 space-y-5">
          {/* Header */}
          <div className="bg-surface rounded-xl p-4 border border-white/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-white text-lg font-semibold">{data.name || username}</h2>
                <p className="text-brand text-sm mt-0.5">{resume.headline}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                  {data.location && <span>📍 {data.location}</span>}
                  <span>🔗 github.com/{username}</span>
                  <span>📦 {data.public_repos} repos</span>
                </div>
              </div>
              <button
                onClick={() => copyText(`${data.name || username}\n${resume.headline}\ngithub.com/${username}`, "header")}
                className="text-xs text-slate-500 hover:text-brand transition-all flex-shrink-0"
              >
                {copied === "header" ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-surface rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-slate-400 text-xs uppercase tracking-widest">Summary</h4>
              <button
                onClick={() => copyText(resume.summary, "summary")}
                className="text-xs text-slate-500 hover:text-brand transition-all"
              >
                {copied === "summary" ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">{resume.summary}</p>
          </div>

          {/* Skills */}
          <div className="bg-surface rounded-xl p-4 border border-white/5">
            <h4 className="text-slate-400 text-xs uppercase tracking-widest mb-3">Skills</h4>
            <div className="space-y-2">
              {resume.skills?.primary?.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 w-20 flex-shrink-0">Primary</span>
                  {resume.skills.primary.map((s: string) => (
                    <span key={s} className="text-xs bg-brand/10 text-brand border border-brand/20 px-2.5 py-1 rounded-full">{s}</span>
                  ))}
                </div>
              )}
              {resume.skills?.secondary?.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 w-20 flex-shrink-0">Secondary</span>
                  {resume.skills.secondary.map((s: string) => (
                    <span key={s} className="text-xs bg-surface border border-white/10 text-slate-400 px-2.5 py-1 rounded-full">{s}</span>
                  ))}
                </div>
              )}
              {resume.skills?.learning?.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 w-20 flex-shrink-0">Exploring</span>
                  {resume.skills.learning.map((s: string) => (
                    <span key={s} className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2.5 py-1 rounded-full">{s}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Projects */}
          {resume.projects?.length > 0 && (
            <div className="bg-surface rounded-xl p-4 border border-white/5">
              <h4 className="text-slate-400 text-xs uppercase tracking-widest mb-3">Featured Projects</h4>
              <div className="space-y-3">
                {resume.projects.map((p: any, i: number) => (
                  <div key={i} className="border-l-2 border-brand/40 pl-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white text-sm font-medium">{p.name}</span>
                      <div className="flex gap-1">
                        {p.tech?.slice(0, 3).map((t: string) => (
                          <span key={t} className="text-xs text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">{p.description}</p>
                    {p.highlight && (
                      <p className="text-brand text-xs mt-1">✨ {p.highlight}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths + Suggested Roles */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-surface rounded-xl p-4 border border-white/5">
              <h4 className="text-slate-400 text-xs uppercase tracking-widest mb-3">Strengths</h4>
              <ul className="space-y-1.5">
                {resume.strengths?.map((s: string, i: number) => (
                  <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-white/5">
              <h4 className="text-slate-400 text-xs uppercase tracking-widest mb-3">Suggested Roles</h4>
              <ul className="space-y-1.5">
                {resume.suggested_roles?.map((r: string, i: number) => (
                  <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                    <span className="text-brand mt-0.5">→</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Certs + GitHub stat */}
          {(resume.certifications_to_pursue?.length > 0 || resume.github_stats_summary) && (
            <div className="bg-surface rounded-xl p-4 border border-white/5 space-y-3">
              {resume.certifications_to_pursue?.length > 0 && (
                <div>
                  <h4 className="text-slate-400 text-xs uppercase tracking-widest mb-2">Certifications to Pursue</h4>
                  <div className="flex flex-wrap gap-2">
                    {resume.certifications_to_pursue.map((c: string, i: number) => (
                      <span key={i} className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-full">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {resume.github_stats_summary && (
                <p className="text-slate-500 text-xs italic">{resume.github_stats_summary}</p>
              )}
            </div>
          )}

          <button
            onClick={() => { setResume(null); generate(); }}
            className="text-xs text-slate-500 hover:text-brand transition-all"
          >
            ↺ Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
