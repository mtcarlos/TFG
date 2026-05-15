/**
 * githubClient.js — GitHub REST API v3 client
 * Makes server-side requests to avoid CORS and protect tokens.
 * Works without authentication (60 req/h) or with GITHUB_TOKEN env var (5000 req/h).
 */

const https = require("https");

const BASE = "api.github.com";
const USER_AGENT = "CollaborativeVR-TFG/1.0";

/**
 * Generic GET request to GitHub API.
 * @param {string} path — API path (e.g. "/repos/facebook/react")
 * @returns {Promise<object>}
 */
function githubGet(path) {
  return new Promise((resolve, reject) => {
    const headers = {
      "User-Agent": USER_AGENT,
      "Accept": "application/vnd.github.v3+json",
    };

    // Optional token from environment
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      headers["Authorization"] = `token ${token}`;
    }

    const options = {
      hostname: BASE,
      path: path,
      method: "GET",
      headers: headers,
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode === 404) {
          return reject({ status: 404, message: "Repository not found" });
        }
        if (res.statusCode === 403) {
          return reject({ status: 403, message: "GitHub API rate limit exceeded. Try again later." });
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject({ status: res.statusCode, message: `GitHub API error: ${res.statusCode}` });
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject({ status: 500, message: "Failed to parse GitHub response" });
        }
      });
    });

    req.on("error", (err) => {
      reject({ status: 500, message: `Network error: ${err.message}` });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject({ status: 408, message: "GitHub API request timed out" });
    });

    req.end();
  });
}

/**
 * Parse a GitHub repo identifier from various formats.
 * Accepts: "owner/repo", "https://github.com/owner/repo", etc.
 * @param {string} input
 * @returns {{ owner: string, repo: string }|null}
 */
function parseRepoInput(input) {
  if (!input || typeof input !== "string") return null;

  let cleaned = input.trim();

  // Remove trailing slashes and .git
  cleaned = cleaned.replace(/\/+$/, "").replace(/\.git$/, "");

  // Try URL format
  const urlMatch = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2] };
  }

  // Try owner/repo format
  const slashMatch = cleaned.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (slashMatch) {
    return { owner: slashMatch[1], repo: slashMatch[2] };
  }

  return null;
}

/**
 * Fetch repository general information.
 */
async function fetchRepoInfo(owner, repo) {
  return githubGet(`/repos/${owner}/${repo}`);
}

/**
 * Fetch repository languages.
 */
async function fetchLanguages(owner, repo) {
  return githubGet(`/repos/${owner}/${repo}/languages`);
}

/**
 * Fetch top contributors (first page, up to 30).
 */
async function fetchContributors(owner, repo) {
  try {
    return await githubGet(`/repos/${owner}/${repo}/contributors?per_page=10`);
  } catch (err) {
    // Some repos may have contributors disabled
    if (err.status === 403 || err.status === 404) return [];
    throw err;
  }
}

/**
 * Fetch all data for a repository in parallel.
 * @param {string} owner
 * @param {string} repo
 * @returns {Promise<{ repoInfo, languages, contributors }>}
 */
async function fetchAllRepoData(owner, repo) {
  const [repoInfo, languages, contributors] = await Promise.all([
    fetchRepoInfo(owner, repo),
    fetchLanguages(owner, repo),
    fetchContributors(owner, repo),
  ]);

  return { repoInfo, languages, contributors };
}

module.exports = {
  parseRepoInput,
  fetchRepoInfo,
  fetchLanguages,
  fetchContributors,
  fetchAllRepoData,
};
