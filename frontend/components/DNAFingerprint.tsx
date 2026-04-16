"use client";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface DNAScores {
  commit_consistency: number;
  language_diversity: number;
  project_complexity: number;
  documentation_quality: number;
  collaboration_score: number;
}

export default function DNAFingerprint({ scores }: { scores: DNAScores }) {
  const data = {
    labels: ["Commit Consistency", "Language Diversity", "Project Complexity", "Documentation", "Collaboration"],
    datasets: [{
      label: "DNA Score",
      data: [scores.commit_consistency, scores.language_diversity, scores.project_complexity, scores.documentation_quality, scores.collaboration_score],
      backgroundColor: "rgba(108, 99, 255, 0.2)",
      borderColor: "#6C63FF",
      borderWidth: 2,
      pointBackgroundColor: "#6C63FF",
    }],
  };

  const options = {
    scales: {
      r: {
        min: 0, max: 100,
        ticks: { display: false },
        grid: { color: "rgba(255,255,255,0.08)" },
        pointLabels: { color: "#94a3b8", font: { size: 12 } },
        angleLines: { color: "rgba(255,255,255,0.08)" },
      },
    },
    plugins: { legend: { display: false } },
  };

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/10">
      <h3 className="text-slate-400 text-sm mb-4 uppercase tracking-widest">Contribution DNA Fingerprint</h3>
      <Radar data={data} options={options} />
    </div>
  );
}


