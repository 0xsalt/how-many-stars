export interface Repo {
  name: string;
  description: string | null;
  stargazers_count: number;
  html_url: string;
  updated_at: string;
  language: string | null;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string;
}

interface GitHubRepo {
  name: string;
  description: string | null;
  stargazers_count: number;
  html_url: string;
  updated_at: string;
  fork: boolean;
  language: string | null;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string;
}

const GITHUB_API = "https://api.github.com";
const USERNAME = "0xsalt";

export async function fetchRepos(): Promise<Repo[]> {
  const RATE_LIMIT_STATUS = [403, 429];
  const repos: Repo[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `${GITHUB_API}/users/${USERNAME}/repos?per_page=${perPage}&page=${page}&type=public`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "how-many-stars",
      },
    });

    if (!response.ok) {
      if (RATE_LIMIT_STATUS.includes(response.status)) {
        const resetHeader = response.headers.get("x-ratelimit-reset");
        const resetTime = resetHeader
          ? new Date(parseInt(resetHeader) * 1000).toLocaleTimeString()
          : "unknown";
        throw new Error(
          `GitHub API rate limit exceeded. Resets at ${resetTime}. ` +
            `Unauthenticated requests are limited to 60/hour.`
        );
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data: GitHubRepo[] = await response.json();

    if (data.length === 0) {
      break;
    }

    for (const repo of data) {
      if (!repo.fork) {
        repos.push({
          name: repo.name,
          description: repo.description,
          stargazers_count: repo.stargazers_count,
          html_url: repo.html_url,
          updated_at: repo.updated_at,
          language: repo.language,
          forks_count: repo.forks_count,
          open_issues_count: repo.open_issues_count,
          pushed_at: repo.pushed_at,
        });
      }
    }

    if (data.length < perPage) {
      break;
    }

    page++;
  }

  // Sort by stars descending
  repos.sort((a, b) => b.stargazers_count - a.stargazers_count);

  return repos;
}

export function getTotalStars(repos: Repo[]): number {
  return repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
}
