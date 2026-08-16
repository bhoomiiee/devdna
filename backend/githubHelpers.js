const axios = require("axios");

const githubHeaders = () =>
  process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};

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

/**
 * Fetch one repo's weekly commit activity, retrying once if GitHub
 * returns 202 (stats are being computed server-side).
 * Returns an array of 52 week objects: { week: <unix ts>, total: n, days: [su,mo,tu,we,th,fr,sa] }
 */
async function fetchRepoCommitActivity(username, repoName) {
  const url = `https://api.github.com/repos/${username}/${repoName}/stats/commit_activity`;
  const headers = githubHeaders();

  try {
    const res = await axios.get(url, { headers, timeout: 10000 });
    if (res.status === 202) {
      // GitHub is computing stats — wait 2 s then try once more
      await new Promise((r) => setTimeout(r, 2000));
      const retry = await axios.get(url, { headers, timeout: 10000 });
      return Array.isArray(retry.data) ? retry.data : [];
    }
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
}

/**
 * Aggregate commit_activity from up to `limit` most-recently-updated repos
 * into a flat { date: "YYYY-MM-DD", count: n }[] covering the past 52 weeks.
 *
 * The endpoint returns weeks anchored to Sunday (UTC). We expand each
 * week's `days` array into individual ISO dates.
 */
async function fetchYearCommitActivity(username, repos, limit = 10) {
  // Take the most recently updated repos (already sorted that way)
  const targets = repos
    .filter((r) => !r.fork) // skip forks — those commits aren't the user's
    .slice(0, limit);

  if (targets.length === 0) return [];

  // Fetch all repos in parallel
  const allWeeks = await Promise.all(
    targets.map((r) => fetchRepoCommitActivity(username, r.name))
  );

  // Aggregate: sum counts by date across all repos
  const countByDay = {};

  for (const weeks of allWeeks) {
    for (const week of weeks) {
      if (!week?.days || !week?.week) continue;
      // week.week is a Unix timestamp for the Sunday of that week (UTC)
      const weekStart = new Date(week.week * 1000); // UTC midnight Sunday
      for (let d = 0; d < 7; d++) {
        const commits = week.days[d] ?? 0;
        if (commits === 0) continue;
        // Build UTC date string for this day
        const day = new Date(weekStart);
        day.setUTCDate(weekStart.getUTCDate() + d);
        const key = day.toISOString().slice(0, 10); // "YYYY-MM-DD" UTC
        countByDay[key] = (countByDay[key] || 0) + commits;
      }
    }
  }

  return Object.entries(countByDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = { fetchUser, fetchRepos, fetchYearCommitActivity };
