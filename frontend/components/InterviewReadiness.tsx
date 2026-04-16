"use client";

interface InterviewReadinessProps {
  data: any; // pre-fetched from /api/analyze
}

export default function InterviewReadiness({ data }: InterviewReadinessProps) {
  if (!data) return (
    <div className="bg-card rounded-2xl p-6 border border-white/5">
      <h3 className="text-slate-400 text-sm mb-4 uppercase tracking-widest">Interview Readiness</h3>
      <div className="text-slate-500 text-sm">No readiness data available.</div>
    </div>
  );

  const score = data.overall_score || 0;
  const scoreColor = score >= 75 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";
  const barColor = score >= 75 ? "bg-green-400" : score >= 50 ? "bg-yellow-400" : "bg-red-400";

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/5">
      <h3 className="text-slate-400 text-sm mb-4 uppercase tracking-widest">Interview Readiness</h3>

      <div className="flex items-center gap-4 mb-6">
        <div className={`text-6xl font-bold ${scoreColor}`}>{score}</div>
        <div>
          <div className="w-32 h-2 bg-surface rounded-full overflow-hidden mb-2">
            <div className={`h-full ${barColor} rounded-full`} style={{ width: `${score}%` }} />
          </div>
          <p className="text-slate-300 text-sm">{data.verdict}</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {Object.entries(data.categories || {}).map(([key, val]: [string, any]) => (
          <div key={key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-300 capitalize">{key.replace("_", " ")}</span>
              <span className="text-slate-400">{val.score}/100</span>
            </div>
            <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
              <div className="h-full bg-brand rounded-full" style={{ width: `${val.score}%` }} />
            </div>
            <p className="text-slate-600 text-xs mt-0.5">{val.note}</p>
          </div>
        ))}
      </div>

      <div className="bg-brand/10 border border-brand/20 rounded-xl p-3 text-sm">
        <span className="text-brand">💡 Top tip: </span>
        <span className="text-slate-300">{data.top_tip}</span>
      </div>
    </div>
  );
}
