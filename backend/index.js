const { getDemoProfile } = require("./demo");
const { initRedis, getCache, setCache, getCacheSize } = require("./cache");
const { register, login, authMiddleware } = require("./auth");
const { createTask, getTask, getUserTasks, addSSEClient, removeSSEClient } = require("./tasks");
const { enqueue } = require("./worker");
const { setProviders } = require("./aiHelpers");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const Groq = require("groq-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const helmet = require("helmet");
const morgan = require("morgan");
const logger = require("./logger");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security headers
app.use(helmet());

// CORS — allow Vercel frontend
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://devdna-one.vercel.app",
    /\.vercel\.app$/,  // allow all Vercel preview deployments
  ],
  credentials: true,
}));

// Request logging
app.use(morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(express.json({ limit: "10kb" })); // limit payload size

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const gemini = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Share AI providers with worker
setProviders(groq, gemini);

logger.info(`AI Provider: ${groq ? "Groq ✓" : ""}${gemini ? " Gemini ✓" : ""}${!groq && !gemini ? "NONE" : ""}`);

const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many auth attempts." },
});

// ── In-memory cache replaced by Redis (see cache.js) ─────────────────────

// ── AI call — tries Groq first, falls back to Gemini immediately ──────────
async function aiCall(messages, maxTokens = 1200) {
  // Try Groq first (no retries on rate limit — fall through instantly)
  if (groq) {
    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
      });
      return completion.choices[0].message.content.trim();
    } catch (err) {
      const isRateLimit = err?.status === 429 || err?.message?.toLowerCase().includes("rate limit")
        || err?.message?.toLowerCase().includes("rate_limit");
      const isAuthError = err?.status === 401;
      if (isRateLimit || isAuthError) {
        console.log("Groq rate limited → switching to Gemini");
        // fall through to Gemini below
      } else {
        throw err; // real error, don't swallow
      }
    }
  }

  // Gemini fallback
  if (gemini) {
    try {
      console.log("Using Gemini...");
      const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = messages.map((m) => m.content).join("\n\n");
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err) {
      if (err?.status === 429) {
        console.log("Gemini also rate limited → demo mode");
        throw { isDemoFallback: true };
      }
      throw err;
    }
  }

  throw new Error("No AI provider available.");
}

const groqCall = aiCall;

