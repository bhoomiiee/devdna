"use client";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = [
  "#6C63FF", "#FF6584", "#43E97B", "#F7971E", "#4FACFE",
  "#A18CD1", "#FBC2EB", "#84FAB0", "#F6D365", "#96FBC4",
];

interface LanguageChartProps {
  repos: { language: string | null }[];
}

export default function LanguageChart({ repos }: LanguageChartProps) {
  const langCount: Record<string, number> = {};
  repos.forEach((r) => {
    if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1;
  });

  const sorted = Object.entries(langCount).sort(([, a], [, b]) => b - a).slice(0, 8);
  const total = sorted.reduce((s, [, v]) => s + v, 0);

  const data = {
    labels: sorted.map(([lang]) => lang),
    datasets: [{
      data: sorted.map(([, count]) => count),
      backgroundColor: COLORS.slice(0, sorted.length),
      borderWidth: 0,
      hoverOffset: 8,
    }],
  };

  const options = {
    cutout: "70%",
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.label}: ${Math.round((ctx.raw / total) * 100)}%`,
        },
      },
    },
  };

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/10">
      <h3 className="text-slate-400 text-sm mb-4 uppercase tracking-widest">Language Breakdown</h3>
      <div className="flex items-center gap-6">
        <div className="w-40 h-40 flex-shrink-0">
          <Doughnut data={data} options={options} />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          {sorted.map(([lang, count], i) => (
            <div key={lang} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-white text-sm">{lang}</span>
              </div>
              <span className="text-slate-500 text-xs">{Math.round((count / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


