interface GapItem {
  skill: string;
  suggestion: string;
  resources: string[];
}

export default function GapAnalysis({ gaps }: { gaps: GapItem[] }) {
  // Gap Analysis Component
  return (
    <div className="bg-card rounded-2xl p-6 border border-white/10">
      <h3 className="text-slate-400 text-sm mb-4 uppercase tracking-widest">AI Gap Analysis</h3>
      <p className="text-white mb-6">Personalized suggestions to level up your skills:</p>
      <div className="space-y-6">
        {gaps.map((gap, i) => (
          <div key={i} className="border-l-2 border-brand pl-4">
            <h4 className="text-white font-medium mb-2">{gap.skill}</h4>
            <p className="text-slate-400 text-sm mb-3">{gap.suggestion}</p>
            <div className="flex flex-wrap gap-2">
              {gap.resources.map((r, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-surface text-slate-400 px-3 py-1 rounded-full"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