function parseJSON(raw) {
  return JSON.parse(
    raw.replace(/^```json\n?/, "").replace(/^```\n?/, "").replace(/\n?```$/, "")
  );
}

const githubHeaders = () =>
  GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {};

// ── GitHub fetchers ────────────────────────────────────────────────────────
async function fetchUser(username) {
  const res = await axios.get(`https://api.github.com/users/${username}`, { headers: githubHeaders() });
  return res.data;
}

async function fetchRepos(username) {
  const res = await axios.get(
    `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
    { headers: githubHeaders() }
  );
  return res.data;
}

async function fetchEvents(username) {
  try {
    const res = await axios.get(
      `https://api.github.com/users/${username}/events/public?per_page=100`,
      { headers: githubHeaders() }
    );
    return res.data;
  } catch { return []; }
}

// ── Computed metrics ───────────────────────────────────────────────────────
function computeDNAScores(repos) {
  const total = repos.length || 1;
  const recentlyActive = repos.filter((r) => {
    const months = (Date.now() - new Date(r.updated_at)) / (1000 * 60 * 60 * 24 * 30);
    return months < 6;
  }).length;
  const languages = new Set(repos.map((r) => r.language).filter(Boolean));
  const complexRepos = repos.filter((r) => r.size > 500 || r.stargazers_count > 10).length;
  const documented = repos.filter((r) => r.description && r.description.length > 10).length;
  const forkedByOthers = repos.filter((r) => r.forks_count > 0).length;
  return {
    commit_consistency: Math.min(Math.round((recentlyActive / total) * 100), 100),
    language_diversity: Math.min(languages.size * 14, 100),
    project_complexity: Math.min(Math.round((complexRepos / total) * 100) + 10, 100),
    documentation_quality: Math.min(Math.round((documented / total) * 100), 100),
    collaboration_score: Math.min(Math.round((forkedByOthers / total) * 100) + 5, 100),
  };
}

function computeMilestones(repos) {
  const byYear = {};
  repos.forEach((r) => {
    const year = new Date(r.created_at).getFullYear();
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(r);
  });
  return Object.entries(byYear).sort(([a], [b]) => a - b).slice(-5).map(([year, yr]) => {
    const langs = [...new Set(yr.map((r) => r.language).filter(Boolean))];
    const stars = yr.reduce((s, r) => s + r.stargazers_count, 0);
    return {
      year: parseInt(year), tech: langs[0] || "Various", repos: yr.length,
      description: `Created ${yr.length} repo${yr.length > 1 ? "s" : ""} using ${langs.slice(0, 3).join(", ") || "various technologies"}${stars > 0 ? ` · ${stars} stars` : ""}`,
    };
  });
}

function computeTopSkills(repos) {
  const langCount = {};
  repos.forEach((r) => { if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1; });
  return Object.entries(langCount).sort(([, a], [, b]) => b - a).slice(0, 5).map(([lang]) => lang);
}

function computeRoleFit(repos, topSkills) {
  if (!repos.length && !topSkills.length) {
    return { frontend: 0, backend: 0, devops: 0, ai_ml: 0 };
  }
  const allText = [...topSkills.map((s) => s.toLowerCase()),
    ...repos.map((r) => (r.name + " " + (r.description || "")).toLowerCase())].join(" ");
  const score = (kws) => {
    const hits = kws.filter((k) => allText.includes(k)).length;
    if (hits === 0) return 0; // no baseline if no matches
    return Math.min(Math.round((hits / kws.length) * 100), 100);
  };
  return {
    frontend: score(["react","vue","angular","next","svelte","css","html","tailwind","typescript","javascript","ui","frontend"]),
    backend: score(["node","express","django","flask","spring","api","graphql","rest","postgres","mysql","mongodb","java","go","rust","python","backend","server"]),
    devops: score(["docker","kubernetes","terraform","ansible","aws","gcp","azure","nginx","linux","bash","devops","deploy"]),
    ai_ml: score(["ml","ai","tensorflow","pytorch","keras","sklearn","pandas","numpy","jupyter","model","neural","nlp","data","llm"]),
  };
}

// ── Single master Groq call — everything in one prompt ────────────────────
async function masterAnalysis(username, user, repos, dnaScores, topSkills, roleFit) {
  const repoSummary = repos.slice(0, 15).map((r) => ({
    name: r.name, language: r.language, stars: r.stargazers_count,
    forks: r.forks_count, description: r.description, size: r.size,
  }));

  const prompt = `You are DevDNA. Analyze this GitHub developer and return ALL analysis in ONE response.

Developer: ${username} | Bio: ${user.bio || "None"} | Repos: ${user.public_repos} | Followers: ${user.followers}
Top skills: ${topSkills.join(", ")}
DNA: Consistency ${dnaScores.commit_consistency}, Diversity ${dnaScores.language_diversity}, Complexity ${dnaScores.project_complexity}, Docs ${dnaScores.documentation_quality}, Collab ${dnaScores.collaboration_score}
Role Fit: Frontend ${roleFit.frontend}%, Backend ${roleFit.backend}%, DevOps ${roleFit.devops}%, AI/ML ${roleFit.ai_ml}%
Repos sample: ${JSON.stringify(repoSummary)}

Respond ONLY with this exact JSON structure:
{
  "archetype": { "type": "The Architect|The Hacker|The Collaborator|The Specialist", "emoji": "🏗️|⚡|🤝|🔬", "description": "2-3 sentence personalized description" },
  "growth_narrative": "3-4 sentence growth story based on actual repos and timeline",
  "gap_analysis": [
    { "skill": "gap 1 specific to their stack", "suggestion": "concrete project to build", "resources": ["resource1", "resource2"] },
    { "skill": "gap 2", "suggestion": "concrete suggestion", "resources": ["resource1", "resource2"] },
    { "skill": "gap 3", "suggestion": "concrete suggestion", "resources": ["resource1", "resource2"] }
  ],
  "recruiter_summary": "2-3 sentence recruiter summary",
  "project_detection": {
    "summary": "X out of Y projects show production-level complexity",
    "real_projects": [{ "name": "name", "reason": "why real", "complexity": "high|medium|low" }],
    "tutorial_projects": [{ "name": "name", "reason": "why tutorial" }],
    "production_score": 0
  },
  "interview_readiness": {
    "overall_score": 0,
    "categories": {
      "projects": { "score": 0, "note": "note" },
      "code_quality": { "score": 0, "note": "note" },
      "consistency": { "score": 0, "note": "note" },
      "collaboration": { "score": 0, "note": "note" },
      "documentation": { "score": 0, "note": "note" }
    },
    "verdict": "1-2 sentence verdict",
    "top_tip": "most impactful improvement tip"
  },
  "opportunities": [
    { "repo": "owner/repo", "why": "why it matches", "issue_type": "good first issue", "skill_gained": "skill", "url": "https://github.com/owner/repo" },
    { "repo": "owner/repo", "why": "why it matches", "issue_type": "good first issue", "skill_gained": "skill", "url": "https://github.com/owner/repo" },
    { "repo": "owner/repo", "why": "why it matches", "issue_type": "documentation", "skill_gained": "skill", "url": "https://github.com/owner/repo" },
    { "repo": "owner/repo", "why": "why it matches", "issue_type": "good first issue", "skill_gained": "skill", "url": "https://github.com/owner/repo" },
    { "repo": "owner/repo", "why": "why it matches", "issue_type": "good first issue", "skill_gained": "skill", "url": "https://github.com/owner/repo" }
  ]
}`;

  const raw = await groqCall([{ role: "user", content: prompt }], 2000);
  return parseJSON(raw);
}

// ── Main analyze route ─────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cache_size: getCacheSize(),
    ai_provider: groq ? "groq+gemini" : gemini ? "gemini" : "demo",
  });
});

