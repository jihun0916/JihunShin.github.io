// Settings UI Controller
import { config } from './research-config.js';

/**
 * Initialize Settings Tab
 */
export function initSettingsUI() {
  const urlInput = document.getElementById('ollama-url-input');
  const saveBtn = document.getElementById('save-ollama-url');
  const testBtn = document.getElementById('test-ollama-connection');
  const clearBtn = document.getElementById('clear-ollama-url');
  const statusDiv = document.getElementById('connection-status');

  // Load saved URL on init
  loadSavedURL();

  // Save URL
  saveBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();

    if (!url) {
      showStatus('error', 'URL을 입력해주세요.');
      return;
    }

    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      showStatus('error', 'URL은 http:// 또는 https://로 시작해야 합니다.');
      return;
    }

    // Save to localStorage
    localStorage.setItem('ollama_url', url);
    showStatus('success', `✅ URL 저장됨: ${url}`);

    console.log('Ollama URL saved:', url);
  });

  // Test connection
  testBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim() || config.ollama.baseUrl;

    showStatus('success', '🔄 연결 테스트 중...');

    try {
      const response = await fetch(`${url}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const modelCount = data.models?.length || 0;

      showStatus('success', `✅ 연결 성공! (${modelCount}개 모델 발견)`);

      // Show available models
      if (modelCount > 0) {
        const modelNames = data.models.map(m => m.name).join(', ');
        console.log('Available models:', modelNames);
      }
    } catch (error) {
      showStatus('error', `❌ 연결 실패: ${error.message}\n\nCORS 설정과 Ollama 실행 상태를 확인하세요.`);
      console.error('Connection test failed:', error);
    }
  });

  // Clear URL (reset to localhost)
  clearBtn.addEventListener('click', () => {
    if (confirm('Ollama URL을 localhost로 초기화하시겠습니까?')) {
      localStorage.removeItem('ollama_url');
      urlInput.value = 'http://localhost:11434';
      showStatus('success', '✅ URL이 localhost로 초기화되었습니다.');
      console.log('Ollama URL cleared');
    }
  });

  /**
   * Load saved URL from localStorage
   */
  function loadSavedURL() {
    const savedUrl = localStorage.getItem('ollama_url');
    if (savedUrl) {
      urlInput.value = savedUrl;
    } else {
      urlInput.value = 'http://localhost:11434';
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
