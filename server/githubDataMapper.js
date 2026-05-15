/**
 * githubDataMapper.js — Transform raw GitHub API responses
 * into a clean, normalized format ready for the scene and future BabiaXR charts.
 */

/**
 * Map raw GitHub API data to the standardized format.
 * @param {{ repoInfo: object, languages: object, contributors: Array }} raw
 * @returns {object} Processed data matching the spec structure
 */
function mapRepoData(raw) {
  const { repoInfo, languages, contributors } = raw;

  // Process languages: convert { "JavaScript": 123456, "HTML": 30000 } to array with percentages
  const totalBytes = Object.values(languages).reduce((sum, b) => sum + b, 0);
  const languagesArray = Object.entries(languages).map(([name, bytes]) => ({
    name,
    bytes,
    percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 1000) / 10 : 0,
  }));

  // Sort by bytes descending
  languagesArray.sort((a, b) => b.bytes - a.bytes);

  // Process contributors
  const contributorsArray = (contributors || []).map((c) => ({
    login: c.login,
    contributions: c.contributions,
    avatarUrl: c.avatar_url,
  }));

  return {
    owner: repoInfo.owner?.login || "",
    repo: repoInfo.name || "",
    fullName: repoInfo.full_name || "",
    description: repoInfo.description || "No description provided.",
    htmlUrl: repoInfo.html_url || "",
    stars: repoInfo.stargazers_count || 0,
    forks: repoInfo.forks_count || 0,
    openIssues: repoInfo.open_issues_count || 0,
    mainLanguage: repoInfo.language || "Unknown",
    createdAt: repoInfo.created_at || "",
    updatedAt: repoInfo.updated_at || "",
    license: repoInfo.license?.spdx_id || "No license",
    defaultBranch: repoInfo.default_branch || "main",
    size: repoInfo.size || 0,
    languages: languagesArray,
    contributors: contributorsArray,
  };
}

/**
 * Generate BabiaXR-compatible datasets from processed repo data.
 * These can be served as JSON or injected into babia-queryjson entities.
 * @param {object} data — Output from mapRepoData
 * @returns {{ languagesDataset, contributorsDataset, summaryDataset }}
 */
function toBabiaDatasets(data) {
  // Dataset for bar chart: languages
  const languagesDataset = data.languages.map((l) => ({
    key: l.name,
    value: l.percentage,
    bytes: l.bytes,
  }));

  // Dataset for contributor ranking
  const contributorsDataset = data.contributors.map((c) => ({
    key: c.login,
    value: c.contributions,
    avatar: c.avatarUrl,
  }));

  // Summary metrics for cards/indicators
  const summaryDataset = [
    { metric: "Stars", value: data.stars },
    { metric: "Forks", value: data.forks },
    { metric: "Open Issues", value: data.openIssues },
    { metric: "Languages", value: data.languages.length },
    { metric: "Contributors", value: data.contributors.length },
    { metric: "Size (KB)", value: data.size },
  ];

  return { languagesDataset, contributorsDataset, summaryDataset };
}

module.exports = {
  mapRepoData,
  toBabiaDatasets,
};
