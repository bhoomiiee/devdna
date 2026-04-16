"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import axios from "axios";
import dynamic from "next/dynamic";

const ArchetypeCard      = dynamic(() => import("@/components/ArchetypeCard"), { ssr: false });
const DNAFingerprint     = dynamic(() => import("@/components/DNAFingerprint"), { ssr: false });
const GrowthTimeline     = dynamic<{ narrative: string; milestones: Milestone[] }>(() => import("@/components/GrowthTimeline"), { ssr: false });
const GapAnalysis        = dynamic<{ gaps: GapItem[] }>(() => import("@/components/GapAnalysis"), { ssr: false });
const DevCard            = dynamic<{ data: ProfileData; username: string }>(() => import("@/components/DevCard"), { ssr: false });
const RecruiterView      = dynamic<{ data: ProfileData; username: string }>(() => import("@/components/RecruiterView"), { ssr: false });
const LanguageChart      = dynamic<{ repos: { language: string | null }[] }>(() => import("@/components/LanguageChart"), { ssr: false });
const CommitHeatmap      = dynamic<{ events: { date: string; count: number }[] }>(() => import("@/components/CommitHeatmap"), { ssr: false });
const AIChat             = dynamic<{ username: string; data: ProfileData }>(() => import("@/components/AIChat"), { ssr: false });
const RoleSimulation     = dynamic<{ username: string; data: ProfileData }>(() => import("@/components/RoleSimulation"), { ssr: false });
const ProjectDetection   = dynamic<{ data: any }>(() => import("@/components/ProjectDetection"), { ssr: false });
const OpenSourceMatcher  = dynamic<{ opportunities: any[] }>(() => import("@/components/OpenSourceMatcher"), { ssr: false });
const InterviewReadiness = dynamic<{ data: any }>(() => import("@/components/InterviewReadiness"), { ssr: false });
const ExplainRepo        = dynamic<{ username: string; repos: any[] }>(() => import("@/components/ExplainRepo"), { ssr: false });

interface ProfileData {
  avatar_url: string; name: string; bio: string; location: string;
  public_repos: number; followers: number; following: number; streak_days: number;
  top_skills: string[]; archetype: ArchetypeData; dna_scores: DNAScores;
  growth_narrative: string; milestones: Milestone[]; gap_analysis: GapItem[];
  role_fit: Record<string, number>; recruiter_summary: string;
  project_detection: any;
  interview_readiness: any;
  opportunities: any[];
  commit_events: { date: string; count: number }[];
  repos: { name: string; language: string | null; stars: number; forks: number; description: string; url: string }[];
}
interface ArchetypeData { type: string; emoji: string; description: string; }
interface DNAScores { commit_consistency: number; language_diversity: number; project_complexity: number; documentation_quality: number; collaboration_score: number; }
interface Milestone { year: number; tech: string; repos: number; description: string; }
interface GapItem { skill: string; suggestion: string; resources: string[]; }

