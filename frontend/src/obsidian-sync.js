// Obsidian ↔ Firestore sync service
// GitHub repo is the "source of truth", Firestore is cache/index for fast queries
import { isGitHubConfigured, listVaultFiles, readFiles, writeFilesCommit } from './github-service.js';
import { paperToMarkdown, parsePaperMarkdown, paperToFilename } from './obsidian-utils.js';
import { addPaper, getPapers, updatePaper, deletePaper } from './papers-service.js';

/**
 * Sync state stored in localStorage
 * Tracks which files have been synced and their SHAs
 */
function getSyncState() {
  try {
    return JSON.parse(localStorage.getItem('obsidian_sync_state') || '{}');
  } catch {
    return {};
  }
}

function saveSyncState(state) {
  localStorage.setItem('obsidian_sync_state', JSON.stringify(state));
}

/**
 * Full sync: Pull from GitHub → merge with Firestore → push back
 * @param {Function} onProgress - progress callback (message, percent)
 * @returns {Promise<{ pulled: number, pushed: number, conflicts: number, errors: string[] }>}
 */
export async function fullSync(onProgress = () => {}) {
  if (!isGitHubConfigured()) {
    throw new Error('GitHub 설정이 완료되지 않았습니다. Settings 탭에서 설정하세요.');
  }

  const result = { pulled: 0, pushed: 0, conflicts: 0, errors: [] };

  try {
    // ── Step 1: Get current Firestore papers ──
    onProgress('Firestore에서 논문 목록 가져오는 중...', 10);
    const firestorePapers = await getPapers('all');
    const firestoreMap = new Map(); // firestoreId → paper
    firestorePapers.forEach(p => firestoreMap.set(p.id, p));

    // ── Step 2: List GitHub vault files ──
    onProgress('GitHub에서 파일 목록 가져오는 중...', 20);
    const vaultFiles = await listVaultFiles();

    // ── Step 3: Read all markdown files from GitHub ──
    onProgress(`GitHub에서 ${vaultFiles.length}개 파일 읽는 중...`, 30);
    const fileContents = await readFiles(vaultFiles.map(f => f.path));

    // ── Step 4: Parse markdown → paper data ──
    onProgress('마크다운 파싱 중...', 50);
    const ghPapers = []; // { parsed, filePath, sha }
    for (const file of fileContents) {
      try {
        const parsed = parsePaperMarkdown(file.content);
        ghPapers.push({ parsed, filePath: file.path, sha: file.sha });
      } catch (err) {
        result.errors.push(`파싱 실패: ${file.path} - ${err.message}`);
      }
    }

    // ── Step 5: Pull — GitHub → Firestore ──
    onProgress('GitHub → Firestore 동기화 중...', 60);
    const ghByFirestoreId = new Map();
    const ghByTitle = new Map();
    ghPapers.forEach(g => {
      const fid = g.parsed.meta.firestoreId;
      if (fid) ghByFirestoreId.set(fid, g);
      ghByTitle.set(normalizeTitle(g.parsed.meta.title), g);
    });

    // Papers in GitHub but not in Firestore → add to Firestore
    for (const ghp of ghPapers) {
      const fid = ghp.parsed.meta.firestoreId;

      if (fid && firestoreMap.has(fid)) {
        // Exists in both → update Firestore with GitHub data (GitHub is primary)
        try {
          await updatePaper(fid, {
            ...ghp.parsed.meta,
            firestoreId: undefined, // don't store this redundantly
          });
          result.pulled++;
        } catch (err) {
          result.errors.push(`업데이트 실패 (${ghp.parsed.meta.title}): ${err.message}`);
        }
      } else if (!fid) {
        // No firestoreId → check by title match
        const normTitle = normalizeTitle(ghp.parsed.meta.title);
        const matchedPaper = firestorePapers.find(p => normalizeTitle(p.title) === normTitle);

        if (matchedPaper) {
          // Title match found → update and link
          try {
            await updatePaper(matchedPaper.id, ghp.parsed.meta);
            result.pulled++;
          } catch (err) {
            result.errors.push(`업데이트 실패 (${ghp.parsed.meta.title}): ${err.message}`);
          }
        } else {
          // Brand new paper from Obsidian → add to Firestore
          try {
            await addPaper(ghp.parsed.meta);
            result.pulled++;
          } catch (err) {
            result.errors.push(`추가 실패 (${ghp.parsed.meta.title}): ${err.message}`);
          }
        }
      }
    }

    // ── Step 6: Push — Firestore → GitHub ──
    onProgress('Firestore → GitHub 동기화 중...', 75);
    const filesToWrite = [];
    const freshPapers = await getPapers('all'); // re-fetch with updated IDs

    for (const paper of freshPapers) {
      const normTitle = normalizeTitle(paper.title);
      const existsInGH = ghByFirestoreId.has(paper.id) || ghByTitle.has(normTitle);

      // Generate markdown for every Firestore paper (overwrite or create)
      const filename = paperToFilename(paper);
      const vaultPath = getVaultPrefix() + filename;
      const md = paperToMarkdown(paper, freshPapers);

      // Check if content actually changed
      const existingFile = fileContents.find(f => f.path === vaultPath);
      if (existingFile && existingFile.content.trim() === md.trim()) {
        continue; // No changes needed
      }

      filesToWrite.push({ path: vaultPath, content: md });
      if (!existsInGH) result.pushed++;
    }

    // Write all changed files in a single commit
    if (filesToWrite.length > 0) {
      onProgress(`GitHub에 ${filesToWrite.length}개 파일 쓰는 중...`, 90);
      try {
        await writeFilesCommit(filesToWrite, `Sync ${filesToWrite.length} papers from web app`);
        result.pushed = filesToWrite.length;
      } catch (err) {
        result.errors.push(`GitHub 쓰기 실패: ${err.message}`);
      }
    }

    // ── Step 7: Save sync state ──
    const syncState = {
      lastSync: Date.now(),
      paperCount: freshPapers.length,
      fileCount: vaultFiles.length + filesToWrite.filter(f => !fileContents.find(e => e.path === f.path)).length,
    };
    saveSyncState(syncState);

    onProgress('동기화 완료!', 100);

  } catch (err) {
    result.errors.push(`동기화 오류: ${err.message}`);
    onProgress(`오류: ${err.message}`, -1);
  }

  return result;
}

