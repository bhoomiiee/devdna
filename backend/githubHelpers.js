const axios = require("axios");

const githubHeaders = () =>
  process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};

async function fetchUser(username) {
  const res = await axios.get(`https://api.github.com/users/${username}`, { headers: githubHeaders() });
  return res.data;
}

async function fetchRepos(username) {
  const res = await axios.get(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, { headers: githubHeaders() });
  return res.data;
}

module.exports = { fetchUser, fetchRepos };
