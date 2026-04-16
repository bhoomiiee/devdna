"use client";

const TABS = [
  { id: "overview",      label: "Overview",      icon: "🧬" },
  { id: "intelligence",  label: "Intelligence",  icon: "🔬" },
  { id: "career",        label: "Career",        icon: "🎯" },
  { id: "ai",            label: "AI Tools",      icon: "🤖" },
  { id: "share",         label: "Share",         icon: "🪪" },
];

interface ProfileTabsProps {
  activeTab: string;
  onChange: (tab: string) => void;
}

export default function ProfileTabs({ activeTab, onChange }: ProfileTabsProps) {
  return (
    <div className="border-b border-white/10 mb-6">
      <nav className="flex gap-0 -mb-px overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "border-gh-orange text-white font-semibold"
                : "border-transparent text-slate-400 hover:text-white hover:border-white/10"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

