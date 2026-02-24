// GitHub API service for Obsidian vault sync
// Reads/writes markdown files to a GitHub repository

const API_BASE = 'https://api.github.com';

/**
 * Get stored GitHub settings from localStorage
 */
function getGitHubSettings() {
  return {
    token: localStorage.getItem('github_token') || '',
    owner: localStorage.getItem('github_owner') || '',
    repo: localStorage.getItem('github_repo') || '',
    branch: localStorage.getItem('github_branch') || 'main',
    path: localStorage.getItem('github_vault_path') || 'papers', // folder in repo
  };
}

/**
 * Check if GitHub integration is configured
 */
export function isGitHubConfigured() {
  const s = getGitHubSettings();
  return !!(s.token && s.owner && s.repo);
}

/**
 * Save GitHub settings to localStorage
 */
export function saveGitHubSettings({ token, owner, repo, branch, path }) {
  if (token !== undefined) localStorage.setItem('github_token', token);
  if (owner !== undefined) localStorage.setItem('github_owner', owner);
  if (repo !== undefined) localStorage.setItem('github_repo', repo);
  if (branch !== undefined) localStorage.setItem('github_branch', branch || 'main');
  if (path !== undefined) localStorage.setItem('github_vault_path', path || 'papers');
}

/**
 * Clear GitHub settings
 */
export function clearGitHubSettings() {
  ['github_token', 'github_owner', 'github_repo', 'github_branch', 'github_vault_path']
    .forEach(k => localStorage.removeItem(k));
}

// ──────────────────────────────────────────────
//  Core API helpers
// ──────────────────────────────────────────────

