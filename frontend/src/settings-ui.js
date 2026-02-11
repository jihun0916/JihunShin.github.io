// Settings UI Controller - Claude API
import { config } from './research-config.js';
import { ollamaClient } from './llm-client.js';

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
      const available = await ollamaClient.isAvailable();

      if (available) {
        showStatus('success', `✅ Claude API 연결 성공! 모델: ${config.llm.defaultModel}`);
      } else {
        showStatus('error', '❌ 연결 실패: API 키를 확인해주세요.');
      }
    } catch (error) {
      showStatus('error', `❌ 연결 실패: ${error.message}`);
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
