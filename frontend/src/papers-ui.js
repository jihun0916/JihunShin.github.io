// Papers UI controller
import { subscribeToPapers, addPaper, updatePaper, deletePaper, searchPapers } from './papers-service.js';
import { fetchPaperAuto, fetchPaperByDOI } from './paper-autofill.js';
import { generateRelatedWork, saveRelatedWork } from './relatedwork-service.js';
import { ollamaClient } from './ollama-client.js';
import { config } from './research-config.js';
import { parseBibtex } from './bibtex-parser.js';

let allPapers = [];
let filteredPapers = [];
let currentCategory = 'all';
let currentKeywordFilter = '';
let currentSort = 'newest';
let unsubscribe = null;
let editingPaperId = null;
let selectedPaperIds = new Set();

/**
 * Initialize Papers UI
 */
export function initPapersUI() {
  const addBtn = document.getElementById('add-paper-btn');
  const addBibtexBtn = document.getElementById('add-bibtex-btn');
  const addMultiDOIBtn = document.getElementById('add-multi-doi-btn');
  const searchInput = document.getElementById('paper-search');
  const categorySelect = document.getElementById('category-filter');
  const keywordFilterInput = document.getElementById('keyword-filter');
  const sortSelect = document.getElementById('sort-papers');
  const smartSelectBtn = document.getElementById('smart-select-btn');
  const generateRWBtn = document.getElementById('generate-rw-btn');
  const bulkCategoryChange = document.getElementById('bulk-category-change');
  const bulkDeleteBtn = document.getElementById('bulk-delete-btn');

  // Add paper button
  addBtn.addEventListener('click', () => {
    editingPaperId = null;
    openPaperModal();
  });

  // Add BibTeX button
  addBibtexBtn.addEventListener('click', () => {
    openBibtexModal();
  });

  // Add Multi-DOI button
  addMultiDOIBtn.addEventListener('click', () => {
    openMultiDOIModal();
  });

  // Generate Related Work button
  generateRWBtn.addEventListener('click', () => {
    openRelatedWorkModal();
  });

  // Smart Select button
  smartSelectBtn.addEventListener('click', async () => {
    await smartSelectPapers();
  });

  // Search input
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim();
    applyFilters();
  });

  // Category filter
  categorySelect.addEventListener('change', (e) => {
    currentCategory = e.target.value;
    loadPapers();
  });

  // Keyword filter
  keywordFilterInput.addEventListener('input', (e) => {
    currentKeywordFilter = e.target.value.trim().toLowerCase();
    applyFilters();
  });

  // Sort select
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    applyFilters();
  });

  // Bulk category change
  bulkCategoryChange.addEventListener('change', async (e) => {
    const newCategory = e.target.value;
    if (newCategory && selectedPaperIds.size > 0) {
      await bulkChangeCategoryHandler(newCategory);
    }
    e.target.value = ''; // Reset dropdown
  });

  // Bulk delete
  bulkDeleteBtn.addEventListener('click', async () => {
    await bulkDeleteHandler();
  });

  // Initialize modal handlers
  initPaperModal();
  initBibtexModal();
  initMultiDOIModal();

  // Load papers with real-time updates
  loadPapers();
}

/**
 * Load papers with real-time subscription
 */
function loadPapers() {
  // Unsubscribe from previous listener
  if (unsubscribe) {
    unsubscribe();
  }

  // Subscribe to papers
  unsubscribe = subscribeToPapers((papers) => {
    allPapers = papers;
    applyFilters();
  }, currentCategory);
}

/**
 * Apply all filters (search, keyword)
 */
function applyFilters() {
  const searchInput = document.getElementById('paper-search');
  const searchTerm = searchInput ? searchInput.value.trim() : '';

  // Start with all papers
  let papers = allPapers;

  // Apply search filter (title, author)
  if (searchTerm) {
    papers = searchPapers(searchTerm, papers);
  }

  // Apply keyword filter
  if (currentKeywordFilter) {
    papers = papers.filter(paper => {
      // Check if any keyword contains the filter string
      return paper.keywords.some(kw =>
        kw.toLowerCase().includes(currentKeywordFilter)
      );
    });
  }

  // Apply sorting
  papers = sortPapers(papers, currentSort);

  filteredPapers = papers;
  renderPapers();
}

/**
 * Sort papers by selected criteria
 * @param {Array} papers - Papers to sort
 * @param {string} sortBy - Sort criteria
 * @returns {Array} - Sorted papers
 */
function sortPapers(papers, sortBy) {
  const sorted = [...papers];

  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => b.timestamp - a.timestamp);
    case 'oldest':
      return sorted.sort((a, b) => a.timestamp - b.timestamp);
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'year-desc':
      return sorted.sort((a, b) => b.year - a.year);
    case 'year-asc':
      return sorted.sort((a, b) => a.year - b.year);
    default:
      return sorted;
  }
}

