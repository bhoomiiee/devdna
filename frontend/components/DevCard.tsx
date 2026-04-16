"use client";

interface DevCardProps {
  data: any;
  username: string;
}

export default function DevCard({ data, username }: DevCardProps) {
  // Dev Card Component
  const handleExport = async () => {
    const element = document.getElementById("dev-card");
    if (!element) return;
    const html2canvas = (await import("html2canvas")).default;
    html2canvas(element).then((canvas) => {
      const link = document.createElement("a");
      link.download = `devdna-${username}.png`;
      link.href = canvas.toDataURL();
      link.click();
    });
  };

  const topRole = data.role_fit
    ? Object.entries(data.role_fit as Record<string, number>)
        .sort(([, a], [, b]) => b - a)
        .find(([, score]) => score > 0) ?? null
    : null;

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-400 text-sm uppercase tracking-widest">Shareable Dev Card</h3>
        <button onClick={handleExport}
          className="text-sm bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-xl">
          Export as PNG
        </button>
      </div>
      <div id="dev-card" className="bg-surface p-6 rounded-xl">
        <div className="flex items-center gap-4 mb-4">
          <img src={data.avatar_url} alt={username} className="w-16 h-16 rounded-full border-2 border-brand" />
          <div>
            <h2 className="text-2xl font-bold text-white">{data.name || username}</h2>
            <p className="text-slate-400">{data.archetype?.emoji} {data.archetype?.type}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-slate-400 text-sm">Top Skills</p>
            <p className="text-white">{(data.top_skills || []).slice(0, 3).join(", ")}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Active Days</p>
            <p className="text-white">{data.streak_days} days</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Best Role Fit</p>
            <p className="text-white capitalize">
              {topRole ? `${topRole[0].replace("_", "/")}: ${topRole[1]}%` : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">GitHub</p>
            <p className="text-white">github.com/{username}</p>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
          <p className="text-slate-400 text-sm">Powered by DevDNA</p>
          <p className="text-slate-500 text-xs">{data.public_repos} repos · {data.followers} followers</p>
        </div>
      </div>
    </div>
  );
}
