interface Milestone {
  year: number;
  tech: string;
  repos: number;
  description: string;
}

interface GrowthTimelineProps {
  narrative: string;
  milestones: Milestone[];
}

export default function GrowthTimeline({ narrative, milestones }: GrowthTimelineProps) {
  // Growth Trajectory Component
  return (
    <div className="bg-card rounded-2xl p-6 border border-white/10">
      <h3 className="text-slate-400 text-sm mb-4 uppercase tracking-widest">Growth Trajectory</h3>
      <p className="text-white mb-6 leading-relaxed">{narrative}</p>
      <div className="space-y-4">
        {milestones.map((m, i) => (
          <div key={i} className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-sm">
              {m.year}
            </div>
            <div>
              <h4 className="text-white font-medium">{m.tech}</h4>
              <p className="text-slate-400 text-sm mt-1">{m.description}</p>
              <p className="text-slate-500 text-xs mt-1">{m.repos} repositories</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


