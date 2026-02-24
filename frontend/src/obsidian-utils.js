// Obsidian Markdown utilities — generate / parse paper notes
// Template follows Obsidian conventions: YAML frontmatter + [[wikilinks]]

/**
 * Convert a paper object to Obsidian-compatible markdown
 * @param {Object} paper - Paper data from Firestore
 * @param {Array} allPapers - All papers (for resolving relation titles)
 * @returns {string} markdown content
 */
export function paperToMarkdown(paper, allPapers = []) {
  const fm = buildFrontmatter(paper);
  const body = buildBody(paper, allPapers);
  return `---\n${fm}---\n\n${body}`;
}

/**
 * Parse an Obsidian markdown file back into a paper object
 * @param {string} markdown - Full markdown string
 * @returns {{ meta: Object, relations: Array<{ title: string, type: string }> }}
 */
export function parsePaperMarkdown(markdown) {
  const { frontmatter, body } = splitMarkdown(markdown);
  const meta = parseFrontmatter(frontmatter);
  const relations = parseRelations(body);
  const notes = parseNotes(body);

  return {
    meta: {
      title: meta.title || '',
      titleKo: meta.titleKo || '',
      authors: meta.authors || [],
      venue: meta.venue || '',
      year: meta.year || new Date().getFullYear(),
      abstract: meta.abstract || '',
      keywords: meta.keywords || [],
      pdfUrl: meta.pdf || '',
      category: meta.category || 'reference',
      tags: meta.tags || [],
      bibtex: meta.bibtex || '',
      notes: notes || meta.notes || '',
      firestoreId: meta.firestoreId || null,
    },
    relations,
  };
}

/**
 * Generate a safe filename for a paper (Obsidian vault)
 * @param {Object} paper
 * @returns {string} e.g. "Attention Is All You Need (2017).md"
 */
export function paperToFilename(paper) {
  const safe = (paper.title || 'Untitled')
    .replace(/[\\/:*?"<>|]/g, '')   // remove illegal chars
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 120);                // keep filename reasonable
  const year = paper.year || '';
  return year ? `${safe} (${year}).md` : `${safe}.md`;
}

/**
 * Extract [[wikilinks]] from markdown body
 * @param {string} text
 * @returns {string[]} array of link targets
 */
export function extractWikilinks(text) {
  const re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const links = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    links.push(m[1].trim());
  }
  return [...new Set(links)];
}

// ──────────────────────────────────────────────
//  Internal helpers
// ──────────────────────────────────────────────

function buildFrontmatter(paper) {
  const lines = [];
  const add = (key, val) => {
    if (val === undefined || val === null || val === '') return;
    if (Array.isArray(val)) {
      if (val.length === 0) return;
      lines.push(`${key}:`);
      val.forEach(v => lines.push(`  - "${escYaml(v)}"`));
    } else if (typeof val === 'number') {
      lines.push(`${key}: ${val}`);
    } else {
      lines.push(`${key}: "${escYaml(val)}"`);
    }
  };

  add('title', paper.title);
  add('titleKo', paper.titleKo);
  add('authors', paper.authors);
  add('year', paper.year);
  add('venue', paper.venue);
  add('category', paper.category);
  add('tags', paper.tags);
  add('keywords', paper.keywords);
  add('pdf', paper.pdfUrl);
  add('firestoreId', paper.id || paper.firestoreId);
  // bibtex is multi-line → store inline to avoid YAML headaches
  if (paper.bibtex) {
    lines.push(`bibtex: |`);
    paper.bibtex.split('\n').forEach(l => lines.push(`  ${l}`));
  }

  return lines.join('\n') + '\n';
}

