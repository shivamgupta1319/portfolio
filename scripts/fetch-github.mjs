// Build-time GitHub ingestion. Writes src/data/quests.generated.json.
//
// Auth: prefers GITHUB_TOKEN (for CI), else falls back to the local `gh` CLI
// token so private repos are included on the author's machine. With no token
// it fetches public repos only. On any failure it keeps the previously
// committed JSON so builds never break (and stay offline-safe).

import { execSync } from "node:child_process";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/quests.generated.json");
const USER = "shivamgupta1319";

function getToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execSync("gh auth token", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

async function fetchRepos(token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "shivamos-portfolio-build",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  // Authenticated → /user/repos (includes private). Anonymous → public only.
  const base = token
    ? "https://api.github.com/user/repos?affiliation=owner&per_page=100&sort=pushed"
    : `https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`;

  const all = [];
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(`${base}&page=${page}`, { headers });
    if (!res.ok) throw new Error(`GitHub API ${res.status} ${res.statusText}`);
    const batch = await res.json();
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

function toRecord(repo) {
  return {
    name: repo.name,
    description: repo.description ?? "",
    language: repo.language ?? null,
    topics: repo.topics ?? [],
    stars: repo.stargazers_count ?? 0,
    isPrivate: !!repo.private,
    url: repo.html_url,
    homepage: repo.homepage || "",
    pushedAt: repo.pushed_at,
    updatedAt: repo.updated_at,
  };
}

async function main() {
  const token = getToken();
  try {
    const repos = (await fetchRepos(token))
      .filter((r) => !r.fork)
      .map(toRecord)
      .sort((a, b) => (a.pushedAt < b.pushedAt ? 1 : -1));
    writeFileSync(OUT, JSON.stringify(repos, null, 2) + "\n");
    const priv = repos.filter((r) => r.isPrivate).length;
    console.log(
      `[fetch-github] wrote ${repos.length} repos (${priv} private)` +
        (token ? "" : " — anonymous (public only)"),
    );
  } catch (err) {
    if (existsSync(OUT)) {
      const n = JSON.parse(readFileSync(OUT, "utf8")).length;
      console.warn(
        `[fetch-github] fetch failed (${err.message}); keeping ${n} cached repos`,
      );
    } else {
      writeFileSync(OUT, "[]\n");
      console.warn(
        `[fetch-github] fetch failed (${err.message}); wrote empty list`,
      );
    }
  }
}

main();