app.get("/api/analyze/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const cached = getCache(`analyze:${username}`);
    if (cached) return res.json(cached);

    const events = await fetchEvents(username);
    const [user, repos] = await Promise.all([fetchUser(username), fetchRepos(username)]);

    // Streak from events
    const pushDays = new Set(events.filter((e) => e.type === "PushEvent").map((e) => e.created_at.slice(0, 10)));
    const streakDays = pushDays.size;

    // Commit heatmap
    const countByDay = {};
    events.filter((e) => e.type === "PushEvent").forEach((e) => {
      const day = e.created_at.slice(0, 10);
      countByDay[day] = (countByDay[day] || 0) + (e.payload?.commits?.length || 1);
    });
    const commitEvents = Object.entries(countByDay).map(([date, count]) => ({ date, count }));

    const dnaScores = computeDNAScores(repos);
    const milestones = computeMilestones(repos);
    const topSkills = computeTopSkills(repos);
    const roleFit = computeRoleFit(repos, topSkills);

    // Default DNA scores for empty profiles
    const safeDnaScores = repos.length === 0 ? {
      commit_consistency: 0, language_diversity: 0,
      project_complexity: 0, documentation_quality: 0, collaboration_score: 0,
    } : dnaScores;

    // Single Groq call for everything
    let ai;
    if (repos.length === 0) {
      ai = {
        archetype: { type: "New Developer", emoji: "🌱", description: `${username} has no public repositories yet.` },
        growth_narrative: `${username} has just joined GitHub and hasn't published any public repositories yet.`,
        gap_analysis: [{ skill: "First Project", suggestion: "Create your first public repository.", resources: ["github.com/new"] }],
        recruiter_summary: `${username} has no public repositories. Insufficient data for assessment.`,
        project_detection: { summary: "No repositories found", real_projects: [], tutorial_projects: [], production_score: 0 },
        interview_readiness: { overall_score: 0, categories: { projects: { score: 0, note: "No public projects" }, code_quality: { score: 0, note: "No code to review" }, consistency: { score: 0, note: "No commit history" }, collaboration: { score: 0, note: "No activity" }, documentation: { score: 0, note: "No repos" } }, verdict: "Insufficient data.", top_tip: "Start by creating your first project on GitHub." },
        opportunities: [],
      };
    } else {
      try {
        ai = await masterAnalysis(username, user, repos, dnaScores, topSkills, roleFit);
      } catch (err) {
        if (err?.isDemoFallback) {
          console.log(`Both APIs rate limited — serving demo data for ${username}`);
          const demo = getDemoProfile(username);
          demo.avatar_url = user.avatar_url;
          demo.name = user.name || username;
          demo.bio = user.bio || demo.bio;
          demo.location = user.location || demo.location;
          demo.public_repos = user.public_repos;
          demo.followers = user.followers;
          demo.following = user.following;
          demo.streak_days = streakDays;
          demo.top_skills = topSkills.length ? topSkills : demo.top_skills;
          demo.dna_scores = dnaScores;
          demo.milestones = milestones;
          demo.role_fit = roleFit;
          demo.commit_events = commitEvents;
          demo.repos = repos.slice(0, 30).map((r) => ({ name: r.name, language: r.language, stars: r.stargazers_count, forks: r.forks_count, description: r.description, url: r.html_url, size: r.size }));
          setCache(`analyze:${username}`, demo);
          return res.json(demo);
        }
        throw err;
      }
    }

    const result = {
      avatar_url: user.avatar_url,
      name: user.name || username,
      bio: user.bio || "",
      location: user.location || "",
      public_repos: user.public_repos,
      followers: user.followers,
      following: user.following,
      streak_days: streakDays,
      top_skills: topSkills,
      archetype: ai.archetype || { type: "Unknown", emoji: "🧬", description: "" },
      dna_scores: safeDnaScores,
      growth_narrative: ai.growth_narrative,
      milestones,
      gap_analysis: ai.gap_analysis,
      role_fit: roleFit,
      recruiter_summary: ai.recruiter_summary,
      project_detection: ai.project_detection,
      interview_readiness: ai.interview_readiness,
      opportunities: ai.opportunities,
      commit_events: commitEvents,
      repos: repos.slice(0, 30).map((r) => ({
        name: r.name, language: r.language, stars: r.stargazers_count,
        forks: r.forks_count, description: r.description, url: r.html_url, size: r.size,
      })),
    };

    setCache(`analyze:${username}`, result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to analyze profile" });
  }
});

