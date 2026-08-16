"use client";
import { useState, useEffect, useCallback } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

const SUGGESTED = ["torvalds", "gaearon", "sindresorhus", "yyx990803"];

export default function Home() {
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState<"developer" | "recruiter">("developer");
  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMove = useCallback((e: MouseEvent) => {
    setMx(e.clientX / window.innerWidth - 0.5);
    setMy(e.clientY / window.innerHeight - 0.5);
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [handleMove]);

  const handleAnalyze = () => {
    if (!username.trim()) return;
    router.push(`/profile/${username.trim()}?mode=${mode}`);
  };

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        overflow: "hidden",
        background: "#0b1110",
        opacity: mounted ? 1 : 0,
        transition: "opacity 0.6s ease",
      }}
    >
      {/* ── Ambient orbs ─────────────────────────────────────── */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div
          className="dna-orb"
          style={{
            width: 720, height: 720,
            background: "radial-gradient(circle, rgba(74,181,224,0.13) 0%, transparent 68%)",
            top: "10%", left: "50%",
            transform: `translate(calc(-50% + ${mx * -50}px), calc(0% + ${my * -36}px))`,
            transition: "transform 0.7s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
        <div
          className="dna-orb"
          style={{
            width: 420, height: 420,
            background: "radial-gradient(circle, rgba(74,181,224,0.07) 0%, transparent 70%)",
            bottom: "10%", left: "12%",
            transform: `translate(${mx * 28}px, ${my * 20}px)`,
            transition: "transform 0.9s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
        <div
          className="dna-orb"
          style={{
            width: 320, height: 320,
            background: "radial-gradient(circle, rgba(253,241,225,0.04) 0%, transparent 70%)",
            top: "28%", right: "10%",
            transform: `translate(${mx * 20}px, ${my * 14}px)`,
            transition: "transform 1.1s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </div>

      {/* ── Hero title ───────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", marginBottom: 48 }}>
        <h1
          className="ogg"
          style={{
            margin: 0,
            fontSize: "clamp(4.5rem, 13vw, 10rem)",
            lineHeight: 0.9,
            color: "#fdf1e1",
            textShadow: "0 24px 64px rgba(0,0,0,0.55)",
          }}
        >
          Dev<span style={{ color: "#4ab5e0" }}>DNA</span>
        </h1>
        <p
          style={{
            marginTop: 24,
            color: "rgba(253,241,225,0.55)",
            fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)",
            fontWeight: 400,
            lineHeight: 1.55,
            maxWidth: 420,
            textShadow: "0 2px 16px rgba(0,0,0,0.4)",
          }}
        >
          AI-powered GitHub intelligence. Discover your developer archetype,
          skill fingerprint, and growth story.
        </p>
      </div>

      {/* ── Search card ──────────────────────────────────────── */}
      <div
        className="dna-card"
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 440,
          padding: "2rem",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <input
          id="github-username-input"
          type="text"
          placeholder="GitHub username"
          value={username}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleAnalyze()}
          className="dna-input"
          style={{ marginBottom: 14 }}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />

        {/* Mode pills */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {(["developer", "recruiter"] as const).map((m) => (
            <button
              key={m}
              id={`mode-${m}`}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                minHeight: 42,
                borderRadius: 999,
                border: mode === m ? "none" : "1px solid rgba(253,241,225,0.18)",
                background: mode === m ? "#fdf1e1" : "transparent",
                color: mode === m ? "#111411" : "rgba(253,241,225,0.58)",
                fontWeight: 600,
                fontSize: "0.88rem",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s ease",
                boxShadow: mode === m ? "0 4px 20px rgba(0,0,0,0.2)" : "none",
              }}
            >
              {m === "developer" ? "🧑‍💻 Developer" : "🧑‍💼 Recruiter"}
            </button>
          ))}
        </div>

        <button
          id="analyze-btn"
          onClick={handleAnalyze}
          disabled={!username.trim()}
          className="dna-btn-primary"
          style={{ width: "100%" }}
        >
          Analyze Profile →
        </button>

        <a
          href="/compare"
          id="compare-link"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: 16,
            color: "rgba(253,241,225,0.38)",
            fontSize: "0.85rem",
            textDecoration: "none",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(253,241,225,0.75)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(253,241,225,0.38)")}
        >
          ⚔️ Compare two developers
        </a>
      </div>

      {/* ── Suggested usernames ───────────────────────────────── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          marginTop: 28,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <span style={{ color: "rgba(253,241,225,0.28)", fontSize: "0.78rem" }}>Try:</span>
        {SUGGESTED.map((u) => (
          <button
            key={u}
            id={`suggest-${u}`}
            onClick={() => { setUsername(u); router.push(`/profile/${u}?mode=${mode}`); }}
            className="dna-tag"
            style={{ minHeight: 30, padding: "0 13px", fontSize: "0.77rem", cursor: "pointer" }}
          >
            {u}
          </button>
        ))}
      </div>
    </main>
  );
}

