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

function getWebBaseUrl(apiUrl?: string): string {
  if (!apiUrl || !apiUrl.trim() || apiUrl.includes('api.github.com')) {
    return 'https://github.com';
  }
  return apiUrl.trim().replace(/\/api(\/v\d+)?\/?$/i, '').replace(/\/+$/, '');
}

export function getActiveGitHubToken(settings?: GithubSettings): string {
  if (!settings) return '';
  if (settings.authMode === 'oauth') {
    return settings.oauthToken?.trim() || '';
  }
  return settings.token?.trim() || '';
}

function getHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token.trim()}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'IADonkey-Launcher',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export const DEFAULT_GITHUB_CLIENT_ID = 'Ov23liKwJB5JD7CEPsO3';

/**
 * Initiates the GitHub Device Authorization Flow (RFC 8628).
 */
export async function startGitHubDeviceFlow(params: { clientId?: string; apiUrl?: string }): Promise<{
  success: boolean;
  deviceCode?: string;
  userCode?: string;
  verificationUri?: string;
  interval?: number;
  expiresIn?: number;
  error?: string;
}> {
  const clientId = params.clientId?.trim() || DEFAULT_GITHUB_CLIENT_ID;
  if (!clientId) {
    return { success: false, error: 'Chybí Client ID GitHub OAuth aplikace.' };
  }

  const webBase = getWebBaseUrl(params.apiUrl);
  try {
    const res = await fetch(`${webBase}/login/device/code`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        scope: 'repo read:org user',
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error_description || data.error || `Chyba při inicializaci OAuth (${res.status})`,
      };
    }

    return {
      success: true,
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri: data.verification_uri || `${webBase}/login/device`,
      interval: data.interval || 5,
      expiresIn: data.expires_in || 900,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Nepodařilo se připojit k autorizačnímu serveru GitHubu.',
    };
  }
}

/**
 * Polls the GitHub OAuth token endpoint during Device Flow authorization.
 */
export async function pollGitHubDeviceToken(params: { clientId?: string; deviceCode: string; apiUrl?: string }): Promise<{
  status: 'success' | 'pending' | 'slow_down' | 'expired' | 'denied' | 'error';
  accessToken?: string;
  user?: { login: string; name?: string; avatar_url?: string };
  error?: string;
}> {
  const clientId = params.clientId?.trim() || DEFAULT_GITHUB_CLIENT_ID;
  const { deviceCode } = params;
  const webBase = getWebBaseUrl(params.apiUrl);
  const apiBase = getApiBaseUrl(params.apiUrl);

  try {
    const res = await fetch(`${webBase}/login/oauth/access_token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId.trim(),
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const data = await res.json();
    if (data.error) {
      if (data.error === 'authorization_pending') {
        return { status: 'pending' };
      }
      if (data.error === 'slow_down') {
        return { status: 'slow_down' };
      }
      if (data.error === 'expired_token') {
        return { status: 'expired', error: 'Platnost kódu zařízení vypršela. Spusťte přihlášení znovu.' };
      }
      if (data.error === 'access_denied') {
        return { status: 'denied', error: 'Přístup byl na GitHubu zamítnut uživatelem.' };
      }
      return { status: 'error', error: data.error_description || data.error };
    }

    if (data.access_token) {
      try {
        const userRes = await fetch(`${apiBase}/user`, {
          headers: getHeaders(data.access_token),
        });
        let userData: { login: string; name?: string; avatar_url?: string } | undefined;
        if (userRes.ok) {
          const u = await userRes.json();
          userData = {
            login: u.login,
            name: u.name,
            avatar_url: u.avatar_url,
          };
        }
        return {
          status: 'success',
          accessToken: data.access_token,
          user: userData,
        };
      } catch {
        return {
          status: 'success',
          accessToken: data.access_token,
        };
      }
    }

    return { status: 'error', error: 'Server nevrátil přístupový token.' };
  } catch (err: any) {
    return { status: 'error', error: err?.message || 'Chyba sítě při ověřování tokenu.' };
  }
}

/**
 * Tests connection to GitHub with the provided credentials or OAuth token.
 */
export async function testGitHubConnection(settings?: GithubSettings): Promise<GitHubTestResult> {
  const isOAuth = settings?.authMode === 'oauth';
  const token = getActiveGitHubToken(settings);
  if (!token) {
    return {
      ok: false,
      error: isOAuth
        ? 'Účet GitHub není propojen přes OAuth. Přihlaste se prosím tlačítkem výše.'
        : 'Chybí Personal Access Token (PAT).',
    };
  }

  const base = getApiBaseUrl(settings?.apiUrl);
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
export async function fetchGitHubRepos(settings?: GithubSettings): Promise<LauncherItem[]> {
  const token = getActiveGitHubToken(settings);
  if (!token) return [];

  const base = getApiBaseUrl(settings?.apiUrl);
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

  // If a specific username is set or known via OAuth, fetch that user's repos as well to guarantee full coverage
  const specificUser = settings?.username?.trim() || (settings?.authMode === 'oauth' ? settings?.oauthUser?.login : '');
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
  const specificOrg = settings?.org?.trim();
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
          name: 'Klonovat repozitář (git clone)...',
          action: 'clone',
          location: repo.clone_url,
          icon: 'download',
          settings: 'git',
        },
        {
          name: 'Otevřít na GitHubu',
          action: 'open',
          location: repo.html_url,
          icon: 'open_in_new',
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
