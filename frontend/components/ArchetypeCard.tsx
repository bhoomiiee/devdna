interface ArchetypeData {
  type: string;
  emoji: string;
  description: string;
}

export default function ArchetypeCard({ archetype }: { archetype: ArchetypeData }) {
  return (
    <div className="bg-card rounded-2xl p-6 border border-white/10">
      <h3 className="text-slate-400 text-sm mb-3 uppercase tracking-widest">Developer Archetype</h3>
      <div className="text-5xl mb-3">{archetype.emoji}</div>
      <h2 className="text-2xl font-bold text-white mb-2">{archetype.type}</h2>
      <p className="text-slate-400 text-sm leading-relaxed">{archetype.description}</p>
    </div>
  );
}


