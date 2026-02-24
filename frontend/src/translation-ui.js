// Translation UI controller
import { translateToEnglish, saveTranslation, getTranslationHistory } from './translation-service.js';
import { config } from './research-config.js';

let isTranslating = false;
let currentTranslation = '';

/**
 * Initialize translation UI
 */
export function initTranslationUI() {
  const translateBtn = document.getElementById('translate-btn');
  const copyBtn = document.getElementById('copy-translation');
  const saveBtn = document.getElementById('save-translation');
  const inputTextarea = document.getElementById('translate-input');
  const outputDiv = document.getElementById('translate-output');

  // Check API key at translate time, not at init time
  // (user may set the key in Settings tab after init)

  // Translate button
  translateBtn.addEventListener('click', async () => {
    // Check API key before translating
    if (!config.llm.enabled) {
      outputDiv.textContent = 'Claude API 키가 설정되지 않았습니다.\n\n설정 탭에서 API 키를 입력해주세요.';
      return;
    }

    const koreanText = inputTextarea.value.trim();

    if (!koreanText) {
      alert('번역할 텍스트를 입력해주세요.');
      return;
    }

    if (isTranslating) {
      alert('이미 번역 중입니다.');
      return;
    }

    isTranslating = true;
    translateBtn.textContent = '번역 중...';
    translateBtn.disabled = true;
    outputDiv.textContent = '';
    currentTranslation = '';

    try {
      currentTranslation = await translateToEnglish(koreanText, (partialResult) => {
        outputDiv.textContent = partialResult;
        // Auto-scroll to bottom
        outputDiv.scrollTop = outputDiv.scrollHeight;
      });

      console.log('Translation completed:', currentTranslation.substring(0, 100) + '...');
    } catch (error) {
      console.error('Translation error:', error);
      outputDiv.textContent = `번역 오류: ${error.message}\n\nOllama가 실행 중인지 확인해주세요.`;
    } finally {
      isTranslating = false;
      translateBtn.textContent = '실시간 번역';
      translateBtn.disabled = false;
    }
  });

  // Copy button
  copyBtn.addEventListener('click', async () => {
    const text = outputDiv.textContent;

    if (!text || text.trim() === '') {
      alert('복사할 번역 결과가 없습니다.');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);

      // Visual feedback
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '복사됨!';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    } catch (error) {
      console.error('Copy error:', error);
      alert('클립보드 복사에 실패했습니다.');
    }
  });

  // Save button
  saveBtn.addEventListener('click', async () => {
    const koreanText = inputTextarea.value.trim();
    const englishText = outputDiv.textContent.trim();

    if (!koreanText || !englishText) {
      alert('저장할 번역 결과가 없습니다.');
      return;
    }

    try {
      const docId = await saveTranslation(koreanText, englishText);
      console.log('Translation saved:', docId);

      // Visual feedback
      const originalText = saveBtn.textContent;
      saveBtn.textContent = '저장됨!';
      setTimeout(() => {
        saveBtn.textContent = originalText;
      }, 2000);

      // Refresh history
      loadTranslationHistory();
    } catch (error) {
      console.error('Save error:', error);
      alert('저장에 실패했습니다: ' + error.message);
    }
  });

  // Load translation history
  loadTranslationHistory();
}

/**
 * Load and display translation history
 */
async function loadTranslationHistory() {
  const listDiv = document.getElementById('translation-list');

  try {
    const history = await getTranslationHistory(5);

    if (history.length === 0) {
      listDiv.innerHTML = '<p style="opacity: 0.5; text-align: center;">저장된 번역이 없습니다.</p>';
      return;
    }

    listDiv.innerHTML = history.map((item, index) => `
      <div class="translation-history-card" style="
        padding: 1rem;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        margin-bottom: 0.5rem;
        cursor: pointer;
      " onclick="loadHistoryItem(${index})">
        <div style="font-size: 0.8rem; opacity: 0.6; margin-bottom: 0.5rem;">
          ${new Date(item.timestamp).toLocaleString('ko-KR')}
        </div>
        <div style="font-size: 0.9rem; margin-bottom: 0.3rem; font-weight: 500;">
          ${item.textKo.substring(0, 50)}${item.textKo.length > 50 ? '...' : ''}
        </div>
        <div style="font-size: 0.85rem; opacity: 0.7;">
          ${item.textEn.substring(0, 60)}${item.textEn.length > 60 ? '...' : ''}
        </div>
      </div>
    `).join('');

    // Store history data for access
    window.translationHistory = history;
  } catch (error) {
    console.error('Error loading history:', error);
    listDiv.innerHTML = '<p style="opacity: 0.5; color: #ff6b6b;">히스토리 로드 실패</p>';
  }
}

/**
 * Load a history item into the input/output fields
 * @param {number} index - Index in the history array
 */
window.loadHistoryItem = function(index) {
  const history = window.translationHistory;
  if (!history || !history[index]) return;

  const item = history[index];
  document.getElementById('translate-input').value = item.textKo;
  document.getElementById('translate-output').textContent = item.textEn;
  currentTranslation = item.textEn;
};
