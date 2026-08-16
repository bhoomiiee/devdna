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

const { fetchYearCommitActivity } = require("./githubHelpers");

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
    "production_score": <integer 0-100, e.g. 45>
  },
  "interview_readiness": {
    "overall_score": <integer 0-100, e.g. 65>,
    "categories": {
      "projects": { "score": <integer 0-100>, "note": "note" },
      "code_quality": { "score": <integer 0-100>, "note": "note" },
      "consistency": { "score": <integer 0-100>, "note": "note" },
      "collaboration": { "score": <integer 0-100>, "note": "note" },
      "documentation": { "score": <integer 0-100>, "note": "note" }
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
    const cached = await getCache(`analyze:${username}`);
    if (cached) return res.json(cached);

    const [user, repos] = await Promise.all([fetchUser(username), fetchRepos(username)]);

    // Full-year commit heatmap from repo stats (52 weeks)
    const commitEvents = await fetchYearCommitActivity(username, repos);

    // Streak = number of distinct days with at least 1 commit in the past year
    const streakDays = commitEvents.length;

    const dnaScores = computeDNAScores(repos);
    const milestones = computeMilestones(repos);
    const topSkills = computeTopSkills(repos);
    const roleFit = computeRoleFit(repos, topSkills);
    const skillDecay = computeSkillDecay(repos);

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
          demo.skill_decay = skillDecay;
          demo.repos = repos.slice(0, 30).map((r) => ({ name: r.name, language: r.language, stars: r.stargazers_count, forks: r.forks_count, description: r.description, url: r.html_url, size: r.size }));
          await setCache(`analyze:${username}`, demo);
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
      skill_decay: skillDecay,
      repos: repos.slice(0, 30).map((r) => ({
        name: r.name, language: r.language, stars: r.stargazers_count,
        forks: r.forks_count, description: r.description, url: r.html_url, size: r.size,
      })),
    };

    await setCache(`analyze:${username}`, result);
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
    const cached = await getCache(cacheKey);
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
    await setCache(cacheKey, result);
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

// ── Skill decay (pure computation, no AI) ─────────────────────────────────
function computeSkillDecay(repos) {
  const lastUsed = {};
  repos.forEach((r) => {
    if (r.language) {
      const ts = new Date(r.updated_at).getTime();
      if (!lastUsed[r.language] || ts > lastUsed[r.language]) lastUsed[r.language] = ts;
    }
  });
  const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;
  return Object.entries(lastUsed)
    .map(([language, ts]) => ({
      language,
      last_used: new Date(ts).toISOString().slice(0, 10),
      months_since: Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24 * 30)),
      decayed: (Date.now() - ts) > ONE_YEAR,
    }))
    .sort((a, b) => b.months_since - a.months_since);
}

