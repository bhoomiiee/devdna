"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body style={{ background: "#0F0F1A", color: "#e2e8f0", fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 32 }}>
          <h2 style={{ marginBottom: 12 }}>Something went wrong</h2>
          <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: 14 }}>{error.message}</p>
          <button onClick={reset} style={{ background: "#6C63FF", color: "white", border: "none", padding: "10px 24px", borderRadius: 12, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
