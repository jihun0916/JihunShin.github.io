// Paper auto-fill service using CrossRef and OpenAlex APIs
const CROSSREF_API = 'https://api.crossref.org/works';
const OPENALEX_API = 'https://api.openalex.org/works';

/**
 * Fetch paper metadata by DOI using CrossRef API
 * @param {string} doi - Paper DOI (e.g., "10.1145/1234567")
 * @returns {Promise<Object>} - Paper metadata
 */
export async function fetchPaperByDOI(doi) {
  // Clean DOI (remove "doi:" prefix and URL if present)
  let cleanDOI = doi.replace(/^doi:/i, '').trim();
  cleanDOI = cleanDOI.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');

  const url = `${CROSSREF_API}/${encodeURIComponent(cleanDOI)}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('DOI를 찾을 수 없습니다. DOI를 확인해주세요.');
      }
      throw new Error(`API 오류: ${response.status}`);
    }

    const data = await response.json();
    return parseCrossRefData(data.message);
  } catch (error) {
    console.error('DOI fetch error:', error);
    throw error;
  }
}

/**
 * Search paper by title using OpenAlex API
 * @param {string} title - Paper title
 * @returns {Promise<Object>} - Paper metadata (best match)
 */
export async function searchPaperByTitle(title) {
  if (!title || title.trim() === '') {
    throw new Error('제목을 입력해주세요.');
  }

  const url = `${OPENALEX_API}?search=${encodeURIComponent(title)}&per-page=5&mailto=jihun.shin@kaist.ac.kr`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error('논문을 찾을 수 없습니다. 제목을 확인해주세요.');
    }

    // Return best match (first result)
    return parseOpenAlexData(data.results[0]);
  } catch (error) {
    console.error('Title search error:', error);
    throw error;
  }
}

/**
 * Auto-detect input type (DOI or title) and fetch paper
 * @param {string} input - DOI or title
 * @returns {Promise<Object>} - Paper metadata
 */
export async function fetchPaperAuto(input) {
  const trimmed = input.trim();

  // Check if input looks like a DOI
  if (isDOI(trimmed)) {
    return fetchPaperByDOI(trimmed);
  } else {
    // Treat as title
    return searchPaperByTitle(trimmed);
  }
}

/**
 * Check if string looks like a DOI
 * @param {string} str - Input string
 * @returns {boolean}
 */
function isDOI(str) {
  // DOI patterns:
  // - 10.XXXX/...
  // - doi:10.XXXX/...
  // - https://doi.org/10.XXXX/...
  const doiPattern = /^(doi:)?(https?:\/\/(dx\.)?doi\.org\/)?10\.\d{4,}\/\S+/i;
  return doiPattern.test(str);
}

/**
 * Parse CrossRef API response into our paper format
 * @param {Object} data - CrossRef API response
 * @returns {Object} - Parsed paper data
 */
function parseCrossRefData(data) {
  // Extract DOI for PDF URL
  const pdfUrl = data.DOI ? `https://doi.org/${data.DOI}` : '';

  // Extract author names
  const authors = data.author?.map(author => {
    return `${author.given || ''} ${author.family || ''}`.trim();
  }) || [];

  // Extract venue (container-title or publisher)
  const venue = data['container-title']?.[0] || data.publisher || '';

  // Extract year from published date
  const year = data.published?.['date-parts']?.[0]?.[0] ||
                data.created?.['date-parts']?.[0]?.[0] ||
                new Date().getFullYear();

  // Extract abstract
  const abstract = data.abstract || '';

  // Generate keywords from title and venue
  const keywords = extractKeywords(data.title?.[0] || '', venue);

  // Build citation info
  const citationCount = data['is-referenced-by-count'] || 0;
  const citationInfo = citationCount > 0
    ? `Citation count: ${citationCount}`
    : '';

  return {
    title: data.title?.[0] || '',
    titleKo: '',
    authors,
    venue,
    year,
    abstract,
    keywords,
    pdfUrl,
    notes: citationInfo,
    tags: [],
    _raw: {
      doi: data.DOI,
      publisher: data.publisher
    }
  };
}

/**
 * Parse OpenAlex API response into our paper format
 * @param {Object} data - OpenAlex API response
 * @returns {Object} - Parsed paper data
 */
function parseOpenAlexData(data) {
  // Extract DOI for PDF URL
  const doi = data.doi?.replace('https://doi.org/', '');
  const pdfUrl = doi ? `https://doi.org/${doi}` : data.primary_location?.pdf_url || '';

  // Extract author names
  const authors = data.authorships?.map(authorship => {
    return authorship.author?.display_name || 'Unknown';
  }) || [];

  // Extract venue
  const venue = data.primary_location?.source?.display_name ||
                data.host_venue?.display_name || '';

  // Extract year
  const year = data.publication_year || new Date().getFullYear();

  // Extract abstract (OpenAlex provides inverted index, reconstruct if possible)
  const abstract = ''; // OpenAlex doesn't provide full abstract in free tier

  // Extract keywords from concepts
  const keywords = data.concepts
    ?.slice(0, 5)
    .map(concept => concept.display_name) || [];

  // Build citation info
  const citationCount = data.cited_by_count || 0;
  const citationInfo = citationCount > 0
    ? `Citation count: ${citationCount}`
    : '';

  return {
    title: data.title || '',
    titleKo: '',
    authors,
    venue,
    year,
    abstract,
    keywords,
    pdfUrl,
    notes: citationInfo,
    tags: [],
    _raw: {
      doi: doi,
      openalexId: data.id
    }
  };
}

/**
 * Extract potential keywords from title and venue
 * @param {string} title - Paper title
 * @param {string} venue - Venue name
 * @returns {string[]} - Extracted keywords
 */
function extractKeywords(title = '', venue = '') {
  const keywords = new Set();

  // Common research keywords to look for
  const commonKeywords = [
    'vr', 'ar', 'mr', 'xr', 'telepresence', 'virtual reality', 'augmented reality',
    'computer graphics', 'hci', 'visualization', 'simulation', 'rendering',
    'machine learning', 'deep learning', 'neural network', 'ai',
    '3d', 'avatar', 'hologram', 'projection', 'display',
    'collaboration', 'remote', 'teleconference', 'communication'
  ];

  const text = (title + ' ' + venue).toLowerCase();

  commonKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      keywords.add(keyword);
    }
  });

  // Extract capitalized words from title (potential technical terms)
  const titleWords = title.match(/\b[A-Z][A-Za-z]+\b/g) || [];
  titleWords.forEach(word => {
    if (word.length > 3 && word !== word.toUpperCase()) {
      keywords.add(word);
    }
  });

  return Array.from(keywords).slice(0, 5); // Limit to 5 keywords
}
