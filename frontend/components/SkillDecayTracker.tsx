"use client";

interface SkillDecayItem {
  language: string;
  last_used: string;
  months_since: number;
  decayed: boolean;
}

interface SkillDecayTrackerProps {
  skillDecay: SkillDecayItem[];
}

const LANG_COLORS: Record<string, string> = {
  JavaScript: "#f7df1e",
  TypeScript: "#3178c6",
  Python: "#3572a5",
  Java: "#b07219",
  Go: "#00add8",
  Rust: "#dea584",
  "C++": "#f34b7d",
  C: "#555555",
  Ruby: "#701516",
  PHP: "#4f5d95",
  Swift: "#ffac45",
  Kotlin: "#a97bff",
  Dart: "#00b4ab",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Scala: "#c22d40",
  "C#": "#178600",
  R: "#198ce7",
  Vue: "#41b883",
};

function getLangColor(lang: string): string {
  return LANG_COLORS[lang] || "#4ab5e0";
}

function decayLabel(months: number): { label: string; color: string; bg: string } {
  if (months <= 1) return { label: "Active", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" };
  if (months <= 3) return { label: "Recent", color: "text-green-300", bg: "bg-green-500/8 border-green-500/15" };
  if (months <= 6) return { label: "Cooling", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" };
  if (months <= 12) return { label: "Idle", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" };
  return { label: "Decayed", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" };
}

function DecayBar({ months }: { months: number }) {
  // 24 months = full bar (decayed); cap visual at 24
  const pct = Math.min((months / 24) * 100, 100);
  const color =
    months <= 3 ? "bg-green-400" :
    months <= 6 ? "bg-yellow-400" :
    months <= 12 ? "bg-orange-400" : "bg-red-400";
  return (
    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function SkillDecayTracker({ skillDecay }: SkillDecayTrackerProps) {
  if (!skillDecay?.length) return null;

  const decayed = skillDecay.filter((s) => s.decayed);
  const active = skillDecay.filter((s) => !s.decayed);

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-slate-400 text-sm uppercase tracking-widest">Skill Decay Tracker</h3>
        {decayed.length > 0 && (
          <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full">
            {decayed.length} decayed
          </span>
        )}
      </div>
      <p className="text-slate-500 text-sm mb-5">
        Skills you were strong in — flagged by how long since you last used them.
      </p>

      {decayed.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <h4 className="text-red-400 text-xs uppercase tracking-widest">Needs Attention (1+ year)</h4>
          </div>
          <div className="space-y-3">
            {decayed.map((skill) => {
              const { label, color, bg } = decayLabel(skill.months_since);
              return (
                <div key={skill.language} className="bg-surface rounded-xl p-3.5 border border-red-500/10">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: getLangColor(skill.language) }}
                    />
                    <span className="text-white text-sm font-medium flex-1">{skill.language}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${bg} ${color}`}>{label}</span>
                  </div>
                  <DecayBar months={skill.months_since} />
                  <div className="flex justify-between mt-1.5 text-xs text-slate-500">
                    <span>Last used: {skill.last_used}</span>
                    <span>{skill.months_since}mo ago</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <h4 className="text-green-400 text-xs uppercase tracking-widest">Active Skills</h4>
          </div>
          <div className="grid md:grid-cols-2 gap-2.5">
            {active.map((skill) => {
              const { label, color, bg } = decayLabel(skill.months_since);
              return (
                <div key={skill.language} className="bg-surface rounded-xl p-3 border border-white/5">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: getLangColor(skill.language) }}
                    />
                    <span className="text-slate-300 text-sm flex-1">{skill.language}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${bg} ${color}`}>{label}</span>
                  </div>
                  <DecayBar months={skill.months_since} />
                  <p className="text-slate-600 text-xs mt-1.5">{skill.months_since}mo ago</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {decayed.length === 0 && (
        <div className="bg-green-500/5 border border-green-500/15 rounded-xl p-4 mt-2 text-center">
          <p className="text-green-400 text-sm">🎉 All your skills are active within the last year!</p>
        </div>
      )}
    </div>
  );
}
