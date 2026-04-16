interface RecruiterViewProps {
  data: any;
  username: string;
}

export default function RecruiterView({ data, username }: RecruiterViewProps) {
  // Recruiter View Component
  const roleScores: Record<string, number> = data.role_fit || {
    frontend: 0, backend: 0, devops: 0, ai_ml: 0,
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl p-6 border border-white/5">
        <h3 className="text-slate-400 text-sm mb-4 uppercase tracking-widest">One-Page Summary</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-white font-medium mb-2">Developer Archetype</h4>
            <p className="text-slate-300">{data.archetype?.emoji} {data.archetype?.type}</p>
            <p className="text-slate-500 text-sm mt-1">{data.archetype?.description}</p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">Top Skills</h4>
            <div className="flex flex-wrap gap-2">
              {(data.top_skills || []).map((skill: string) => (
                <span key={skill} className="text-sm bg-surface text-slate-400 px-3 py-1 rounded-full border border-white/10">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-white/5">
        <h3 className="text-slate-400 text-sm mb-4 uppercase tracking-widest">Role Fit Scores</h3>
        <div className="space-y-4">
          {Object.entries(roleScores).map(([role, score]) => (
            <div key={role} className="flex items-center justify-between">
              <span className="text-slate-300 capitalize w-24">{role.replace("_", "/")}</span>
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full transition-all duration-700"
                    style={{ width: `${score}%` }} />
                </div>
                <span className="text-white font-medium w-10 text-right">{score}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-white/5">
        <h3 className="text-slate-400 text-sm mb-4 uppercase tracking-widest">AI Recommendation</h3>
        <p className="text-slate-300 leading-relaxed">{data.recruiter_summary}</p>
        <div className="mt-4 flex gap-4 text-sm text-slate-400">
          <span>{data.public_repos} repos</span>
          <span>{data.followers} followers</span>
          <span>{data.streak_days} active days</span>
        </div>
      </div>
    </div>
  );
}