function buildBody(paper, allPapers) {
  const sections = [];

  // Abstract
  if (paper.abstract) {
    sections.push(`## Abstract\n\n${paper.abstract}`);
  }

  // Notes
  if (paper.notes) {
    sections.push(`## Notes\n\n${paper.notes}`);
  }

  // Related Papers (as [[wikilinks]])
  if (paper.relatedPapers && paper.relatedPapers.length > 0) {
    const relLines = paper.relatedPapers.map(rel => {
      const target = resolveTitle(rel, allPapers);
      const typeLabel = rel.type ? ` *(${rel.type})*` : '';
      return `- [[${target}]]${typeLabel}`;
    });
    sections.push(`## Related Papers\n\n${relLines.join('\n')}`);
  }

  return sections.join('\n\n') + '\n';
}

function resolveTitle(rel, allPapers) {
  // rel can have { paperId, title, type }
  if (rel.title) return rel.title;
  if (rel.paperId && allPapers.length > 0) {
    const found = allPapers.find(p => p.id === rel.paperId);
    if (found) return found.title;
  }
  return rel.paperId || 'Unknown';
}

// ── Frontmatter parsing ──

function splitMarkdown(md) {
  const fmRegex = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
  const match = md.match(fmRegex);
  if (!match) return { frontmatter: '', body: md };
  return { frontmatter: match[1], body: match[2] };
}

function parseFrontmatter(fm) {
  if (!fm) return {};
  const result = {};
  const lines = fm.split('\n');
  let currentKey = null;
  let currentArray = null;
  let multiLineKey = null;
  let multiLineValue = [];

  for (const line of lines) {
    // Multi-line value (YAML literal block |)
    if (multiLineKey) {
      if (line.startsWith('  ') || line.startsWith('\t')) {
        multiLineValue.push(line.replace(/^  /, ''));
        continue;
      } else {
        result[multiLineKey] = multiLineValue.join('\n');
        multiLineKey = null;
        multiLineValue = [];
      }
    }

    // Array item
    if (currentArray && /^\s+-\s+/.test(line)) {
      const val = line.replace(/^\s+-\s+/, '').replace(/^"(.*)"$/, '$1');
      result[currentKey].push(val);
      continue;
    } else if (currentArray && !/^\s+-/.test(line)) {
      currentArray = false;
    }

    // Key: value
    const kvMatch = line.match(/^([a-zA-Z_]+):\s*(.*)/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      let val = kvMatch[2].trim();

      // Detect array start (empty value after key:)
      if (val === '') {
        result[currentKey] = [];
        currentArray = true;
        continue;
      }

      // Detect literal block
      if (val === '|') {
        multiLineKey = currentKey;
        multiLineValue = [];
        currentArray = false;
        continue;
      }

      // Strip quotes
      val = val.replace(/^"(.*)"$/, '$1');

      // Try number
      if (/^\d+$/.test(val)) {
        result[currentKey] = parseInt(val, 10);
      } else {
        result[currentKey] = val;
      }
      currentArray = false;
    }
  }

  // Flush trailing multi-line
  if (multiLineKey) {
    result[multiLineKey] = multiLineValue.join('\n');
  }

  return result;
}

function parseRelations(body) {
  // Look for ## Related Papers section & extract [[links]] with optional type
  const relSection = body.match(/## Related Papers\n\n([\s\S]*?)(?=\n## |\n*$)/);
  if (!relSection) return [];

  const relations = [];
  const lines = relSection[1].split('\n');
  for (const line of lines) {
    const m = line.match(/- \[\[([^\]]+)\]\](?:\s*\*\((\w[\w\s-]*)\)\*)?/);
    if (m) {
      relations.push({ title: m[1].trim(), type: (m[2] || '').trim() || 'related' });
    }
  }
  return relations;
}

function parseNotes(body) {
  const notesSection = body.match(/## Notes\n\n([\s\S]*?)(?=\n## |\n*$)/);
  return notesSection ? notesSection[1].trim() : '';
}

function escYaml(s) {
  if (typeof s !== 'string') return s;
  return s.replace(/"/g, '\\"');
}
