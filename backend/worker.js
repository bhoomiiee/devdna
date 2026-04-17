const { getTask, updateTask, addLog, broadcastTaskUpdate } = require("./tasks");
const logger = require("./logger");

// Task queue (in-memory, Redis-backed in production)
const queue = [];
let processing = false;

function enqueue(taskId) {
  queue.push(taskId);
  logger.info(`Task enqueued: ${taskId} (queue size: ${queue.length})`);
  if (!processing) processNext();
}

async function processNext() {
  if (queue.length === 0) { processing = false; return; }
  processing = true;
  const taskId = queue.shift();
  const task = getTask(taskId);
  if (!task) { processNext(); return; }

  updateTask(taskId, { status: "running" });
  addLog(taskId, "Task started processing");
  broadcastTaskUpdate(taskId);

  try {
    const result = await executeTask(task);
    updateTask(taskId, { status: "success", result });
    addLog(taskId, "Task completed successfully");
    broadcastTaskUpdate(taskId);
    logger.info(`Task ${taskId} completed`);
  } catch (err) {
    updateTask(taskId, { status: "failed", error: err.message });
    addLog(taskId, `Task failed: ${err.message}`);
    broadcastTaskUpdate(taskId);
    logger.error(`Task ${taskId} failed: ${err.message}`);
  }

  setTimeout(processNext, 100);
}

async function executeTask(task) {
  // Import groq lazily to avoid circular deps
  const { aiCall, parseJSON } = require("./aiHelpers");
  const { fetchUser, fetchRepos } = require("./githubHelpers");

  addLog(task.id, `Executing operation: ${task.operation}`);
  broadcastTaskUpdate(task.id);

  switch (task.operation) {
    case "analyze": {
      const { username } = task.input;
      addLog(task.id, `Fetching GitHub data for ${username}`);
      broadcastTaskUpdate(task.id);
      const [user, repos] = await Promise.all([fetchUser(username), fetchRepos(username)]);
      addLog(task.id, `Fetched ${repos.length} repos, running AI analysis`);
      broadcastTaskUpdate(task.id);
      const raw = await aiCall([{ role: "user", content: `Analyze GitHub developer ${username}. Bio: ${user.bio}. Repos: ${repos.length}. Top languages: ${[...new Set(repos.map(r=>r.language).filter(Boolean))].slice(0,5).join(", ")}. Give a 3-sentence analysis of their developer profile.` }], 300);
      return { username, analysis: raw, repos: repos.length, followers: user.followers };
    }
    case "roast": {
      const { username } = task.input;
      addLog(task.id, `Fetching GitHub data for roast of ${username}`);
      broadcastTaskUpdate(task.id);
      const [user, repos] = await Promise.all([fetchUser(username), fetchRepos(username)]);
      const langs = [...new Set(repos.map(r=>r.language).filter(Boolean))].slice(0,5);
      const stars = repos.reduce((s,r)=>s+r.stargazers_count,0);
      addLog(task.id, "Generating roast...");
      broadcastTaskUpdate(task.id);
      const raw = await aiCall([{ role: "user", content: `Roast this GitHub developer in a funny but not mean way. Be witty and specific to their actual data.\n\nDeveloper: ${username}\nBio: ${user.bio || "No bio (already suspicious)"}\nPublic repos: ${user.public_repos}\nFollowers: ${user.followers}\nTotal stars: ${stars}\nLanguages: ${langs.join(", ") || "None (they just watch others code)"}\nMost recent repo: ${repos[0]?.name || "none"}\n\nWrite a 3-4 sentence roast. Be funny and reference their actual stats.` }], 300);
      return { username, roast: raw };
    }
    case "gap_analysis": {
      const { username } = task.input;
      const [user, repos] = await Promise.all([fetchUser(username), fetchRepos(username)]);
      const skills = [...new Set(repos.map(r=>r.language).filter(Boolean))].slice(0,5);
      addLog(task.id, "Analyzing skill gaps...");
      broadcastTaskUpdate(task.id);
      const raw = await aiCall([{ role: "user", content: `Identify 3 skill gaps for GitHub developer ${username} who knows: ${skills.join(", ")}. For each gap give: skill name, why they need it, one concrete project to build. Be specific. No markdown.` }], 400);
      return { username, gaps: raw };
    }
    case "interview_readiness": {
      const { username } = task.input;
      const [user, repos] = await Promise.all([fetchUser(username), fetchRepos(username)]);
      addLog(task.id, "Evaluating interview readiness...");
      broadcastTaskUpdate(task.id);
      const raw = await aiCall([{ role: "user", content: `Rate ${username}'s interview readiness 0-100 based on: ${user.public_repos} repos, ${user.followers} followers, languages: ${[...new Set(repos.map(r=>r.language).filter(Boolean))].slice(0,5).join(", ")}. Give score, verdict, and top tip. No markdown.` }], 300);
      return { username, readiness: raw };
    }
    case "compare": {
      const { user1, user2 } = task.input;
      addLog(task.id, `Comparing ${user1} vs ${user2}`);
      broadcastTaskUpdate(task.id);
      const [u1, u2] = await Promise.all([fetchUser(user1), fetchUser(user2)]);
      const raw = await aiCall([{ role: "user", content: `Compare GitHub developers ${user1} (${u1.public_repos} repos, ${u1.followers} followers) and ${user2} (${u2.public_repos} repos, ${u2.followers} followers). Who is stronger and why? 3 sentences. No markdown.` }], 300);
      return { user1, user2, comparison: raw };
    }
    default:
      throw new Error(`Unknown operation: ${task.operation}`);
  }
}

module.exports = { enqueue };
