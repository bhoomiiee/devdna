"use client";
import { useState } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface PRReviewSimulatorProps {
  username: string;
}

const SAMPLE_DIFF = `diff --git a/src/auth.js b/src/auth.js
index 1234567..abcdefg 100644
--- a/src/auth.js
+++ b/src/auth.js
@@ -12,8 +12,14 @@ const express = require('express');
 
 app.post('/login', (req, res) => {
-  const user = db.query('SELECT * FROM users WHERE email = "' + req.body.email + '"');
-  if (user && user.password === req.body.password) {
-    res.json({ token: 'hardcoded-secret-token' });
+  const { email, password } = req.body;
+  const user = db.query('SELECT * FROM users WHERE email = ?', [email]);
+  if (user && bcrypt.compareSync(password, user.password_hash)) {
+    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
+    res.json({ token });
   } else {
     res.status(401).json({ error: 'Invalid credentials' });
   }
 });`;

const VERDICT_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  approved: {
    label: "✅ Approved",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  changes_requested: {
    label: "🔄 Changes Requested",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
  needs_discussion: {
    label: "💬 Needs Discussion",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/20",
  major: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  minor: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  nitpick: "bg-slate-500/15 text-slate-400 border-slate-500/20",
};

const TYPE_ICON: Record<string, string> = {
  bug: "🐛",
  security: "🔐",
  performance: "⚡",
  style: "🎨",
  suggestion: "💡",
  praise: "✨",
};

export default function PRReviewSimulator({ username }: PRReviewSimulatorProps) {
  const [diff, setDiff] = useState("");
  const [prTitle, setPrTitle] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const review = async () => {
    if (!diff.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await axios.post(`${API}/api/pr-review`, {
        username,
        diff: diff.trim(),
        prTitle: prTitle.trim() || "Untitled PR",
      });
      setResult(res.data);
    } catch {
      setError("Failed to review PR. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verdictStyle = result
    ? VERDICT_STYLES[result.overall_verdict] || VERDICT_STYLES.needs_discussion
    : null;

  return (
    <div className="bg-card rounded-2xl p-6 border border-white/5">
      <h3 className="text-slate-400 text-sm uppercase tracking-widest mb-2">PR Review Simulator</h3>
      <p className="text-slate-500 text-sm mb-5">
        Paste a real diff and get a mock senior engineer code review with actionable feedback.
      </p>

      {!result && (
        <div className="space-y-3">
          <input
            type="text"
            value={prTitle}
            onChange={(e) => setPrTitle(e.target.value)}
            placeholder="PR title (optional)"
            className="w-full bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand"
          />
          <div className="relative">
            <textarea
              value={diff}
              onChange={(e) => setDiff(e.target.value)}
              placeholder="Paste your git diff here…"
              rows={10}
              className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-brand resize-none font-mono"
            />
            {!diff && (
              <button
                onClick={() => setDiff(SAMPLE_DIFF)}
                className="absolute bottom-3 right-3 text-xs text-slate-500 hover:text-brand transition-all bg-surface px-2 py-1 rounded border border-white/10"
              >
                Try sample diff
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={review}
              disabled={loading || !diff.trim()}
              className="bg-brand hover:bg-brand-dark disabled:opacity-40 text-white px-6 py-2.5 rounded-xl text-sm transition-all"
            >
              {loading ? "Reviewing…" : "🔍 Review PR"}
            </button>
            <p className="text-slate-600 text-xs">Diff is truncated at 3500 chars for processing.</p>
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

      {result && (
        <div className="space-y-5 mt-2">
          {/* Verdict header */}
          <div className={`rounded-xl p-4 border ${verdictStyle?.bg} ${verdictStyle?.border} flex items-center gap-4`}>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className={`text-lg font-semibold ${verdictStyle?.color}`}>{verdictStyle?.label}</span>
                <span className="text-slate-400 text-sm">Score: <span className="text-white font-medium">{result.score}/100</span></span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{result.summary}</p>
            </div>
          </div>

          {/* Positives */}
          {result.positives?.length > 0 && (
            <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-4">
              <h4 className="text-green-400 text-xs uppercase tracking-widest mb-2">✨ What's Done Well</h4>
              <ul className="space-y-1.5">
                {result.positives.map((p: string, i: number) => (
                  <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                    <span className="text-green-400 flex-shrink-0 mt-0.5">+</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Must Fix */}
          {result.must_fix?.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
              <h4 className="text-red-400 text-xs uppercase tracking-widest mb-2">🚨 Must Fix Before Merge</h4>
              <ul className="space-y-1.5">
                {result.must_fix.map((m: string, i: number) => (
                  <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                    <span className="text-red-400 flex-shrink-0 mt-0.5">!</span> {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Inline comments */}
          {result.comments?.length > 0 && (
            <div className="bg-surface rounded-xl p-4 border border-white/5">
              <h4 className="text-slate-400 text-xs uppercase tracking-widest mb-3">
                Review Comments ({result.comments.length})
              </h4>
              <div className="space-y-3">
                {result.comments.map((c: any, i: number) => (
                  <div key={i} className="border border-white/5 rounded-xl p-3.5">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-base">{TYPE_ICON[c.type] || "💬"}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${SEVERITY_STYLES[c.severity] || SEVERITY_STYLES.nitpick}`}>
                        {c.severity}
                      </span>
                      <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded font-mono">
                        {c.location}
                      </span>
                      <span className="text-xs text-slate-600 capitalize ml-auto">{c.type}</span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed mb-2">{c.comment}</p>
                    {c.suggestion && (
                      <div className="bg-brand/5 border border-brand/15 rounded-lg px-3 py-2">
                        <p className="text-brand text-xs font-medium mb-0.5">Suggestion</p>
                        <p className="text-slate-300 text-sm">{c.suggestion}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning Resources */}
          {result.learning_resources?.length > 0 && (
            <div className="bg-surface rounded-xl p-4 border border-white/5">
              <h4 className="text-slate-400 text-xs uppercase tracking-widest mb-3">📚 Further Reading</h4>
              <ul className="space-y-2">
                {result.learning_resources.map((r: any, i: number) => (
                  <li key={i} className="text-sm">
                    <span className="text-white">{r.topic}</span>
                    <span className="text-slate-500 text-xs ml-2">→ {r.resource}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => setResult(null)}
            className="text-xs text-slate-500 hover:text-brand transition-all"
          >
            ↺ Review another diff
          </button>
        </div>
      )}
    </div>
  );
}