function headers() {
  const { token } = getGitHubSettings();
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function repoUrl(endpoint = '') {
  const { owner, repo } = getGitHubSettings();
  return `${API_BASE}/repos/${owner}/${repo}${endpoint}`;
}

function vaultPrefix() {
  const { path } = getGitHubSettings();
  return path ? `${path}/` : '';
}

/**
 * Test connection to GitHub repo
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
export async function testConnection() {
  if (!isGitHubConfigured()) {
    return { ok: false, message: 'GitHub 설정이 완료되지 않았습니다.' };
  }
  try {
    const res = await fetch(repoUrl(), { headers: headers() });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, message: `연결 성공: ${data.full_name} (${data.private ? 'private' : 'public'})` };
    }
    if (res.status === 404) return { ok: false, message: '저장소를 찾을 수 없습니다. Owner/Repo를 확인하세요.' };
    if (res.status === 401) return { ok: false, message: '인증 실패. GitHub 토큰을 확인하세요.' };
    return { ok: false, message: `GitHub API 오류: ${res.status}` };
  } catch (err) {
    return { ok: false, message: `네트워크 오류: ${err.message}` };
  }
}

// ──────────────────────────────────────────────
//  File operations
// ──────────────────────────────────────────────

/**
 * List all markdown files in the vault folder
 * @returns {Promise<Array<{ name: string, path: string, sha: string }>>}
 */
export async function listVaultFiles() {
  const { branch } = getGitHubSettings();
  const prefix = vaultPrefix().replace(/\/$/, '');

  // Use Git Trees API for efficient listing
  const treeRes = await fetch(repoUrl(`/git/trees/${branch}?recursive=1`), { headers: headers() });
  if (!treeRes.ok) {
    // Fallback: maybe the repo is empty or branch doesn't exist
    if (treeRes.status === 404) return [];
    throw new Error(`Failed to list files: ${treeRes.status}`);
  }

  const treeData = await treeRes.json();
  return treeData.tree
    .filter(item =>
      item.type === 'blob' &&
      item.path.endsWith('.md') &&
      (prefix ? item.path.startsWith(prefix + '/') : true)
    )
    .map(item => ({
      name: item.path.split('/').pop(),
      path: item.path,
      sha: item.sha,
    }));
}

/**
 * Read a single markdown file from the repo
 * @param {string} filePath - Path relative to repo root
 * @returns {Promise<{ content: string, sha: string }>}
 */
export async function readFile(filePath) {
  const res = await fetch(repoUrl(`/contents/${encodeURIComponent(filePath)}`), {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Failed to read ${filePath}: ${res.status}`);
  const data = await res.json();
  const content = decodeBase64(data.content);
  return { content, sha: data.sha };
}

/**
 * Read multiple files efficiently (parallel with concurrency limit)
 * @param {string[]} filePaths
 * @param {number} concurrency
 * @returns {Promise<Array<{ path: string, content: string, sha: string }>>}
 */
export async function readFiles(filePaths, concurrency = 5) {
  const results = [];
  for (let i = 0; i < filePaths.length; i += concurrency) {
    const batch = filePaths.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (fp) => {
        try {
          const { content, sha } = await readFile(fp);
          return { path: fp, content, sha };
        } catch (err) {
          console.warn(`Failed to read ${fp}:`, err);
          return null;
        }
      })
    );
    results.push(...batchResults.filter(Boolean));
  }
  return results;
}

/**
 * Create or update a file in the repo
 * @param {string} filePath - Path relative to repo root
 * @param {string} content - File content (UTF-8 text)
 * @param {string|null} sha - SHA of existing file (null for new files)
 * @param {string} message - Commit message
 * @returns {Promise<{ sha: string, commitSha: string }>}
 */
export async function writeFile(filePath, content, sha = null, message = '') {
  const { branch } = getGitHubSettings();
  const body = {
    message: message || `Update ${filePath.split('/').pop()}`,
    content: encodeBase64(content),
    branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(repoUrl(`/contents/${encodeURIComponent(filePath)}`), {
    method: 'PUT',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to write ${filePath}: ${res.status} - ${err.message || ''}`);
  }

  const data = await res.json();
  return { sha: data.content.sha, commitSha: data.commit.sha };
}

/**
 * Write multiple files in a single commit (using Git Trees API)
 * Much more efficient than individual writeFile calls
 * @param {Array<{ path: string, content: string }>} files
 * @param {string} message - Commit message
 * @returns {Promise<string>} - Commit SHA
 */
export async function writeFilesCommit(files, message = 'Sync papers from web') {
  const { branch } = getGitHubSettings();
  const h = { ...headers(), 'Content-Type': 'application/json' };

  // 1. Get the latest commit SHA on the branch
  const refRes = await fetch(repoUrl(`/git/ref/heads/${branch}`), { headers: headers() });
  if (!refRes.ok) throw new Error(`Failed to get branch ref: ${refRes.status}`);
  const refData = await refRes.json();
  const latestCommitSha = refData.object.sha;

  // 2. Get the tree SHA of the latest commit
  const commitRes = await fetch(repoUrl(`/git/commits/${latestCommitSha}`), { headers: headers() });
  if (!commitRes.ok) throw new Error(`Failed to get commit: ${commitRes.status}`);
  const commitData = await commitRes.json();
  const baseTreeSha = commitData.tree.sha;

  // 3. Create blobs for each file
  const treeItems = await Promise.all(
    files.map(async (file) => {
      const blobRes = await fetch(repoUrl('/git/blobs'), {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ content: file.content, encoding: 'utf-8' }),
      });
      if (!blobRes.ok) throw new Error(`Failed to create blob for ${file.path}`);
      const blobData = await blobRes.json();
      return {
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha,
      };
    })
  );

  // 4. Create a new tree
  const treeRes = await fetch(repoUrl('/git/trees'), {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
  });
  if (!treeRes.ok) throw new Error(`Failed to create tree: ${treeRes.status}`);
  const treeData = await treeRes.json();

  // 5. Create a new commit
  const newCommitRes = await fetch(repoUrl('/git/commits'), {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      message,
      tree: treeData.sha,
      parents: [latestCommitSha],
    }),
  });
  if (!newCommitRes.ok) throw new Error(`Failed to create commit: ${newCommitRes.status}`);
  const newCommitData = await newCommitRes.json();

  // 6. Update the branch reference
  const updateRefRes = await fetch(repoUrl(`/git/refs/heads/${branch}`), {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify({ sha: newCommitData.sha }),
  });
  if (!updateRefRes.ok) throw new Error(`Failed to update ref: ${updateRefRes.status}`);

  return newCommitData.sha;
}

/**
 * Delete a file from the repo
 * @param {string} filePath
 * @param {string} sha - Current file SHA
 * @param {string} message
 */
export async function deleteFile(filePath, sha, message = '') {
  const { branch } = getGitHubSettings();
  const res = await fetch(repoUrl(`/contents/${encodeURIComponent(filePath)}`), {
    method: 'DELETE',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message || `Delete ${filePath.split('/').pop()}`,
      sha,
      branch,
    }),
  });
  if (!res.ok) throw new Error(`Failed to delete ${filePath}: ${res.status}`);
}

// ──────────────────────────────────────────────
//  Base64 helpers
// ──────────────────────────────────────────────

function encodeBase64(str) {
  // TextEncoder → Uint8Array → base64
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}

function decodeBase64(b64) {
  const binary = atob(b64.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}
