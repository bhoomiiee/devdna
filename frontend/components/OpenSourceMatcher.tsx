"use client";

interface Opportunity {
  repo: string;
  why: string;
  issue_type: string;
  skill_gained: string;
  url: string;
}

interface OpenSourceMatcherProps {
  opportunities: Opportunity[];
}

export default function OpenSourceMatcher({ opportunities }: OpenSourceMatcherProps) {
  if (!opportunities?.length) return (
    <div className="bg-card rounded-2xl p-6 border border-white/5">
      <h3 className="text-slate-400 text-sm mb-4 uppercase tracking-widest">Open Source Opportunities</h3>
      <div className="text-slate-500 text-sm">No opportunities found.</div>
    </div>
  );

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/5">
      <h3 className="text-slate-400 text-sm mb-4 uppercase tracking-widest">Open Source Opportunities</h3>
      <div className="space-y-3">
        {opportunities.map((o, i) => (
          <a key={i} href={o.url} target="_blank" rel="noopener noreferrer"
            className="block bg-surface rounded-xl p-4 border border-white/5 hover:border-brand transition-all group">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-brand font-medium text-sm group-hover:underline">{o.repo}</span>
                  <span className="text-xs bg-brand/20 text-brand px-2 py-0.5 rounded-full">{o.issue_type}</span>
                </div>
                <p className="text-slate-400 text-sm mb-2">{o.why}</p>
                <p className="text-slate-500 text-xs">🎯 Skill gained: {o.skill_gained}</p>
              </div>
              <span className="text-slate-600 group-hover:text-brand transition-colors">→</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