// ── Compare ────────────────────────────────────────────────────────────────
app.get("/api/compare/:user1/:user2", async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const cacheKey = `compare:${user1}:${user2}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const [u1, r1, u2, r2] = await Promise.all([fetchUser(user1), fetchRepos(user1), fetchUser(user2), fetchRepos(user2)]);
    const skills1 = computeTopSkills(r1), skills2 = computeTopSkills(r2);
    const dna1 = computeDNAScores(r1), dna2 = computeDNAScores(r2);
    const fit1 = computeRoleFit(r1, skills1), fit2 = computeRoleFit(r2, skills2);

    const prompt = `Compare two GitHub developers. Respond ONLY with valid JSON.

Dev1: ${user1} | Skills: ${skills1.join(", ")} | DNA: ${JSON.stringify(dna1)} | Fit: ${JSON.stringify(fit1)}
Dev2: ${user2} | Skills: ${skills2.join(", ")} | DNA: ${JSON.stringify(dna2)} | Fit: ${JSON.stringify(fit2)}

{
  "verdict": "1-2 sentence comparison",
  "strengths": { "${user1}": ["s1","s2","s3"], "${user2}": ["s1","s2","s3"] },
  "weaknesses": { "${user1}": ["w1","w2"], "${user2}": ["w1","w2"] },
  "best_for": { "${user1}": "best role", "${user2}": "best role" }
}`;

    const raw = await groqCall([{ role: "user", content: prompt }], 600);
    const ai = parseJSON(raw);
    const result = {
      user1: { username: user1, avatar: u1.avatar_url, name: u1.name, dna: dna1, fit: fit1, skills: skills1 },
      user2: { username: user2, avatar: u2.avatar_url, name: u2.name, dna: dna2, fit: fit2, skills: skills2 },
      ...ai,
    };
    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── Role simulation (user-triggered, not auto) ─────────────────────────────
app.post("/api/role-simulation", async (req, res) => {
  try {
    const { username, role, context } = req.body;
    const prompt = `Evaluate ${username} for the role: ${role}.
Skills: ${(context.top_skills||[]).join(", ")} | Archetype: ${context.archetype?.type}
DNA: ${JSON.stringify(context.dna_scores)} | Fit: ${JSON.stringify(context.role_fit)}

Respond ONLY with valid JSON:
{ "readiness_score": 0, "verdict": "1 sentence", "strong_areas": ["a","b","c"], "missing_skills": [{"skill":"s","importance":"critical|important|nice-to-have","how_to_learn":"tip"}], "timeline": "X months" }`;

    const raw = await groqCall([{ role: "user", content: prompt }], 500);
    res.json(parseJSON(raw));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── Explain repo (user-triggered) ─────────────────────────────────────────
app.post("/api/explain-repo", async (req, res) => {
  try {
    const { username, repo } = req.body;
    const headers = githubHeaders();
    const [repoRes, readmeRes, treeRes] = await Promise.allSettled([
      axios.get(`https://api.github.com/repos/${username}/${repo}`, { headers }),
      axios.get(`https://api.github.com/repos/${username}/${repo}/readme`, { headers }),
      axios.get(`https://api.github.com/repos/${username}/${repo}/git/trees/HEAD?recursive=1`, { headers }),
    ]);
    const repoData = repoRes.status === "fulfilled" ? repoRes.value.data : {};
    const readme = readmeRes.status === "fulfilled"
      ? Buffer.from(readmeRes.value.data.content, "base64").toString("utf-8").slice(0, 1000) : "No README";
    const files = treeRes.status === "fulfilled"
      ? treeRes.value.data.tree.map((f) => f.path).slice(0, 40).join(", ") : "";

    const prompt = `Explain this GitHub repo: ${username}/${repo}
Description: ${repoData.description||"None"} | Language: ${repoData.language||"?"} | Stars: ${repoData.stargazers_count||0}
README: ${readme}
Files: ${files}

Respond ONLY with valid JSON:
{ "summary": "2-3 sentences", "tech_stack": ["t1","t2"], "architecture": "2-3 sentences", "key_features": ["f1","f2","f3"], "complexity": "beginner|intermediate|advanced", "use_case": "who uses this" }`;

    const raw = await groqCall([{ role: "user", content: prompt }], 500);
    res.json(parseJSON(raw));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── Chat (user-triggered) ──────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { username, question, context } = req.body;
    const prompt = `You are DevDNA AI. Answer about ${username}'s GitHub profile in 2-4 sentences. Be specific, reference their actual data. No markdown.

Skills: ${(context.top_skills||[]).join(", ")} | Archetype: ${context.archetype?.type} | Repos: ${context.public_repos}
Role Fit: Frontend ${context.role_fit?.frontend}%, Backend ${context.role_fit?.backend}%, DevOps ${context.role_fit?.devops}%, AI/ML ${context.role_fit?.ai_ml}%
Gaps: ${(context.gap_analysis||[]).map((g) => g.skill).join(", ")}

Question: ${question}`;

    const raw = await groqCall([{ role: "user", content: prompt }], 250);
    res.json({ answer: raw });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Chat failed. Try again in a moment." });
  }
});