/**
 * Push a single paper to GitHub (called when paper is added/updated in web UI)
 * @param {Object} paper - Paper object with id
 * @param {Array} allPapers - All papers for relation resolution
 */
export async function pushPaperToGitHub(paper, allPapers = []) {
  if (!isGitHubConfigured()) return;

  const filename = paperToFilename(paper);
  const vaultPath = getVaultPrefix() + filename;
  const md = paperToMarkdown(paper, allPapers);

  try {
    await writeFilesCommit(
      [{ path: vaultPath, content: md }],
      `Update: ${paper.title}`
    );
    console.log(`[Obsidian Sync] Pushed: ${filename}`);
  } catch (err) {
    console.error(`[Obsidian Sync] Push failed for ${filename}:`, err);
  }
}

/**
 * Pull only — read GitHub vault and update Firestore without pushing back
 * Useful for initial import from Obsidian
 * @param {Function} onProgress
 * @returns {Promise<{ imported: number, updated: number, errors: string[] }>}
 */
export async function pullFromGitHub(onProgress = () => {}) {
  if (!isGitHubConfigured()) {
    throw new Error('GitHub 설정이 완료되지 않았습니다.');
  }

  const result = { imported: 0, updated: 0, errors: [] };

  onProgress('GitHub에서 파일 읽는 중...', 20);
  const vaultFiles = await listVaultFiles();
  const fileContents = await readFiles(vaultFiles.map(f => f.path));

  onProgress('Firestore와 비교 중...', 50);
  const firestorePapers = await getPapers('all');
  const titleMap = new Map();
  firestorePapers.forEach(p => titleMap.set(normalizeTitle(p.title), p));

  for (const file of fileContents) {
    try {
      const { meta } = parsePaperMarkdown(file.content);
      const normTitle = normalizeTitle(meta.title);
      const existing = titleMap.get(normTitle);

      if (existing) {
        await updatePaper(existing.id, meta);
        result.updated++;
      } else {
        await addPaper(meta);
        result.imported++;
      }
    } catch (err) {
      result.errors.push(`${file.path}: ${err.message}`);
    }
  }

  onProgress('Pull 완료!', 100);
  return result;
}

/**
 * Get last sync info
 */
export function getLastSyncInfo() {
  const state = getSyncState();
  if (!state.lastSync) return null;
  return {
    lastSync: new Date(state.lastSync),
    paperCount: state.paperCount || 0,
    fileCount: state.fileCount || 0,
  };
}

// ── Helpers ──

function normalizeTitle(title) {
  return (title || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function getVaultPrefix() {
  const path = localStorage.getItem('github_vault_path') || 'papers';
  return path ? `${path}/` : '';
}