/**
 * Render papers in grid
 */
function renderPapers() {
  const papersGrid = document.getElementById('papers-grid');

  if (filteredPapers.length === 0) {
    papersGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; opacity: 0.5;">
        <p>논문이 없습니다.</p>
        <p style="font-size: 0.9rem; margin-top: 0.5rem;">+ 버튼을 눌러 새 논문을 추가해보세요.</p>
      </div>
    `;
    return;
  }

  papersGrid.innerHTML = filteredPapers.map(paper => `
    <div class="paper-card" data-id="${paper.id}">
      <div class="paper-header">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <input type="checkbox" class="paper-checkbox" data-id="${paper.id}" ${selectedPaperIds.has(paper.id) ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
          <div class="paper-category" style="background-color: ${getCategoryColor(paper.category)};">
            ${getCategoryLabel(paper.category)}
          </div>
        </div>
        <div class="paper-year">${paper.year}</div>
      </div>

      <h3 class="paper-title">${escapeHtml(paper.title)}</h3>
      ${paper.titleKo ? `<p class="paper-title-ko">${escapeHtml(paper.titleKo)}</p>` : ''}

      <div class="paper-authors">
        ${paper.authors.map(author => `<span class="author-tag">${escapeHtml(author)}</span>`).join(' ')}
      </div>

      <div class="paper-venue">${escapeHtml(paper.venue)}</div>

      ${paper.abstract ? `
        <p class="paper-abstract">${escapeHtml(paper.abstract.substring(0, 150))}${paper.abstract.length > 150 ? '...' : ''}</p>
      ` : ''}

      ${paper.keywords.length > 0 ? `
        <div class="paper-keywords">
          ${paper.keywords.map(kw => `<span class="keyword-tag">${escapeHtml(kw)}</span>`).join(' ')}
        </div>
      ` : ''}

      ${paper.tags.length > 0 ? `
        <div class="paper-tags">
          ${paper.tags.map(tag => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join(' ')}
        </div>
      ` : ''}

      <div class="paper-actions">
        ${paper.pdfUrl ? `<a href="${escapeHtml(paper.pdfUrl)}" target="_blank" class="btn-icon" title="PDF 열기">📄</a>` : ''}
        <button class="btn-icon edit-paper-btn" data-id="${paper.id}" title="편집">✏️</button>
        <button class="btn-icon delete-paper-btn" data-id="${paper.id}" title="삭제">🗑️</button>
      </div>
    </div>
  `).join('');

  // Attach event listeners
  document.querySelectorAll('.paper-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const paperId = e.target.dataset.id;
      if (e.target.checked) {
        selectedPaperIds.add(paperId);
      } else {
        selectedPaperIds.delete(paperId);
      }
      updateGenerateButton();
      updateBulkActionsToolbar();
    });
  });

  document.querySelectorAll('.edit-paper-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const paperId = e.target.dataset.id;
      editPaper(paperId);
    });
  });

  document.querySelectorAll('.delete-paper-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const paperId = e.target.dataset.id;
      confirmDeletePaper(paperId);
    });
  });

  // Update generate button state
  updateGenerateButton();
}

/**
 * Get category color
 */
function getCategoryColor(category) {
  const colors = {
    'related': '#ff6b6b',
    'inspiration': '#4ecdc4',
    'reference': '#95e1d3',
    'other': '#cccccc'
  };
  return colors[category] || colors['other'];
}

/**
 * Get category label
 */
function getCategoryLabel(category) {
  const labels = {
    'related': 'Related Work',
    'inspiration': 'Inspiration',
    'reference': 'Reference',
    'other': 'Other'
  };
  return labels[category] || category;
}

/**
 * Initialize paper modal
 */
function initPaperModal() {
  const modal = document.getElementById('paper-modal');
  const closeBtn = modal.querySelector('.close-modal');
  const cancelBtn = document.getElementById('cancel-paper-btn');
  const saveBtn = document.getElementById('save-paper-btn');
  const form = document.getElementById('paper-form');
  const autofillBtn = document.getElementById('autofill-paper-btn');
  const autofillInput = document.getElementById('autofill-input');

  // Close modal
  closeBtn.addEventListener('click', closePaperModal);
  cancelBtn.addEventListener('click', closePaperModal);

  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closePaperModal();
    }
  });

  // Save paper
  saveBtn.addEventListener('click', async () => {
    await savePaper();
  });

  // Auto-fill button
  autofillBtn.addEventListener('click', async () => {
    const input = autofillInput.value.trim();

    if (!input) {
      alert('DOI 또는 제목을 입력해주세요.');
      autofillInput.focus();
      return;
    }

    try {
      // Update button state
      const originalText = autofillBtn.textContent;
      autofillBtn.textContent = '검색 중...';
      autofillBtn.disabled = true;

      // Fetch paper data
      const paperData = await fetchPaperAuto(input);

      // Fill form with fetched data
      fillFormWithPaperData(paperData);

      // Clear autofill input
      autofillInput.value = '';

      // Show success message
      alert(`논문 정보를 가져왔습니다: "${paperData.title}"`);
    } catch (error) {
      console.error('Autofill error:', error);
      alert(`검색 실패: ${error.message}`);
    } finally {
      autofillBtn.textContent = '자동 입력';
      autofillBtn.disabled = false;
    }
  });

  // Enter key in autofill input
  autofillInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      autofillBtn.click();
    }
  });

  // Enter to save (except in textarea)
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      savePaper();
    }
  });
}

/**
 * Open paper modal (add or edit)
 */
function openPaperModal(paper = null) {
  const modal = document.getElementById('paper-modal');
  const modalTitle = modal.querySelector('.modal-title');
  const form = document.getElementById('paper-form');

  if (paper) {
    // Edit mode
    modalTitle.textContent = '논문 편집';
    editingPaperId = paper.id;

    // Fill form
    document.getElementById('paper-title').value = paper.title || '';
    document.getElementById('paper-title-ko').value = paper.titleKo || '';
    document.getElementById('paper-authors').value = paper.authors.join(', ') || '';
    document.getElementById('paper-venue').value = paper.venue || '';
    document.getElementById('paper-year').value = paper.year || new Date().getFullYear();
    document.getElementById('paper-abstract').value = paper.abstract || '';
    document.getElementById('paper-keywords').value = paper.keywords.join(', ') || '';
    document.getElementById('paper-pdf-url').value = paper.pdfUrl || '';
    document.getElementById('paper-category-select').value = paper.category || 'reference';
    document.getElementById('paper-notes').value = paper.notes || '';
    document.getElementById('paper-tags').value = paper.tags.join(', ') || '';
    document.getElementById('paper-bibtex').value = paper.bibtex || '';
  } else {
    // Add mode
    modalTitle.textContent = '새 논문 추가';
    editingPaperId = null;
    form.reset();
    document.getElementById('paper-year').value = new Date().getFullYear();
    document.getElementById('paper-category-select').value = 'reference';
  }

  modal.style.display = 'flex';
  document.getElementById('paper-title').focus();
}

/**
 * Close paper modal
 */
function closePaperModal() {
  const modal = document.getElementById('paper-modal');
  modal.style.display = 'none';
  editingPaperId = null;
}

/**
 * Save paper (add or update)
 */
async function savePaper() {
  const saveBtn = document.getElementById('save-paper-btn');

  try {
    // Get form data
    const paperData = {
      title: document.getElementById('paper-title').value.trim(),
      titleKo: document.getElementById('paper-title-ko').value.trim(),
      authors: document.getElementById('paper-authors').value.split(',').map(a => a.trim()).filter(a => a),
      venue: document.getElementById('paper-venue').value.trim(),
      year: parseInt(document.getElementById('paper-year').value) || new Date().getFullYear(),
      abstract: document.getElementById('paper-abstract').value.trim(),
      keywords: document.getElementById('paper-keywords').value.split(',').map(k => k.trim()).filter(k => k),
      pdfUrl: document.getElementById('paper-pdf-url').value.trim(),
      category: document.getElementById('paper-category-select').value,
      notes: document.getElementById('paper-notes').value.trim(),
      tags: document.getElementById('paper-tags').value.split(',').map(t => t.trim()).filter(t => t),
      bibtex: document.getElementById('paper-bibtex').value.trim()
    };

    // Validation
    if (!paperData.title) {
      alert('논문 제목을 입력해주세요.');
      document.getElementById('paper-title').focus();
      return;
    }

    if (paperData.authors.length === 0) {
      alert('저자를 최소 1명 입력해주세요.');
      document.getElementById('paper-authors').focus();
      return;
    }

    // Disable button
    const originalText = saveBtn.textContent;
    saveBtn.textContent = '저장 중...';
    saveBtn.disabled = true;

    // Save to Firestore
    if (editingPaperId) {
      // Update existing paper
      await updatePaper(editingPaperId, paperData);
      console.log('Paper updated:', editingPaperId);
    } else {
      // Add new paper
      const docId = await addPaper(paperData);
      console.log('Paper added:', docId);
    }

    // Close modal
    closePaperModal();
  } catch (error) {
    console.error('Save error:', error);
    alert('저장에 실패했습니다: ' + error.message);
  } finally {
    saveBtn.textContent = '저장';
    saveBtn.disabled = false;
  }
}

/**
 * Edit paper
 */
function editPaper(paperId) {
  const paper = allPapers.find(p => p.id === paperId);
  if (!paper) {
    alert('논문을 찾을 수 없습니다.');
    return;
  }
  openPaperModal(paper);
}

/**
 * Confirm and delete paper
 */
function confirmDeletePaper(paperId) {
  const paper = allPapers.find(p => p.id === paperId);
  if (!paper) {
    alert('논문을 찾을 수 없습니다.');
    return;
  }

  const confirmed = confirm(`"${paper.title}" 논문을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`);
  if (!confirmed) return;

  deletePaper(paperId)
    .then(() => {
      console.log('Paper deleted:', paperId);
    })
    .catch((error) => {
      console.error('Delete error:', error);
      alert('삭제에 실패했습니다: ' + error.message);
    });
}

/**
 * Fill form with paper data (from autofill)
 * @param {Object} paperData - Paper data from API
 */
function fillFormWithPaperData(paperData) {
  document.getElementById('paper-title').value = paperData.title || '';
  document.getElementById('paper-title-ko').value = paperData.titleKo || '';
  document.getElementById('paper-authors').value = paperData.authors.join(', ') || '';
  document.getElementById('paper-venue').value = paperData.venue || '';
  document.getElementById('paper-year').value = paperData.year || new Date().getFullYear();
  document.getElementById('paper-abstract').value = paperData.abstract || '';
  document.getElementById('paper-keywords').value = paperData.keywords.join(', ') || '';
  document.getElementById('paper-pdf-url').value = paperData.pdfUrl || '';

  // Keep existing category selection (don't override)
  // document.getElementById('paper-category-select').value = paperData.category || 'reference';

  // Append to existing notes (preserve manual notes)
  const currentNotes = document.getElementById('paper-notes').value.trim();
  const newNotes = paperData.notes || '';
  if (newNotes && !currentNotes.includes(newNotes)) {
    document.getElementById('paper-notes').value = currentNotes
      ? `${currentNotes}\n\n${newNotes}`
      : newNotes;
  }

  document.getElementById('paper-tags').value = paperData.tags.join(', ') || '';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Update Related Work generation button state
 */
function updateGenerateButton() {
  const generateRWBtn = document.getElementById('generate-rw-btn');
  const count = selectedPaperIds.size;

  if (count === 0) {
    generateRWBtn.textContent = '선택한 논문으로 Related Work 생성';
    generateRWBtn.disabled = true;
  } else {
    generateRWBtn.textContent = `선택한 ${count}개 논문으로 Related Work 생성`;
    generateRWBtn.disabled = false;
  }
}

/**
 * Generate BibTeX entries from papers
 * @param {Array} papers - Array of paper objects
 * @returns {string} - BibTeX formatted text
 */
function generateBibtex(papers) {
  return papers.map(paper => {
    // Use existing bibtex if available
    if (paper.bibtex && paper.bibtex.trim()) {
      return paper.bibtex.trim();
    }

    // Otherwise generate from paper data
    const bibtexKey = generateBibtexKey(paper);
    const authors = paper.authors.join(' and ');

    return `@article{${bibtexKey},
  title={${paper.title}},
  author={${authors}},
  journal={${paper.venue}},
  year={${paper.year}}
}`;
  }).join('\n\n');
}

/**
 * Generate BibTeX key from paper data
 * @param {Object} paper - Paper object
 * @returns {string} - BibTeX key (e.g., "kim2025voronoi")
 */
function generateBibtexKey(paper) {
  // If bibtex exists, try to extract key
  if (paper.bibtex) {
    const match = paper.bibtex.match(/@\w+\{([^,]+),/);
    if (match) return match[1];
  }

  // Generate key: firstAuthorLastName + year + firstTitleWord
  const firstAuthor = paper.authors[0] || 'unknown';
  const lastName = firstAuthor.split(' ').pop().toLowerCase();
  const year = paper.year;
  const firstWord = paper.title.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '');

  return `${lastName}${year}${firstWord}`;
}

/**
 * Smart select papers using LLM
 */
async function smartSelectPapers() {
  if (filteredPapers.length === 0) {
    alert('선택할 논문이 없습니다.');
    return;
  }

  const userQuery = prompt('어떤 주제나 키워드와 관련된 논문을 선택할까요?\n\n예: "telepresence", "3D visualization", "remote collaboration"');

  if (!userQuery || userQuery.trim() === '') {
    return;
  }

  const smartSelectBtn = document.getElementById('smart-select-btn');
  const originalText = smartSelectBtn.textContent;

  try {
    smartSelectBtn.textContent = 'AI 선택 중...';
    smartSelectBtn.disabled = true;

    // Build paper summaries for LLM
    const paperSummaries = filteredPapers.map((paper, index) => {
      return `[${index}] ${paper.title}
Authors: ${paper.authors.join(', ')}
Venue: ${paper.venue} (${paper.year})
Keywords: ${paper.keywords.join(', ')}
${paper.abstract ? `Abstract: ${paper.abstract.substring(0, 200)}...` : ''}`;
    }).join('\n\n');

    const prompt = `You are an expert research assistant. Given a list of papers and a user's research topic, select the most relevant papers for writing a "Related Work" section.

User's research topic/keywords: "${userQuery}"

Papers to choose from:

${paperSummaries}

TASK: Select 3-8 most relevant papers that would be useful for writing a Related Work section about "${userQuery}".

CRITICAL REQUIREMENTS:
- Return ONLY the paper indices (numbers in brackets, e.g., [0], [1], [2])
- Return as a JSON array of integers, e.g., [0, 2, 5, 7]
- Select papers that are:
  1. Directly related to the topic
  2. Diverse in approach (not all the same method)
  3. Foundational or highly cited works
  4. Recent advances
- Minimum 3 papers, maximum 8 papers

Output ONLY the JSON array of indices, nothing else:`;

    const result = await ollamaClient.generate(prompt, config.ollama.models.keywords, {
      temperature: 0.3,
      top_p: 0.9
    });

    console.log('Smart select LLM response:', result);

    // Parse JSON array from result
    const jsonMatch = result.match(/\[[\d,\s]+\]/);
    if (!jsonMatch) {
      throw new Error('LLM이 올바른 형식의 응답을 반환하지 않았습니다.');
    }

    const selectedIndices = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(selectedIndices) || selectedIndices.length === 0) {
      throw new Error('선택된 논문이 없습니다.');
    }

    // Clear current selection
    selectedPaperIds.clear();

    // Select papers by index
    selectedIndices.forEach(index => {
      if (index >= 0 && index < filteredPapers.length) {
        selectedPaperIds.add(filteredPapers[index].id);
      }
    });

    // Re-render to show checkboxes
    renderPapers();

    alert(`AI가 ${selectedPaperIds.size}개의 관련 논문을 선택했습니다.`);
  } catch (error) {
    console.error('Smart select error:', error);
    alert(`스마트 선택 실패: ${error.message}\n\nOllama가 실행 중인지 확인해주세요.`);
  } finally {
    smartSelectBtn.textContent = originalText;
    smartSelectBtn.disabled = false;
  }
}

/**
 * Open Related Work generation modal
 */
async function openRelatedWorkModal() {
  if (selectedPaperIds.size === 0) {
    alert('논문을 선택해주세요.');
    return;
  }

  // No limit on number of papers

  const modal = document.getElementById('relatedwork-modal');
  const englishOutput = document.getElementById('relatedwork-output-en');
  const koreanOutput = document.getElementById('relatedwork-output-ko');
  const bibtexOutput = document.getElementById('relatedwork-output-bib');
  const introductionInput = document.getElementById('relatedwork-input-introduction');
  const resultsDiv = document.getElementById('relatedwork-results');
  const statusDiv = document.getElementById('relatedwork-status');
  const startGenerateBtn = document.getElementById('start-generate-btn');
  const saveBtn = document.getElementById('relatedwork-save-btn');
  const translateBtn = document.getElementById('relatedwork-translate-btn');
  const syncKoToEnBtn = document.getElementById('relatedwork-sync-ko-to-en-btn');
  const copyBibtexBtn = document.getElementById('copy-bibtex-btn');
  const closeBtn = modal.querySelector('.close-modal');

  // Get selected papers
  const selectedPapers = allPapers.filter(p => selectedPaperIds.has(p.id));

  // Show modal in "ready" state
  modal.style.display = 'flex';
  resultsDiv.style.display = 'none';
  englishOutput.value = '';
  koreanOutput.value = '';
  bibtexOutput.value = '';
  introductionInput.value = '';
  startGenerateBtn.disabled = false;

  let finalEnglishText = '';
  let finalKoreanText = '';
  let finalBibtexText = '';

  // Close handlers
  const closeModal = () => {
    modal.style.display = 'none';
  };
  closeBtn.onclick = closeModal;

  // Start Generate button handler
  startGenerateBtn.onclick = async () => {
    await startGeneration();
  };

  // Generate Related Work function
  async function startGeneration() {
    // Hide generate button, show results
    startGenerateBtn.disabled = true;
    resultsDiv.style.display = 'block';
    statusDiv.textContent = '생성 중...';
    statusDiv.style.color = '';
    saveBtn.disabled = true;
    translateBtn.disabled = true;
    syncKoToEnBtn.disabled = true;
    copyBibtexBtn.disabled = true;

    try {
      // Get introduction text (optional)
      const introduction = introductionInput.value.trim();

      finalEnglishText = await generateRelatedWork(selectedPapers, (partialResult) => {
        englishOutput.value = partialResult;
        englishOutput.scrollTop = englishOutput.scrollHeight;
      }, introduction);

      console.log('Related Work generated:', finalEnglishText.substring(0, 100) + '...');

      // Generate BibTeX file
      finalBibtexText = generateBibtex(selectedPapers);
      bibtexOutput.value = finalBibtexText;

      statusDiv.textContent = '생성 완료! 한글 번역을 원하면 "한글 번역" 버튼을 클릭하세요.';
      statusDiv.style.color = '#4caf50';
      saveBtn.disabled = false;
      translateBtn.disabled = false;
      syncKoToEnBtn.disabled = false;
      copyBibtexBtn.disabled = false;

      // Translate to Korean button
      translateBtn.onclick = async () => {
        await translateToKorean(finalEnglishText);
      };

      // Sync Korean changes to English button
      syncKoToEnBtn.onclick = async () => {
        await syncKoreanToEnglish();
      };

      // Copy BibTeX button
      copyBibtexBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(bibtexOutput.value);
          const originalText = copyBibtexBtn.textContent;
          copyBibtexBtn.textContent = '✓ 복사됨!';
          setTimeout(() => {
            copyBibtexBtn.textContent = originalText;
          }, 2000);
        } catch (error) {
          alert('복사 실패: ' + error.message);
        }
      };

      // Save button handler
      saveBtn.onclick = async () => {
        try {
          const title = `Related Work (${new Date().toLocaleDateString('ko-KR')})`;
          const paperIds = Array.from(selectedPaperIds);
          const textToSave = englishOutput.value; // Always save English version
          const docId = await saveRelatedWork(title, textToSave, paperIds);

          console.log('Related Work saved:', docId);
          alert('Related Work가 저장되었습니다!');

          // Clear selection
          selectedPaperIds.clear();
          renderPapers();
          closeModal();
        } catch (error) {
          console.error('Save error:', error);
          alert('저장에 실패했습니다: ' + error.message);
        }
      };
    } catch (error) {
      console.error('Generation error:', error);
      englishOutput.value = `생성 오류: ${error.message}\n\nOllama가 실행 중인지 확인해주세요.`;
      statusDiv.textContent = '생성 실패';
      statusDiv.style.color = '#f44336';
      startGenerateBtn.disabled = false; // Re-enable button on error
    }
  }

  // Helper function: Translate English to Korean
  async function translateToKorean(englishText) {
    const translateBtn = document.getElementById('relatedwork-translate-btn');
    const originalText = translateBtn.textContent;

    try {
      translateBtn.textContent = '번역 중...';
      translateBtn.disabled = true;
      statusDiv.textContent = '한글 번역 중...';
      statusDiv.style.color = '';

      const prompt = `Translate the following academic English text into natural Korean. Maintain the formal academic tone and technical terminology.

English text:
${englishText}

Korean translation:`;

      finalKoreanText = await ollamaClient.generate(prompt, config.ollama.models.translation, {
        temperature: 0.3,
        top_p: 0.9
      });

      koreanOutput.value = finalKoreanText;
      statusDiv.textContent = '한글 번역 완료! 한글을 수정하고 "영문 동기화" 버튼을 누르면 영문이 업데이트됩니다.';
      statusDiv.style.color = '#4caf50';
    } catch (error) {
      console.error('Translation error:', error);
      alert(`번역 실패: ${error.message}`);
      statusDiv.textContent = '번역 실패';
      statusDiv.style.color = '#f44336';
    } finally {
      translateBtn.textContent = originalText;
      translateBtn.disabled = false;
    }
  }

  // Helper function: Sync Korean edits back to English
  async function syncKoreanToEnglish() {
    const syncBtn = document.getElementById('relatedwork-sync-ko-to-en-btn');
    const originalText = syncBtn.textContent;

    const currentKorean = koreanOutput.value.trim();
    if (!currentKorean) {
      alert('한글 텍스트를 먼저 입력 또는 번역해주세요.');
      return;
    }

    try {
      syncBtn.textContent = '동기화 중...';
      syncBtn.disabled = true;
      statusDiv.textContent = '한글 수정사항을 영문에 반영 중...';
      statusDiv.style.color = '';

      const prompt = `You are a professional academic translator specializing in computer science research papers. Translate the following Korean text into formal, precise English suitable for top-tier academic publications (ACM, IEEE).

CRITICAL REQUIREMENTS:
- Use EXTREMELY FORMAL and OBJECTIVE academic tone
- Employ technical terminology with absolute precision
- Adopt PASSIVE VOICE where appropriate (e.g., "is proposed", "is demonstrated")
- Use formal academic phrases (e.g., "In this work,", "We present", "It is shown that")
- Avoid colloquialisms, contractions, and informal expressions
- Maintain scholarly distance and objectivity
- Use precise, technical vocabulary over common words
- Follow standard academic paper structure and phrasing

Korean text:
${currentKorean}

Formal academic English translation:`;

      const updatedEnglish = await ollamaClient.generate(prompt, config.ollama.models.translation, {
        temperature: 0.3,
        top_p: 0.9
      });

      englishOutput.value = updatedEnglish;
      finalEnglishText = updatedEnglish;

      statusDiv.textContent = '영문 동기화 완료!';
      statusDiv.style.color = '#4caf50';
    } catch (error) {
      console.error('Sync error:', error);
      alert(`동기화 실패: ${error.message}`);
      statusDiv.textContent = '동기화 실패';
      statusDiv.style.color = '#f44336';
    } finally {
      syncBtn.textContent = originalText;
      syncBtn.disabled = false;
    }
  }
}

/**
 * Update bulk actions toolbar visibility and count
 */
function updateBulkActionsToolbar() {
  const toolbar = document.getElementById('bulk-actions-toolbar');
  const countText = document.getElementById('selected-count-text');

  if (selectedPaperIds.size > 0) {
    toolbar.style.display = 'flex';
    countText.textContent = `${selectedPaperIds.size}개 선택됨`;
  } else {
    toolbar.style.display = 'none';
  }
}

/**
 * Bulk change category handler
 * @param {string} newCategory - New category
 */
async function bulkChangeCategoryHandler(newCategory) {
  if (!confirm(`선택한 ${selectedPaperIds.size}개의 논문을 "${getCategoryLabel(newCategory)}"로 변경하시겠습니까?`)) {
    return;
  }

  try {
    const selectedPapers = allPapers.filter(p => selectedPaperIds.has(p.id));

    for (const paper of selectedPapers) {
      await updatePaper(paper.id, { ...paper, category: newCategory });
    }

    alert(`${selectedPaperIds.size}개 논문의 카테고리가 변경되었습니다.`);

    // Clear selection
    selectedPaperIds.clear();
    updateBulkActionsToolbar();
    updateGenerateButton();
  } catch (error) {
    console.error('Bulk category change error:', error);
    alert(`카테고리 변경 실패: ${error.message}`);
  }
}

/**
 * Bulk delete handler
 */
async function bulkDeleteHandler() {
  if (!confirm(`선택한 ${selectedPaperIds.size}개의 논문을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
    return;
  }

  try {
    const idsToDelete = Array.from(selectedPaperIds);

    for (const id of idsToDelete) {
      await deletePaper(id);
    }

    alert(`${idsToDelete.length}개 논문이 삭제되었습니다.`);

    // Clear selection
    selectedPaperIds.clear();
    updateBulkActionsToolbar();
    updateGenerateButton();
  } catch (error) {
    console.error('Bulk delete error:', error);
    alert(`삭제 실패: ${error.message}`);
  }
}

/**
 * Initialize BibTeX modal
 */
function initBibtexModal() {
  const modal = document.getElementById('bibtex-modal');
  const closeBtn = modal.querySelector('.close-modal');
  const cancelBtn = document.getElementById('cancel-bibtex-btn');
  const parseBtn = document.getElementById('parse-bibtex-btn');

  const closeModal = () => {
    modal.style.display = 'none';
    document.getElementById('bibtex-input').value = '';
    document.getElementById('bibtex-status').style.display = 'none';
  };

  closeBtn.onclick = closeModal;
  cancelBtn.onclick = closeModal;

  parseBtn.onclick = async () => {
    await parseBibtexHandler();
  };
}

/**
 * Open BibTeX modal
 */
function openBibtexModal() {
  const modal = document.getElementById('bibtex-modal');
  modal.style.display = 'flex';
}

/**
 * Parse BibTeX handler
 */
async function parseBibtexHandler() {
  const bibtexInput = document.getElementById('bibtex-input');
  const categorySelect = document.getElementById('bibtex-category');
  const statusDiv = document.getElementById('bibtex-status');
  const parseBtn = document.getElementById('parse-bibtex-btn');

  const bibtexText = bibtexInput.value.trim();
  const category = categorySelect.value;

  if (!bibtexText) {
    alert('BibTeX 텍스트를 입력해주세요.');
    return;
  }

  parseBtn.disabled = true;
  parseBtn.textContent = '파싱 중...';
  statusDiv.style.display = 'block';
  statusDiv.style.background = 'rgba(102, 126, 234, 0.1)';
  statusDiv.style.color = '#667eea';
  statusDiv.innerHTML = '<p>BibTeX 파싱 중...</p>';

  try {
    const papers = parseBibtex(bibtexText);

    statusDiv.innerHTML = `<p>✓ ${papers.length}개의 논문을 파싱했습니다. 추가 중...</p>`;

    let addedCount = 0;
    for (const paper of papers) {
      try {
        await addPaper({ ...paper, category });
        addedCount++;
      } catch (error) {
        console.error('Failed to add paper:', paper.title, error);
      }
    }

    statusDiv.style.background = 'rgba(76, 175, 80, 0.1)';
    statusDiv.style.color = '#4caf50';
    statusDiv.innerHTML = `<p>✓ ${addedCount}개의 논문이 추가되었습니다!</p>`;

    setTimeout(() => {
      document.getElementById('bibtex-modal').style.display = 'none';
      bibtexInput.value = '';
      statusDiv.style.display = 'none';
    }, 2000);
  } catch (error) {
    console.error('BibTeX parse error:', error);
    statusDiv.style.background = 'rgba(244, 67, 54, 0.1)';
    statusDiv.style.color = '#f44336';
    statusDiv.innerHTML = `<p>✗ 파싱 실패: ${error.message}</p>`;
  } finally {
    parseBtn.disabled = false;
    parseBtn.textContent = '파싱 및 추가';
  }
}

/**
 * Initialize Multi-DOI modal
 */
function initMultiDOIModal() {
  const modal = document.getElementById('multi-doi-modal');
  const closeBtn = modal.querySelector('.close-modal');
  const cancelBtn = document.getElementById('cancel-multi-doi-btn');
  const fetchBtn = document.getElementById('fetch-multi-doi-btn');

  const closeModal = () => {
    modal.style.display = 'none';
    document.getElementById('multi-doi-input').value = '';
    document.getElementById('multi-doi-status').style.display = 'none';
  };

  closeBtn.onclick = closeModal;
  cancelBtn.onclick = closeModal;

  fetchBtn.onclick = async () => {
    await fetchMultiDOIHandler();
  };
}

/**
 * Open Multi-DOI modal
 */
function openMultiDOIModal() {
  const modal = document.getElementById('multi-doi-modal');
  modal.style.display = 'flex';
}

/**
 * Fetch Multi-DOI handler
 */
async function fetchMultiDOIHandler() {
  const doiInput = document.getElementById('multi-doi-input');
  const categorySelect = document.getElementById('multi-doi-category');
  const statusDiv = document.getElementById('multi-doi-status');
  const fetchBtn = document.getElementById('fetch-multi-doi-btn');

  const doiText = doiInput.value.trim();
  const category = categorySelect.value;

  if (!doiText) {
    alert('DOI를 입력해주세요.');
    return;
  }

  // Split by newline and filter empty lines
  const dois = doiText.split('\n').map(line => line.trim()).filter(line => line);

  if (dois.length === 0) {
    alert('유효한 DOI를 입력해주세요.');
    return;
  }

  fetchBtn.disabled = true;
  fetchBtn.textContent = '가져오는 중...';
  statusDiv.style.display = 'block';
  statusDiv.style.background = 'rgba(102, 126, 234, 0.1)';
  statusDiv.style.color = '#667eea';
  statusDiv.innerHTML = `<p>${dois.length}개의 DOI를 가져오는 중...</p>`;

  let addedCount = 0;
  let failedCount = 0;
  const errors = [];

  for (let i = 0; i < dois.length; i++) {
    const doi = dois[i];

    statusDiv.innerHTML = `<p>진행 중: ${i + 1}/${dois.length} - ${doi}</p>`;

    try {
      const paperData = await fetchPaperByDOI(doi);
      await addPaper({ ...paperData, category });
      addedCount++;
    } catch (error) {
      console.error('Failed to fetch DOI:', doi, error);
      failedCount++;
      errors.push(`${doi}: ${error.message}`);
    }

    // Small delay to avoid rate limiting
    if (i < dois.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  if (failedCount === 0) {
    statusDiv.style.background = 'rgba(76, 175, 80, 0.1)';
    statusDiv.style.color = '#4caf50';
    statusDiv.innerHTML = `<p>✓ ${addedCount}개의 논문이 추가되었습니다!</p>`;
  } else {
    statusDiv.style.background = 'rgba(255, 152, 0, 0.1)';
    statusDiv.style.color = '#ff9800';
    statusDiv.innerHTML = `<p>✓ ${addedCount}개 성공, ✗ ${failedCount}개 실패</p><details><summary>실패 목록</summary><pre style="font-size: 0.8rem; margin-top: 0.5rem;">${errors.join('\n')}</pre></details>`;
  }

  fetchBtn.disabled = false;
  fetchBtn.textContent = '가져오기';

  if (failedCount === 0) {
    setTimeout(() => {
      document.getElementById('multi-doi-modal').style.display = 'none';
      doiInput.value = '';
      statusDiv.style.display = 'none';
    }, 2000);
  }
}

/**
 * Cleanup function
 */
export function cleanupPapersUI() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
