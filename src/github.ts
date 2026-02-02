export interface Repo {
  name: string;
  description: string | null;
  stargazers_count: number;
  html_url: string;
  updated_at: string;
}

interface GitHubRepo {
  name: string;
  description: string | null;
  stargazers_count: number;
  html_url: string;
  updated_at: string;
  fork: boolean;
}

const GITHUB_API = "https://api.github.com";
const USERNAME = "0xsalt";

export async function fetchRepos(): Promise<Repo[]> {
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