const TABS = [
  { id: "overview",      label: "🧬 Overview" },
  { id: "intelligence",  label: "🔬 Intelligence" },
  { id: "career",        label: "🎯 Career" },
  { id: "ai",            label: "🤖 AI Tools" },
  { id: "share",         label: "🪪 Share" },
];

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "developer";
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    axios.get(`${API}/api/analyze/${username}`)
      .then((res: { data: ProfileData }) => setData(res.data))
      .catch(() => setError("Failed to analyze profile. Check the username and try again."))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center text-slate-400">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p>Analyzing <span className="text-white font-medium">{username}</span>&apos;s DNA...</p>
        <p className="text-xs mt-2 text-slate-600">This may take a few seconds</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="bg-card border border-red-500/20 rounded-2xl p-6 text-red-400 text-sm max-w-sm text-center">{error}</div>
    </div>
  );

  if (!data) return null;

  return (
    <main className="min-h-screen bg-surface px-4 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <img src={data.avatar_url} alt={username} className="w-16 h-16 rounded-full border-2 border-brand" />
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white">{data.name || username}</h2>
          <p className="text-slate-400 text-sm">{data.bio}</p>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
            <span>📦 {data.public_repos} repos</span>
            <span>👥 {data.followers} followers</span>
            {data.location && <span>📍 {data.location}</span>}
            <span>🔥 {data.streak_days} active days</span>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <a href={`/compare?u1=${username}`}
            className="text-xs bg-card border border-white/10 hover:border-brand text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition-all">
            ⚔️ Compare
          </a>
          <a href="/" className="text-xs text-slate-500 hover:text-white px-3 py-1.5 rounded-lg transition-all">← Back</a>
        </div>
      </div>

      {mode === "recruiter" ? (
        <RecruiterView data={data} username={username} />
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 bg-card rounded-2xl p-1.5 border border-white/5 mb-6 overflow-x-auto">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-brand text-white shadow-lg"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div className="grid gap-6">
              <div className="grid md:grid-cols-2 gap-6">
                <ArchetypeCard archetype={data.archetype} />
                <DNAFingerprint scores={data.dna_scores} />
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <LanguageChart repos={data.repos || []} />
                <CommitHeatmap events={data.commit_events || []} />
              </div>
              <div className="bg-card rounded-2xl p-6 border border-white/5">
                <h3 className="text-slate-400 text-sm mb-4 uppercase tracking-widest">Top Repositories</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {data.repos?.slice(0, 6).map((r) => (
                    <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer"
                      className="bg-surface rounded-xl p-3 border border-white/5 hover:border-brand transition-all group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-brand text-sm font-medium group-hover:underline truncate">{r.name}</span>
                        <span className="text-slate-500 text-xs ml-2 flex-shrink-0">⭐ {r.stars}</span>
                      </div>
                      {r.description && <p className="text-slate-500 text-xs truncate">{r.description}</p>}
                      {r.language && <span className="text-xs text-slate-400 mt-1 block">{r.language}</span>}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "intelligence" && (
            <div className="grid gap-6">
              <ProjectDetection data={data.project_detection} />
              <InterviewReadiness data={data.interview_readiness} />
              <GapAnalysis gaps={data.gap_analysis} />
            </div>
          )}

          {activeTab === "career" && (
            <div className="grid gap-6">
              <RoleSimulation username={username} data={data} />
              <GrowthTimeline narrative={data.growth_narrative} milestones={data.milestones} />
              <OpenSourceMatcher opportunities={data.opportunities || []} />
            </div>
          )}

          {activeTab === "ai" && (
            <div className="grid gap-6">
              <AIChat username={username} data={data} />
              <ExplainRepo username={username} repos={data.repos || []} />
            </div>
          )}

          {activeTab === "share" && (
            <div className="grid gap-6">
              <DevCard data={data} username={username} />
              <div className="bg-card rounded-2xl p-6 border border-white/5">
                <h3 className="text-slate-400 text-sm mb-4 uppercase tracking-widest">Share Profile</h3>
                <div className="flex gap-3 flex-wrap">
                  <a href={`https://twitter.com/intent/tweet?text=Check out ${username}'s DevDNA profile 🧬%0AArchetype: ${data.archetype?.type} ${data.archetype?.emoji}%0Askills: ${(data.top_skills||[]).slice(0,3).join(", ")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-sm bg-surface border border-white/10 hover:border-brand text-slate-400 hover:text-white px-4 py-2 rounded-xl transition-all">
                    Share on X
                  </a>
                  <button onClick={() => navigator.clipboard.writeText(window.location.href)}
                    className="text-sm bg-surface border border-white/10 hover:border-brand text-slate-400 hover:text-white px-4 py-2 rounded-xl transition-all">
                    Copy link
                  </button>
                  <a href={`/compare?u1=${username}`}
                    className="text-sm bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-xl transition-all">
                    ⚔️ Compare
                  </a>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
