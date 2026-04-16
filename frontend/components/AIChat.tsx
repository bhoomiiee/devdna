"use client";
import { useState, useRef, useEffect } from "react";
import axios from "axios";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatProps {
  username: string;
  data: any;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const SUGGESTIONS = [
  "Is this developer good at system design?",
  "What projects should they build next?",
  "Would they be a good hire for a startup?",
  "What are their biggest strengths?",
];

export default function AIChat({ username, data }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: `Hey! I've analyzed ${data.name || username}'s GitHub profile. Ask me anything about their skills, fit for roles, or what they should work on next.`,
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const question = text || input.trim();
    if (!question || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/chat`, {
        username,
        question,
        context: {
          name: data.name,
          bio: data.bio,
          top_skills: data.top_skills,
          archetype: data.archetype,
          dna_scores: data.dna_scores,
          role_fit: data.role_fit,
          public_repos: data.public_repos,
          followers: data.followers,
          growth_narrative: data.growth_narrative,
          gap_analysis: data.gap_analysis,
        },
      });
      setMessages((prev) => [...prev, { role: "assistant", content: res.data.answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Make sure the backend is running." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-white/5 flex flex-col" style={{ height: 480 }}>
      <div className="p-4 border-b border-white/5">
        <h3 className="text-slate-400 text-sm uppercase tracking-widest">Ask AI about {username}</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-xs md:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-brand text-white rounded-br-sm"
                : "bg-surface text-slate-300 rounded-bl-sm"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1">
              {[0, 150, 300].map((d) => (
                <div key={d} className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)}
              className="text-xs bg-surface text-slate-400 border border-white/10 px-3 py-1.5 rounded-full hover:border-brand hover:text-white transition-all">
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="p-4 border-t border-white/5 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask anything about this developer..."
          className="flex-1 bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand"
        />
        <button onClick={() => send()} disabled={loading || !input.trim()}
          className="bg-brand hover:bg-brand-dark disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-sm transition-all">
          Send
        </button>
      </div>
    </div>
  );
}
