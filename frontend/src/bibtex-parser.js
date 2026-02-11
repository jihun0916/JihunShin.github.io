// BibTeX Parser
/**
 * Parse BibTeX entries into paper objects
 * @param {string} bibtexText - BibTeX formatted text (can contain multiple entries)
 * @returns {Array<Object>} - Array of parsed paper objects
 */
export function parseBibtex(bibtexText) {
  if (!bibtexText || bibtexText.trim() === '') {
    throw new Error('BibTeX 텍스트를 입력해주세요.');
  }

  // Split by @ symbol to get individual entries
  const entries = bibtexText.split(/@/).filter(e => e.trim());

  const papers = [];

  for (const entry of entries) {
    try {
      const paper = parseSingleBibtexEntry('@' + entry);
      if (paper) {
        papers.push(paper);
      }
    } catch (error) {
      console.warn('Failed to parse entry:', error);
      // Continue parsing other entries
    }
  }

  if (papers.length === 0) {
    throw new Error('유효한 BibTeX 항목을 찾을 수 없습니다.');
  }

  return papers;
}

/**
 * Parse a single BibTeX entry
 * @param {string} bibtexEntry - Single BibTeX entry
 * @returns {Object|null} - Parsed paper object or null if invalid
 */
function parseSingleBibtexEntry(bibtexEntry) {
  // Extract entry type and key
  const typeMatch = bibtexEntry.match(/@(\w+)\s*\{\s*([^,]+)/);
  if (!typeMatch) {
    return null;
  }

  const entryType = typeMatch[1].toLowerCase();
  const bibtexKey = typeMatch[2].trim();

  // Extract all fields using regex
  const fields = {};

  // Match field = {value} or field = "value"
  const fieldRegex = /(\w+)\s*=\s*(?:\{([^}]*)\}|"([^"]*)")/g;
  let match;

  while ((match = fieldRegex.exec(bibtexEntry)) !== null) {
    const fieldName = match[1].toLowerCase();
    const fieldValue = match[2] || match[3] || '';
    fields[fieldName] = fieldValue.trim();
  }

  // Build paper object
  const paper = {
    title: cleanBibtexString(fields.title || ''),
    titleKo: '',
    authors: parseAuthors(fields.author || ''),
    venue: cleanBibtexString(fields.journal || fields.booktitle || fields.venue || ''),
    year: parseInt(fields.year) || new Date().getFullYear(),
    abstract: cleanBibtexString(fields.abstract || ''),
    keywords: parseKeywords(fields.keywords || ''),
    pdfUrl: fields.url || fields.doi ? `https://doi.org/${fields.doi}` : '',
    notes: '',
    tags: [],
    bibtex: bibtexEntry.trim(),
    _raw: {
      bibtexKey,
      entryType,
      doi: fields.doi || ''
    }
  };

  // Validation
  if (!paper.title) {
    throw new Error('제목이 없는 BibTeX 항목입니다.');
  }

  return paper;
}

/**
 * Parse author string from BibTeX
 * @param {string} authorString - Author field from BibTeX (e.g., "Author One and Author Two")
 * @returns {Array<string>} - Array of author names
 */
function parseAuthors(authorString) {
  if (!authorString) return [];

  // Split by " and "
  const authors = authorString.split(/\s+and\s+/i);

  return authors.map(author => {
    // Clean up author name
    return author.trim().replace(/[{}]/g, '');
  }).filter(a => a);
}

/**
 * Parse keywords from BibTeX
 * @param {string} keywordsString - Keywords field (comma or semicolon separated)
 * @returns {Array<string>} - Array of keywords
 */
function parseKeywords(keywordsString) {
  if (!keywordsString) return [];

  // Split by comma or semicolon
  return keywordsString
    .split(/[,;]/)
    .map(kw => kw.trim())
    .filter(kw => kw);
}

/**
 * Clean BibTeX string (remove LaTeX commands and braces)
 * @param {string} str - String from BibTeX field
 * @returns {string} - Cleaned string
 */
function cleanBibtexString(str) {
  if (!str) return '';

  return str
    // Remove outer braces
    .replace(/^\{+|\}+$/g, '')
    // Remove LaTeX commands (e.g., \textit{}, \emph{})
    .replace(/\\[a-z]+\{([^}]*)\}/gi, '$1')
    // Remove remaining braces
    .replace(/[{}]/g, '')
    // Remove backslashes
    .replace(/\\/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate BibTeX key from paper data
 * @param {Object} paper - Paper object
 * @returns {string} - BibTeX key (e.g., "kim2025voronoi")
 */
export function generateBibtexKey(paper) {
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
 * Generate BibTeX string from paper object
 * @param {Object} paper - Paper object
 * @returns {string} - BibTeX formatted string
 */
export function generateBibtex(paper) {
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
}
