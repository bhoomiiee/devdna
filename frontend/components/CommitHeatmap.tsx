"use client";

interface CommitHeatmapProps {
  events: { date: string; count: number }[];
}

function getColor(count: number): string {
  if (count === 0) return "#161b22";
  if (count <= 2)  return "#0e4429";
  if (count <= 5)  return "#006d32";
  if (count <= 10) return "#26a641";
  return "#39d353";
}

export default function CommitHeatmap({ events }: CommitHeatmapProps) {
  // Build last 52 weeks of data
  const today = new Date();
  const weeks: { date: string; count: number }[][] = [];

  for (let w = 51; w >= 0; w--) {
    const week: { date: string; count: number }[] = [];
    for (let d = 6; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(today.getDate() - w * 7 - d);
      const key = date.toISOString().slice(0, 10);
      const found = events.find((e) => e.date === key);
      week.push({ date: key, count: found?.count || 0 });
    }
    weeks.push(week);
  }

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthLabels: { label: string; col: number }[] = [];
  weeks.forEach((week, i) => {
    const month = new Date(week[0].date).getMonth();
    if (i === 0 || new Date(weeks[i - 1][0].date).getMonth() !== month) {
      monthLabels.push({ label: months[month], col: i });
    }
  });

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/10">
      <h3 className="text-slate-400 text-sm mb-4 uppercase tracking-widest">Commit Activity</h3>
      <div className="overflow-x-auto">
        <div className="relative" style={{ minWidth: 700 }}>
          {/* Month labels */}
          <div className="flex mb-1" style={{ paddingLeft: 28 }}>
            {weeks.map((_, i) => {
              const label = monthLabels.find((m) => m.col === i);
              return (
                <div key={i} className="w-3 mr-0.5 text-xs text-slate-500 flex-shrink-0">
                  {label ? label.label : ""}
                </div>
              );
            })}
          </div>
          <div className="flex gap-0.5">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1">
              {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
                <div key={i} className="h-3 text-xs text-slate-500 w-6 text-right pr-1">{d}</div>
              ))}
            </div>
            {/* Grid */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.count} commits`}
                    className="w-3 h-3 rounded-sm cursor-pointer transition-opacity hover:opacity-80"
                    style={{ backgroundColor: getColor(day.count) }}
                  />
                ))}
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-1 mt-3 justify-end">
            <span className="text-xs text-slate-500 mr-1">Less</span>
            {[0, 2, 5, 8, 12].map((v) => (
              <div key={v} className="w-3 h-3 rounded-sm" style={{ backgroundColor: getColor(v) }} />
            ))}
            <span className="text-xs text-slate-500 ml-1">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}


