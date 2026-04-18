"use client";

interface ProjectDetectionProps {
  data: any; // pre-fetched from /api/analyze
}

export default function ProjectDetection({ data }: ProjectDetectionProps) {
  if (!data) return (
    <div className="bg-card rounded-2xl p-6 border border-white/5">
      <h3 className="text-slate-400 text-sm mb-4 uppercase tracking-widest">Real Project Detection</h3>
      <div className="text-slate-500 text-sm">No project data available.</div>
    </div>
  );

  const score = data.production_score || 0;
  const scoreColor = score >= 70 ? "#43E97B" : score >= 40 ? "#F7971E" : "#FF6584";

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/5">
      <h3 className="text-slate-400 text-sm mb-4 uppercase tracking-widest">Real Project Detection</h3>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke={scoreColor} strokeWidth="3"
              strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-bold text-lg">{score}%</span>
          </div>
        </div>
        <div>
          <p className="text-white font-medium">Production Score</p>
          <p className="text-slate-400 text-sm mt-1">{data.summary}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-green-400 text-xs uppercase tracking-widest mb-2">
            ✓ Real Projects ({data.real_projects?.length || 0})
          </h4>
          <div className="space-y-2">
            {data.real_projects?.slice(0, 4).map((p: any, i: number) => (
              <div key={i} className="bg-surface rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-sm font-medium">{p.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.complexity === "high" ? "bg-green-500/20 text-green-400" :
                    p.complexity === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                    "bg-slate-500/20 text-slate-400"}`}>{p.complexity}</span>
                </div>
                <p className="text-slate-500 text-xs">{p.reason}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-slate-500 text-xs uppercase tracking-widest mb-2">
            ○ Tutorials/Clones ({data.tutorial_projects?.length || 0})
          </h4>
          <div className="space-y-2">
            {data.tutorial_projects?.slice(0, 4).map((p: any, i: number) => (
              <div key={i} className="bg-surface rounded-lg p-2.5">
                <span className="text-slate-400 text-sm">{p.name}</span>
                <p className="text-slate-600 text-xs mt-0.5">{p.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
