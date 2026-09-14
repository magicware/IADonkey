import type { GithubSettings, LauncherItem } from '../src/types';

export interface GitHubTestResult {
  ok: boolean;
  user?: {
    login: string;
    name?: string;
    avatar_url?: string;
  };
  orgs?: string[];
  repoCount?: number;
  error?: string;
}

interface RawGitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  ssh_url?: string;
  description?: string | null;
  private?: boolean;
  default_branch?: string;
  language?: string | null;
  owner?: {
    login: string;
    avatar_url?: string;
    type?: string;
  };
}

function getApiBaseUrl(apiUrl?: string): string {
  if (!apiUrl || !apiUrl.trim()) {
    return 'https://api.github.com';
  }
  return apiUrl.trim().replace(/\/+$/, '');
}

function getHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token.trim()}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'IADonkey-Launcher',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/**
 * Tests connection to GitHub with the provided credentials.
 */
export async function testGitHubConnection(settings: GithubSettings): Promise<GitHubTestResult> {
  const token = settings.token?.trim();
  if (!token) {
    return { ok: false, error: 'Chybí Personal Access Token (PAT).' };
  }

  const base = getApiBaseUrl(settings.apiUrl);
  const headers = getHeaders(token);

  try {
    // 1. Fetch authenticated user profile
    const userRes = await fetch(`${base}/user`, { headers });
    if (!userRes.ok) {
      if (userRes.status === 401) {
        return { ok: false, error: 'Neplatný token (HTTP 401 Unauthorized).' };
      }
      return { ok: false, error: `Chyba GitHub API: ${userRes.status} ${userRes.statusText}` };
    }
    const userData = (await userRes.json()) as { login: string; name?: string; avatar_url?: string };

    // 2. Fetch user's organizations
    let orgNames: string[] = [];
    try {
      const orgsRes = await fetch(`${base}/user/orgs`, { headers });
      if (orgsRes.ok) {
        const orgsData = (await orgsRes.json()) as Array<{ login: string }>;
        orgNames = orgsData.map((o) => o.login);
      }
    } catch {}

    // 3. Count accessible repositories
    const repos = await fetchGitHubRepos(settings);

    return {
      ok: true,
      user: {
        login: userData.login,
        name: userData.name,
        avatar_url: userData.avatar_url,
      },
      orgs: orgNames,
      repoCount: repos.length,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Nepodařilo se navázat spojení se serverem GitHub.' };
  }
}

/**
 * Fetches repositories accessible to the user (personal + organizations)
 * and formats them as LauncherItems.
 */
export async function fetchGitHubRepos(settings: GithubSettings): Promise<LauncherItem[]> {
  const token = settings.token?.trim();
  if (!token) return [];

  const base = getApiBaseUrl(settings.apiUrl);
  const headers = getHeaders(token);
  const reposMap = new Map<number, RawGitHubRepo>();

  // Fetch page 1 (and 2 if needed) of user repos (including orgs membership)
  try {
    const userReposUrl = `${base}/user/repos?per_page=100&affiliation=owner,collaborator,organization_member&sort=updated`;
    const res = await fetch(userReposUrl, { headers });
    if (res.ok) {
      const data = (await res.json()) as RawGitHubRepo[];
      if (Array.isArray(data)) {
        for (const repo of data) {
          if (repo && repo.id) {
            reposMap.set(repo.id, repo);
          }
        }
      }
    } else {
      console.warn(`[GitHubService] /user/repos returned status ${res.status}`);
    }
  } catch (err) {
    console.error('[GitHubService] Error fetching user repos:', err);
  }

  // If a specific username is set, fetch that user's repos as well to guarantee full coverage
  const specificUser = settings.username?.trim();
  if (specificUser) {
    try {
      const userUrl = `${base}/users/${encodeURIComponent(specificUser)}/repos?per_page=100&sort=updated`;
      const res = await fetch(userUrl, { headers });
      if (res.ok) {
        const data = (await res.json()) as RawGitHubRepo[];
        if (Array.isArray(data)) {
          for (const repo of data) {
            if (repo && repo.id) {
              reposMap.set(repo.id, repo);
            }
          }
        }
      }
    } catch (err) {
      console.error(`[GitHubService] Error fetching user "${specificUser}" repos:`, err);
    }
  }

  // If a specific organization is set, fetch org repos as well to guarantee full coverage
  const specificOrg = settings.org?.trim();
  if (specificOrg) {
    try {
      const orgReposUrl = `${base}/orgs/${encodeURIComponent(specificOrg)}/repos?per_page=100&sort=updated`;
      const res = await fetch(orgReposUrl, { headers });
      if (res.ok) {
        const data = (await res.json()) as RawGitHubRepo[];
        if (Array.isArray(data)) {
          for (const repo of data) {
            if (repo && repo.id) {
              reposMap.set(repo.id, repo);
            }
          }
        }
      } else {
        console.warn(`[GitHubService] /orgs/${specificOrg}/repos returned status ${res.status}`);
      }
    } catch (err) {
      console.error(`[GitHubService] Error fetching org "${specificOrg}" repos:`, err);
    }
  }

  const allRawRepos = Array.from(reposMap.values());

  // Map to LauncherItem
  return allRawRepos.map((repo) => {
    const isPrivate = repo.private === true;
    const repoLabel = repo.full_name || repo.name;
    const ownerAvatar = repo.owner?.avatar_url || null;

    return {
      id: `github-${repo.id}`,
      name: repoLabel,
      location: repo.html_url,
      action: 'open',
      icon: 'folder_code',
      image: '{favicon}',
      priority: 5,
      settings: 'git',
      sourceId: 'github',
      shortcuts: [repo.name, repo.full_name],
      actions: [
        {
          name: 'Otevřít na GitHubu',
          action: 'open',
          location: repo.html_url,
          icon: 'open_in_new',
          settings: 'git',
        },
        {
          name: 'Klonovat repozitář (git clone)...',
          action: 'clone',
          location: repo.clone_url,
          icon: 'download',
          settings: 'git',
        },
        {
          name: 'Klonovat rekurzivně (git clone --recursive)...',
          action: 'clonerecursive',
          location: repo.clone_url,
          icon: 'folder_zip',
          settings: 'git',
        },
      ],
      info: {
        'Repozitář': repoLabel,
        'Vlastník': repo.owner?.login || '',
        'Viditelnost': isPrivate ? 'Soukromý (Private)' : 'Veřejný (Public)',
        'Výchozí větev': repo.default_branch || 'main',
        'Clone URL': repo.clone_url,
        'SSH URL': repo.ssh_url,
        ...(repo.language ? { 'Jazyk': repo.language } : {}),
      },
    };
  });
}
