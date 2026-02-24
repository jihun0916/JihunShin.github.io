// Settings UI Controller - Claude API + GitHub Obsidian Sync
import { config } from './research-config.js';
import { ollamaClient } from './llm-client.js';
import { saveGitHubSettings, clearGitHubSettings, testConnection as testGitHub } from './github-service.js';

/**
 * Initialize Settings Tab
 */
export function initSettingsUI() {
  const apiKeyInput = document.getElementById('claude-api-key-input');
  const saveBtn = document.getElementById('save-api-key');
  const testBtn = document.getElementById('test-api-connection');
  const clearBtn = document.getElementById('clear-api-key');
  const statusDiv = document.getElementById('connection-status');
  const modelSelect = document.getElementById('claude-model-select');

  // Load saved settings on init
  loadSavedSettings();

  // Save API Key
  saveBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showStatus('error', 'API 키를 입력해주세요.');
      return;
    }

    if (!apiKey.startsWith('sk-ant-')) {
      showStatus('error', 'Anthropic API 키는 sk-ant-로 시작합니다. 키를 확인해주세요.');
      return;
    }

    // Save to localStorage
    localStorage.setItem('claude_api_key', apiKey);
    showStatus('success', `✅ API 키 저장됨 (${apiKey.substring(0, 12)}...)`);

    console.log('Claude API key saved');
  });

  // Save model selection
  if (modelSelect) {
    modelSelect.addEventListener('change', () => {
      const model = modelSelect.value;
      localStorage.setItem('claude_model', model);
      showStatus('success', `✅ 모델 변경됨: ${model}`);
    });
  }

  // Test connection
  testBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim() || localStorage.getItem('claude_api_key');

    if (!apiKey) {
      showStatus('error', '❌ API 키를 먼저 입력해주세요.');
      return;
    }

    // Temporarily save for testing
    localStorage.setItem('claude_api_key', apiKey);
    showStatus('success', '🔄 Claude API 연결 테스트 중...');

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: config.llm.defaultModel,
          max_tokens: 20,
          messages: [{ role: 'user', content: 'Say "connected" in one word.' }]
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.content?.[0]?.text || '';
        showStatus('success', `✅ Claude API 연결 성공! 모델: ${config.llm.defaultModel}\n응답: ${reply}`);
      } else {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || `HTTP ${response.status}`;
        const errType = errData.error?.type || '';
        showStatus('error', `❌ 연결 실패 (${response.status}): ${errMsg}${errType ? ' [' + errType + ']' : ''}`);
      }
    } catch (error) {
      showStatus('error', `❌ 연결 실패: ${error.message}\n\n네트워크 오류이거나 CORS 문제일 수 있습니다.`);
      console.error('Connection test failed:', error);
    }
  });

  // Clear API key
  clearBtn.addEventListener('click', () => {
    if (confirm('Claude API 키를 삭제하시겠습니까?')) {
      localStorage.removeItem('claude_api_key');
      localStorage.removeItem('claude_model');
      apiKeyInput.value = '';
      showStatus('success', '✅ API 키가 삭제되었습니다.');
      console.log('Claude API key cleared');
    }
  });

  // ── GitHub / Obsidian Settings ──
  initGitHubSettings();

  /**
   * Load saved settings from localStorage
   */
  function loadSavedSettings() {
    const savedKey = localStorage.getItem('claude_api_key');
    if (savedKey && apiKeyInput) {
      apiKeyInput.value = savedKey;
    }

    const savedModel = localStorage.getItem('claude_model');
    if (savedModel && modelSelect) {
      modelSelect.value = savedModel;
    }
  }

  /**
   * Show connection status message
   */
  function showStatus(type, message) {
    statusDiv.className = `connection-status ${type}`;
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
  }
}

// ──────────────────────────────────────────────
//  GitHub / Obsidian Vault Settings
// ──────────────────────────────────────────────

function initGitHubSettings() {
  const tokenInput = document.getElementById('github-token-input');
  const ownerInput = document.getElementById('github-owner-input');
  const repoInput = document.getElementById('github-repo-input');
  const branchInput = document.getElementById('github-branch-input');
  const pathInput = document.getElementById('github-vault-path-input');
  const saveBtn = document.getElementById('save-github-settings');
  const testBtn = document.getElementById('test-github-connection');
  const clearBtn = document.getElementById('clear-github-settings');
  const statusDiv = document.getElementById('github-connection-status');

  if (!saveBtn) return; // Settings HTML not present

  // Load saved values
  loadGitHubSaved();

  saveBtn.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    const owner = ownerInput.value.trim();
    const repo = repoInput.value.trim();

    if (!token || !owner || !repo) {
      showGHStatus('error', 'Token, Owner, Repo는 필수입니다.');
      return;
    }

    saveGitHubSettings({
      token,
      owner,
      repo,
      branch: branchInput.value.trim() || 'main',
      path: pathInput.value.trim() || 'papers',
    });

    showGHStatus('success', '✅ GitHub 설정 저장됨');
  });

  testBtn.addEventListener('click', async () => {
    showGHStatus('success', '🔄 GitHub 연결 테스트 중...');
    // Save first so testConnection picks up latest values
    saveBtn.click();
    const result = await testGitHub();
    showGHStatus(result.ok ? 'success' : 'error', result.ok ? `✅ ${result.message}` : `❌ ${result.message}`);
  });

  clearBtn.addEventListener('click', () => {
    if (confirm('GitHub 연동 설정을 삭제하시겠습니까?')) {
      clearGitHubSettings();
      tokenInput.value = '';
      ownerInput.value = '';
      repoInput.value = '';
      branchInput.value = 'main';
      pathInput.value = 'papers';
      showGHStatus('success', '✅ GitHub 설정이 삭제되었습니다.');
    }
  });

  function loadGitHubSaved() {
    tokenInput.value = localStorage.getItem('github_token') || '';
    ownerInput.value = localStorage.getItem('github_owner') || '';
    repoInput.value = localStorage.getItem('github_repo') || '';
    branchInput.value = localStorage.getItem('github_branch') || 'main';
    pathInput.value = localStorage.getItem('github_vault_path') || 'papers';
  }

  function showGHStatus(type, message) {
    statusDiv.className = `connection-status ${type}`;
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
  }
}