// ── Resume generator ───────────────────────────────────────────────────────
app.post("/api/generate-resume", async (req, res) => {
  try {
    const { username, context } = req.body;
    if (!username) return res.status(400).json({ error: "username required" });

    const realProjects = (context.project_detection?.real_projects || []).slice(0, 6);
    const prompt = `Generate a professional developer resume/portfolio for GitHub user ${username}.

Profile: ${context.name || username} | Bio: ${context.bio || "None"} | Location: ${context.location || "Not specified"}
Skills: ${(context.top_skills || []).join(", ")}
Archetype: ${context.archetype?.type} — ${context.archetype?.description}
DNA Scores: Consistency ${context.dna_scores?.commit_consistency}/100, Complexity ${context.dna_scores?.project_complexity}/100, Docs ${context.dna_scores?.documentation_quality}/100, Collab ${context.dna_scores?.collaboration_score}/100
Role Fit: Frontend ${context.role_fit?.frontend}%, Backend ${context.role_fit?.backend}%, DevOps ${context.role_fit?.devops}%, AI/ML ${context.role_fit?.ai_ml}%
Real Projects: ${realProjects.map(p => p.name).join(", ") || "None identified"}
Repos: ${context.public_repos} | Followers: ${context.followers}
Growth: ${context.growth_narrative || "N/A"}

Respond ONLY with valid JSON matching this exact structure:
{
  "headline": "1 punchy professional headline (e.g. 'Full-Stack Engineer specializing in React & Node.js')",
  "summary": "3-4 sentence professional summary written in first person",
  "skills": {
    "primary": ["top 4-5 languages/frameworks they know well"],
    "secondary": ["3-4 tools, platforms or concepts they use"],
    "learning": ["1-2 skills they appear to be exploring"]
  },
  "projects": [
    { "name": "project name", "description": "1-2 sentence impact-focused description", "tech": ["t1","t2"], "highlight": "key achievement or metric" }
  ],
  "strengths": ["strength1","strength2","strength3"],
  "suggested_roles": ["role1","role2","role3"],
  "certifications_to_pursue": ["cert1","cert2"],
  "github_stats_summary": "1 sentence summarizing their GitHub presence"
}`;

    const raw = await aiCall([{ role: "user", content: prompt }], 1200);
    res.json(parseJSON(raw));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── Job description readiness / countdown ─────────────────────────────────
app.post("/api/jd-readiness", async (req, res) => {
  try {
    const { username, jobDescription, context } = req.body;
    if (!username || !jobDescription) return res.status(400).json({ error: "username and jobDescription required" });

    // Truncate JD to avoid blowing token budget
    const jd = jobDescription.trim().slice(0, 2500);

    const prompt = `You are a technical career coach. Evaluate how ready GitHub developer ${username} is for the following job.

Developer profile:
- Skills: ${(context.top_skills || []).join(", ")}
- Archetype: ${context.archetype?.type}
- Role Fit: Frontend ${context.role_fit?.frontend}%, Backend ${context.role_fit?.backend}%, DevOps ${context.role_fit?.devops}%, AI/ML ${context.role_fit?.ai_ml}%
- Known gaps: ${(context.gap_analysis || []).map(g => g.skill).join(", ")}
- Interview readiness overall: ${context.interview_readiness?.overall_score || "N/A"}/100

Job Description:
${jd}

Respond ONLY with valid JSON:
{
  "gap_score": <integer 0-100, where 100 = perfectly ready, 0 = not ready at all>,
  "verdict": "1-2 sentence honest assessment",
  "matched_skills": ["skill that matches JD requirement"],
  "missing_skills": [{"skill": "name", "importance": "critical|important|nice-to-have", "estimated_weeks": <integer>}],
  "weekly_plan": [
    {"week": 1, "goal": "short goal", "tasks": ["task1","task2"]},
    {"week": 2, "goal": "short goal", "tasks": ["task1","task2"]},
    {"week": 3, "goal": "short goal", "tasks": ["task1","task2"]},
    {"week": 4, "goal": "short goal", "tasks": ["task1","task2"]}
  ],
  "total_weeks_to_ready": <integer>,
  "quick_wins": ["thing they can do this week to immediately strengthen application"]
}`;

    const raw = await aiCall([{ role: "user", content: prompt }], 1500);
    res.json(parseJSON(raw));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── LinkedIn bio / elevator pitch generator ────────────────────────────────
app.post("/api/linkedin-bio", async (req, res) => {
  try {
    const { username, context, tone } = req.body;
    if (!username) return res.status(400).json({ error: "username required" });

    const toneLabel = tone || "professional";
    const prompt = `Generate LinkedIn profile copy and an elevator pitch for GitHub developer ${username}.
Tone: ${toneLabel}

Profile data:
- Name: ${context.name || username}
- Bio: ${context.bio || "None"}
- Top skills: ${(context.top_skills || []).join(", ")}
- Archetype: ${context.archetype?.type} — ${context.archetype?.description}
- Role Fit: Frontend ${context.role_fit?.frontend}%, Backend ${context.role_fit?.backend}%, DevOps ${context.role_fit?.devops}%, AI/ML ${context.role_fit?.ai_ml}%
- Repos: ${context.public_repos} | Followers: ${context.followers}
- Recruiter summary: ${context.recruiter_summary || "N/A"}
- Growth: ${context.growth_narrative || "N/A"}

Respond ONLY with valid JSON:
{
  "headline": "LinkedIn headline (max 220 chars, punchy, keyword-rich)",
  "linkedin_about": "LinkedIn About section (300-400 words, ${toneLabel} tone, first person, includes key skills and achievements, ends with a call to action)",
  "elevator_pitch": "30-second spoken elevator pitch (80-100 words, natural conversational language)",
  "short_pitch": "1-sentence Twitter/X bio version (max 160 chars)",
  "keywords": ["keyword1","keyword2","keyword3","keyword4","keyword5"]
}`;

    const raw = await aiCall([{ role: "user", content: prompt }], 1000);
    res.json(parseJSON(raw));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── PR Review Simulator ────────────────────────────────────────────────────
app.post("/api/pr-review", async (req, res) => {
  try {
    const { username, diff, prTitle } = req.body;
    if (!diff) return res.status(400).json({ error: "diff is required" });

    // Truncate diff to stay within token budget
    const truncatedDiff = diff.trim().slice(0, 3500);

    const prompt = `You are a senior software engineer doing a thorough code review. Review this pull request diff as if you are a senior reviewer at a top tech company. Be specific, constructive, and reference actual lines/patterns from the diff.

Developer: ${username || "unknown"}
PR Title: ${prTitle || "Untitled PR"}

Diff:
${truncatedDiff}

Respond ONLY with valid JSON:
{
  "overall_verdict": "approved|changes_requested|needs_discussion",
  "score": <integer 0-100, where 100 = production-perfect code>,
  "summary": "2-3 sentence high-level review summary",
  "comments": [
    {
      "type": "bug|security|performance|style|suggestion|praise",
      "severity": "critical|major|minor|nitpick",
      "location": "file or function name if identifiable, else 'general'",
      "comment": "specific observation about the code",
      "suggestion": "concrete improvement suggestion"
    }
  ],
  "positives": ["thing done well 1","thing done well 2"],
  "must_fix": ["critical issue 1 if any"],
  "learning_resources": [{"topic": "topic", "resource": "specific resource or search query"}]
}`;

    const raw = await aiCall([{ role: "user", content: prompt }], 1800);
    res.json(parseJSON(raw));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GitHub Twin Finder ────────────────────────────────────────────────────
// A curated pool of well-known public developers used for similarity matching.
// The AI compares the subject's DNA profile against this pool and picks the
// closest matches, then generates a similarity explanation.
const TWIN_POOL = [
  "torvalds","gvanrossum","dhh","sindresorhus","addyosmani","tj","yyx990803",
  "antfu","nicolo-ribaudo","wesbos","kentcdodds","paulirish","thepracticaldev",
  "mxcl","mattdesl","Rich-Harris","sebmck","ry","substack","isaacs",
  "jashkenas","fat","mdo","jeresig","brendaneich","creationix","feross",
  "rvagg","dominictarr","tj","expressjs","vuejs","facebook","google",
  "microsoft","vercel","netlify","supabase","prisma","shadcn",
];

app.post("/api/twin-finder", async (req, res) => {
  try {
    const { username, context } = req.body;
    if (!username) return res.status(400).json({ error: "username required" });

    // Pick a random diverse subset from the pool to keep token budget sane
    const poolSample = [...TWIN_POOL]
      .sort(() => Math.random() - 0.5)
      .slice(0, 20)
      .join(", ");

    const prompt = `You are DevDNA's GitHub Twin Finder. Your job is to find the most similar real GitHub developers to the subject based on their coding DNA.

Subject: ${username}
- Top skills: ${(context.top_skills || []).join(", ")}
- Archetype: ${context.archetype?.type} — ${context.archetype?.description}
- DNA: Consistency ${context.dna_scores?.commit_consistency}/100, Diversity ${context.dna_scores?.language_diversity}/100, Complexity ${context.dna_scores?.project_complexity}/100, Docs ${context.dna_scores?.documentation_quality}/100, Collab ${context.dna_scores?.collaboration_score}/100
- Role fit: Frontend ${context.role_fit?.frontend}%, Backend ${context.role_fit?.backend}%, DevOps ${context.role_fit?.devops}%, AI/ML ${context.role_fit?.ai_ml}%
- Repos: ${context.public_repos} | Followers: ${context.followers}
- Growth: ${context.growth_narrative || "N/A"}

Pool to match against (pick the best 3): ${poolSample}

For each match, explain WHY they are similar based on coding style, language choices, project types, or philosophy. Be specific and insightful.

Respond ONLY with valid JSON:
{
  "twins": [
    {
      "username": "github_username_from_pool",
      "similarity_score": <integer 60-99>,
      "match_reason": "2-3 sentences explaining the specific similarities in coding style, languages, and philosophy",
      "shared_traits": ["trait1", "trait2", "trait3"],
      "key_difference": "1 sentence on the main thing that sets them apart"
    }
  ],
  "twin_summary": "1-2 sentence fun summary of what kind of developer ${username} is, referencing the matches"
}`;

    const raw = await aiCall([{ role: "user", content: prompt }], 900);
    res.json(parseJSON(raw));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── Hackathon Squad Builder ───────────────────────────────────────────────
app.post("/api/squad-builder", async (req, res) => {
  try {
    const { usernames, hackathonTheme } = req.body;
    if (!usernames || !Array.isArray(usernames) || usernames.length < 2) {
      return res.status(400).json({ error: "At least 2 usernames required" });
    }
    if (usernames.length > 6) {
      return res.status(400).json({ error: "Maximum 6 members" });
    }

    // Fetch all profiles in parallel
    const profiles = await Promise.all(
      usernames.map(async (u) => {
        try {
          const [user, repos] = await Promise.all([fetchUser(u), fetchRepos(u)]);
          const topSkills = computeTopSkills(repos);
          const roleFit = computeRoleFit(repos, topSkills);
          const dna = computeDNAScores(repos);
          return {
            username: u,
            name: user.name || u,
            bio: user.bio || "",
            top_skills: topSkills,
            role_fit: roleFit,
            dna_scores: dna,
            public_repos: user.public_repos,
            followers: user.followers,
          };
        } catch {
          return { username: u, error: true, top_skills: [], role_fit: {}, dna_scores: {} };
        }
      })
    );

    const validProfiles = profiles.filter((p) => !p.error);
    if (validProfiles.length < 2) {
      return res.status(400).json({ error: "Could not fetch enough valid profiles" });
    }

    const profileSummary = validProfiles.map((p) =>
      `${p.username}: skills=[${p.top_skills.join(", ")}] fit=[FE:${p.role_fit.frontend}% BE:${p.role_fit.backend}% DO:${p.role_fit.devops}% AI:${p.role_fit.ai_ml}%] DNA=[consistency:${p.dna_scores.commit_consistency} complexity:${p.dna_scores.project_complexity} collab:${p.dna_scores.collaboration_score}]`
    ).join("\n");

    const prompt = `You are a hackathon team strategist. Analyze these developers and build the optimal squad composition.

Hackathon theme: ${hackathonTheme || "General / Full-Stack"}

Team members:
${profileSummary}

Respond ONLY with valid JSON:
{
  "squad_name": "a creative team name that reflects the collective vibe",
  "squad_score": <integer 0-100, overall squad strength>,
  "squad_verdict": "2-3 sentence assessment of this team's potential",
  "roles": [
    {
      "username": "github_username",
      "assigned_role": "e.g. Frontend Lead / Backend Architect / AI Engineer / DevOps / Product / Fullstack",
      "why": "1-2 sentences on why this person owns this role",
      "superpower": "their single biggest strength for this hackathon",
      "watch_out": "1 potential risk or blind spot"
    }
  ],
  "team_strengths": ["strength1", "strength2", "strength3"],
  "team_gaps": ["gap1", "gap2"],
  "win_strategy": "2-3 sentence tactical advice for how this team should approach the hackathon to win",
  "suggested_stack": ["tech1", "tech2", "tech3", "tech4"],
  "chemistry_score": <integer 0-100, how well these people likely collaborate>,
  "wildcard_tip": "1 unexpected insight or contrarian strategy for this specific team"
}`;

    const raw = await aiCall([{ role: "user", content: prompt }], 1400);
    const result = parseJSON(raw);

    // Attach avatar URLs to roles for the frontend
    result.profiles = validProfiles.map((p) => ({
      username: p.username,
      name: p.name,
      top_skills: p.top_skills,
      role_fit: p.role_fit,
    }));

    res.json(result);
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
