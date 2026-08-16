"use client";

interface CommitHeatmapProps {
  events: { date: string; count: number }[];
}

// ── Colour scale (GitHub-style) ───────────────────────────────────────────
function getColor(count: number): string {
  if (count === 0)  return "#161b22";
  if (count <= 2)   return "#0e4429";
  if (count <= 5)   return "#006d32";
  if (count <= 10)  return "#26a641";
  return "#39d353";
}

// ── UTC date helpers ──────────────────────────────────────────────────────
// All dates from the backend are UTC "YYYY-MM-DD" strings.
// We build the grid in UTC too so keys always match.

function utcDateKey(utcMs: number): string {
  const d = new Date(utcMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Start of today in UTC (midnight)
function todayUTC(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS   = ["", "Mon", "", "Wed", "", "Fri", ""];
const MS_PER_DAY   = 86_400_000;

// ── Stats helpers ─────────────────────────────────────────────────────────
function longestStreak(sortedDates: string[]): number {
  if (!sortedDates.length) return 0;
  let best = 1, cur = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]).getTime();
    const curr = new Date(sortedDates[i]).getTime();
    if (curr - prev === MS_PER_DAY) { cur++; best = Math.max(best, cur); }
    else cur = 1;
  }
  return best;
}

function mostActiveMonth(events: { date: string; count: number }[]): string {
  const byMonth: Record<string, number> = {};
  for (const e of events) {
    const key = e.date.slice(0, 7); // "YYYY-MM"
    byMonth[key] = (byMonth[key] ?? 0) + e.count;
  }
  const best = Object.entries(byMonth).sort((a, b) => b[1] - a[1])[0];
  if (!best) return "—";
  const [year, month] = best[0].split("-");
  return `${MONTH_LABELS[parseInt(month, 10) - 1]} ${year}`;
}

// ── Component ─────────────────────────────────────────────────────────────
export default function CommitHeatmap({ events }: CommitHeatmapProps) {
  // O(1) lookup map keyed on UTC date string
  const eventMap = new Map(events.map((e) => [e.date, e.count]));

  // Build a grid of exactly 52 weeks × 7 days, ending today (UTC)
  // Align the grid so the last column ends on today's weekday.
  const todayMs   = todayUTC();
  const todayDow  = new Date(todayMs).getUTCDay(); // 0=Sun … 6=Sat
  // Go back to the Sunday that starts the most-recent partial week
  const gridEndMs = todayMs + (6 - todayDow) * MS_PER_DAY; // last Sat of current week
  const gridStartMs = gridEndMs - 52 * 7 * MS_PER_DAY + MS_PER_DAY;

  const weeks: { date: string; count: number; future: boolean }[][] = [];
  for (let w = 0; w < 52; w++) {
    const week: { date: string; count: number; future: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const ms  = gridStartMs + (w * 7 + d) * MS_PER_DAY;
      const key = utcDateKey(ms);
      week.push({ date: key, count: eventMap.get(key) ?? 0, future: ms > todayMs });
    }
    weeks.push(week);
  }

  // Month labels — show label at the first column where the month changes
  const monthLabels: (string | null)[] = weeks.map((week, i) => {
    const month = parseInt(week[0].date.slice(5, 7), 10) - 1;
    if (i === 0) return MONTH_LABELS[month];
    const prev  = parseInt(weeks[i - 1][0].date.slice(5, 7), 10) - 1;
    return month !== prev ? MONTH_LABELS[month] : null;
  });

  // Stats
  const totalCommits  = events.reduce((s, e) => s + e.count, 0);
  const activeDays    = events.length;
  const streak        = longestStreak(events.map((e) => e.date).sort());
  const peakMonth     = mostActiveMonth(events);

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/5">
      {/* Header + stats */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <h3 className="text-slate-400 text-sm uppercase tracking-widest">Commit Activity</h3>
        <div className="flex gap-4 flex-wrap">
          {[
            { label: "commits",     value: totalCommits.toLocaleString() },
            { label: "active days", value: activeDays },
            { label: "best streak", value: `${streak}d` },
            { label: "peak month",  value: peakMonth },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-white text-sm font-semibold leading-none">{value}</div>
              <div className="text-slate-600 text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="relative" style={{ minWidth: 680 }}>
          {/* Month labels row */}
          <div className="flex mb-1" style={{ paddingLeft: 30 }}>
            {weeks.map((_, i) => (
              <div key={i} className="flex-shrink-0 text-xs text-slate-500" style={{ width: 14 }}>
                {monthLabels[i] ?? ""}
              </div>
            ))}
          </div>

          <div className="flex gap-0.5">
            {/* Day-of-week labels */}
            <div className="flex flex-col gap-0.5 mr-1 flex-shrink-0" style={{ width: 26 }}>
              {DAY_LABELS.map((d, i) => (
                <div key={i} className="text-xs text-slate-600 text-right pr-1 leading-none" style={{ height: 13 }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Columns (one per week) */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={day.future ? "" : `${day.date}: ${day.count} commit${day.count !== 1 ? "s" : ""}`}
                    className="rounded-sm transition-opacity hover:opacity-70"
                    style={{
                      width: 13,
                      height: 13,
                      backgroundColor: day.future ? "transparent" : getColor(day.count),
                      cursor: day.future ? "default" : "pointer",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1 mt-3 justify-end">
            <span className="text-xs text-slate-600 mr-1">Less</span>
            {[0, 2, 5, 8, 12].map((v) => (
              <div
                key={v}
                className="rounded-sm"
                style={{ width: 13, height: 13, backgroundColor: getColor(v) }}
              />
            ))}
            <span className="text-xs text-slate-600 ml-1">More</span>
          </div>
        </div>
      </div>

      {totalCommits === 0 && (
        <p className="text-slate-600 text-xs text-center mt-3">
          No public commit activity found in the past year.
        </p>
      )}
    </div>
  );
}