app.get("/metrics", (req, res) => {
  res.json({
    uptime_seconds: Math.floor(process.uptime()),
    memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    cache_entries: cache.size,
    node_version: process.version,
    environment: process.env.NODE_ENV || "development",
  });
});

// ── Auth routes ────────────────────────────────────────────────────────────
app.post("/api/auth/register", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    const user = await register(email, password);
    res.status(201).json({ message: "User created", user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const result = await login(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ── Task routes ────────────────────────────────────────────────────────────
app.post("/api/tasks", authMiddleware, apiLimiter, (req, res) => {
  try {
    const { operation, input } = req.body;
    if (!operation || !input) return res.status(400).json({ error: "operation and input required" });
    const task = createTask(req.user.id, operation, input);
    enqueue(task.id);
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/tasks", authMiddleware, (req, res) => {
  const tasks = getUserTasks(req.user.id);
  res.json(tasks);
});

app.get("/api/tasks/:id", authMiddleware, (req, res) => {
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (task.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  res.json(task);
});

// SSE — real-time task status
app.get("/api/tasks/:id/stream", authMiddleware, (req, res) => {
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (task.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Send current state immediately
  res.write(`data: ${JSON.stringify(task)}\n\n`);

  addSSEClient(req.params.id, res);

  req.on("close", () => {
    removeSSEClient(req.params.id, res);
  });
});

// ── Start server ───────────────────────────────────────────────────────────
async function start() {
  await initRedis();
  app.listen(PORT, () => logger.info(`DevDNA backend running on http://localhost:${PORT}`));
}

start();
