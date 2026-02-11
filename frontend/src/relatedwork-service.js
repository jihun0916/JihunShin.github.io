// Related Work generation service using Ollama
import { ollamaClient } from './llm-client.js';
import { config } from './research-config.js';
import { db } from './firebase.js';
import { collection, addDoc, getDocs, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { getCurrentUserId } from './auth.js';

/**
 * Generate Related Work section from selected papers
 * @param {Array} papers - Array of paper objects
 * @param {Function} onChunk - Callback for streaming chunks (optional)
 * @param {string} introduction - Introduction text for style consistency (optional)
 * @returns {Promise<string>} - Generated Related Work text
 */
export async function generateRelatedWork(papers, onChunk = null, introduction = '') {
  if (!papers || papers.length === 0) {
    throw new Error('논문을 선택해주세요.');
  }

  const model = config.llm.models.relatedWork;

  // Generate BibTeX keys for each paper
  const paperWithKeys = papers.map(paper => {
    const bibtexKey = extractOrGenerateBibtexKey(paper);
    return { ...paper, bibtexKey };
  });

  // Build paper summaries for the prompt
  const paperSummaries = paperWithKeys.map((paper, index) => {
    return `[${index + 1}] ${paper.title}
BibTeX Key: ${paper.bibtexKey}
Authors: ${paper.authors.join(', ')}
Venue: ${paper.venue} (${paper.year})
${paper.abstract ? `Abstract: ${paper.abstract.substring(0, 300)}...` : ''}
Keywords: ${paper.keywords.join(', ')}`;
  }).join('\n\n');

  // Build introduction context if provided
  const introductionContext = introduction ? `
REFERENCE INTRODUCTION (for style consistency):
The following is the Introduction section from the paper. Match the writing style, tone, vocabulary level, and sentence structure of this Introduction when writing the Related Work section.

${introduction}

---

` : '';

  const prompt = `You are an expert academic writer specializing in computer science research papers. Your task is to write a comprehensive "Related Work" section for a LaTeX research paper based on the following papers.

${introductionContext}CRITICAL REQUIREMENTS:
- Write in EXTREMELY FORMAL and OBJECTIVE academic tone suitable for top-tier conferences (ACM, IEEE)
${introduction ? '- **CRITICAL**: Match the exact writing STYLE, TONE, and VOCABULARY LEVEL of the provided Introduction section' : ''}
${introduction ? '- Use similar sentence structures, transitions, and phrasing patterns as the Introduction' : ''}
- Use PASSIVE VOICE where appropriate (e.g., "is proposed", "is demonstrated", "has been shown")
- Employ formal academic phrases (e.g., "In the context of", "Building upon", "In contrast to")
- Organize papers by theme or research direction (NOT chronologically)
- Compare and contrast approaches, highlighting similarities and differences
- Synthesize multiple papers to show the evolution of ideas
- Use precise technical terminology
- **CRITICAL**: Cite papers using LaTeX \\cite{bibtexKey} format (e.g., \\cite{kim2025voronoi})
- Use the exact BibTeX keys provided for each paper
- Write 3-5 paragraphs, each focusing on a specific aspect or approach
- Conclude with how these works relate to your research gap

PAPERS TO SYNTHESIZE:

${paperSummaries}

Generate a well-structured Related Work section that:
1. Groups papers by research themes or approaches
2. Discusses key contributions and methodologies
3. Highlights gaps or limitations that your work addresses
4. Uses formal academic language throughout
5. Cites each paper using \\cite{bibtexKey} format
${introduction ? '6. MAINTAINS PERFECT CONSISTENCY with the Introduction\'s writing style' : ''}

Related Work Section:`;

  const chunks = [];

  if (onChunk) {
    // Streaming mode
    for await (const chunk of ollamaClient.generate(prompt, model, {
      stream: true,
      temperature: 0.7,
      top_p: 0.9
    })) {
      if (chunk.response) {
        chunks.push(chunk.response);
        onChunk(chunks.join(''));
      }
    }
  } else {
    // Non-streaming mode
    const result = await ollamaClient.generate(prompt, model, {
      temperature: 0.7,
      top_p: 0.9
    });
    return result;
  }

  return chunks.join('');
}

/**
 * Save generated Related Work to Firestore
 * @param {string} title - Title for this Related Work
 * @param {string} content - Generated Related Work text
 * @param {Array<string>} paperIds - IDs of papers used
 * @returns {Promise<string>} - Document ID
 */
export async function saveRelatedWork(title, content, paperIds) {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const relatedWorksCollection = collection(db, 'relatedWorks');

  const docRef = await addDoc(relatedWorksCollection, {
    title,
    content,
    paperIds,
    model: config.llm.models.relatedWork,
    timestamp: Date.now(),
    userId
  });

  return docRef.id;
}

/**
 * Get Related Work history from Firestore
 * @param {number} limit - Number of items to retrieve
 * @returns {Promise<Array>} - Array of Related Work objects
 */
export async function getRelatedWorkHistory(limit = 10) {
  const userId = getCurrentUserId();
  if (!userId) {
    return [];
  }

  const relatedWorksCollection = collection(db, 'relatedWorks');

  const q = query(
    relatedWorksCollection,
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    firestoreLimit(limit)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Extract or generate BibTeX key from paper
 * @param {Object} paper - Paper object
 * @returns {string} - BibTeX key
 */
function extractOrGenerateBibtexKey(paper) {
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
