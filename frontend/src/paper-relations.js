// Paper relationship auto-analysis service
// Uses Claude API to analyze papers and establish [[wikilink]] relationships
import { ollamaClient } from './llm-client.js';
import { config } from './research-config.js';
import { isGitHubConfigured, listVaultFiles, readFiles, writeFilesCommit } from './github-service.js';
import { parsePaperMarkdown } from './obsidian-utils.js';

/**
 * Relationship types used in the system
 */
export const RELATION_TYPES = {
  'extends': '확장/발전',
  'cites': '인용',
  'same-topic': '같은 주제',
  'same-method': '같은 방법론',
  'compares': '비교 대상',
  'foundation': '기반 연구',
  'application': '응용',
  'survey': '서베이/리뷰',
};

/**
 * Analyze all papers and auto-generate relationships using LLM
 * @param {Function} onProgress - (message, percent) callback
 * @returns {Promise<{ totalRelations: number, updatedFiles: number, errors: string[] }>}
 */
export async function autoAnalyzeRelationships(onProgress = () => {}) {
  if (!config.llm.enabled) {
    throw new Error('Claude API 키가 설정되지 않았습니다. Settings에서 설정하세요.');
  }
  if (!isGitHubConfigured()) {
    throw new Error('GitHub 설정이 완료되지 않았습니다. Settings에서 설정하세요.');
  }

  const result = { totalRelations: 0, updatedFiles: 0, errors: [] };

  // Step 1: Read all papers from GitHub
  onProgress('GitHub에서 논문 읽는 중...', 10);
  const vaultFiles = await listVaultFiles();
  const mdFiles = vaultFiles.filter(f => f.name.endsWith('.md'));
  const fileContents = await readFiles(mdFiles.map(f => f.path));

  // Step 2: Parse all papers
  onProgress('논문 메타데이터 파싱 중...', 20);
  const papers = [];
  for (const file of fileContents) {
    try {
      const { meta } = parsePaperMarkdown(file.content);
      papers.push({
        filename: file.path.split('/').pop().replace(/\.md$/, ''),
        path: file.path,
        content: file.content,
        title: meta.title,
        authors: meta.authors || [],
        year: meta.year,
        venue: meta.venue || '',
        category: meta.category || '',
        keywords: meta.keywords || [],
        abstract: meta.abstract || '',
      });
    } catch (err) {
      result.errors.push(`파싱 실패: ${file.path}`);
    }
  }

  if (papers.length < 2) {
    throw new Error('관계를 분석할 논문이 2개 이상 필요합니다.');
  }

  // Step 3: Build paper summaries for LLM
  onProgress(`${papers.length}개 논문 관계 분석 중 (Claude API)...`, 30);
  const paperSummaries = papers.map((p, i) => {
    const parts = [`[${i}] "${p.title}" (${p.year})`];
    if (p.venue) parts.push(`  Venue: ${p.venue}`);
    if (p.keywords.length) parts.push(`  Keywords: ${p.keywords.join(', ')}`);
    if (p.category) parts.push(`  Category: ${p.category}`);
    if (p.abstract) parts.push(`  Abstract: ${p.abstract.substring(0, 300)}${p.abstract.length > 300 ? '...' : ''}`);
    return parts.join('\n');
  }).join('\n\n');

  // Step 4: Call LLM to analyze relationships
  const relationTypes = Object.keys(RELATION_TYPES).join(', ');

  // Split into chunks if too many papers (token limit)
  const MAX_PAPERS_PER_BATCH = 51; // Most vaults will be under this
  const relationships = [];

  for (let batchStart = 0; batchStart < papers.length; batchStart += MAX_PAPERS_PER_BATCH) {
    const batchEnd = Math.min(batchStart + MAX_PAPERS_PER_BATCH, papers.length);
    const batchPapers = papers.slice(batchStart, batchEnd);
    const batchSummaries = batchPapers.map((p, i) => {
      const idx = batchStart + i;
      const parts = [`[${idx}] "${p.title}" (${p.year})`];
      if (p.venue) parts.push(`  Venue: ${p.venue}`);
      if (p.keywords.length) parts.push(`  Keywords: ${p.keywords.join(', ')}`);
      if (p.category) parts.push(`  Category: ${p.category}`);
      if (p.abstract) parts.push(`  Abstract: ${p.abstract.substring(0, 300)}${p.abstract.length > 300 ? '...' : ''}`);
      return parts.join('\n');
    }).join('\n\n');

    const prompt = buildAnalysisPrompt(batchSummaries, relationTypes, papers.length);

    const progressPct = 30 + Math.floor((batchStart / papers.length) * 50);
    onProgress(`배치 ${Math.floor(batchStart / MAX_PAPERS_PER_BATCH) + 1} 분석 중...`, progressPct);

    try {
      const llmResponse = await ollamaClient.generate(prompt, config.llm.models.summary, {
        temperature: 0.3,
        max_tokens: 8000,
      });

      const batchRelations = parseLLMRelationships(llmResponse);
      relationships.push(...batchRelations);
    } catch (err) {
      result.errors.push(`LLM 분석 실패: ${err.message}`);
    }
  }

  if (relationships.length === 0 && result.errors.length === 0) {
    onProgress('관계를 찾지 못했습니다.', 100);
    return result;
  }

  result.totalRelations = relationships.length;

  // Step 5: Build updated markdown files with relationships
  onProgress(`${relationships.length}개 관계 적용 중...`, 80);

  // Group relationships by paper index
  const relMap = new Map(); // paperIndex → [{ targetIndex, type }]
  for (const rel of relationships) {
    if (rel.from >= papers.length || rel.to >= papers.length) continue;
    if (rel.from === rel.to) continue;

    if (!relMap.has(rel.from)) relMap.set(rel.from, []);
    if (!relMap.has(rel.to)) relMap.set(rel.to, []);

    relMap.get(rel.from).push({ target: rel.to, type: rel.type });
    // Bidirectional
    const reverseType = getReverseType(rel.type);
    relMap.get(rel.to).push({ target: rel.from, type: reverseType });
  }

  // Generate updated files
  const filesToWrite = [];
  for (const [paperIdx, rels] of relMap.entries()) {
    const paper = papers[paperIdx];
    if (!paper) continue;

    // Deduplicate relations
    const uniqueRels = deduplicateRelations(rels);

    // Build Related Papers section
    const relLines = uniqueRels.map(r => {
      const targetPaper = papers[r.target];
      if (!targetPaper) return null;
      return `- [[${targetPaper.filename}]] *(${r.type})*`;
    }).filter(Boolean);

    if (relLines.length === 0) continue;

    const relSection = `## Related Papers\n\n${relLines.join('\n')}`;

    // Update or insert Related Papers section in existing content
    let updatedContent = paper.content;
    const existingRelSection = /## Related Papers\n\n[\s\S]*?(?=\n## |\n*$)/;

    if (existingRelSection.test(updatedContent)) {
      // Merge with existing
      const existingMatch = updatedContent.match(existingRelSection);
      const existingLinks = extractExistingLinks(existingMatch[0]);
      const newLinks = relLines.filter(line => {
        const linkMatch = line.match(/\[\[([^\]]+)\]\]/);
        return linkMatch && !existingLinks.has(linkMatch[1]);
      });

      if (newLinks.length === 0) continue; // No new relations

      const mergedSection = existingMatch[0].trimEnd() + '\n' + newLinks.join('\n');
      updatedContent = updatedContent.replace(existingRelSection, mergedSection);
    } else {
      // Append new section
      updatedContent = updatedContent.trimEnd() + '\n\n' + relSection + '\n';
    }

    filesToWrite.push({ path: paper.path, content: updatedContent });
  }

  // Step 6: Push to GitHub
  if (filesToWrite.length > 0) {
    onProgress(`GitHub에 ${filesToWrite.length}개 파일 업데이트 중...`, 90);
    try {
      await writeFilesCommit(
        filesToWrite,
        `Auto-analyze: ${relationships.length} relationships across ${filesToWrite.length} papers`
      );
      result.updatedFiles = filesToWrite.length;
    } catch (err) {
      result.errors.push(`GitHub push 실패: ${err.message}`);
    }
  }

  onProgress('관계 분석 완료!', 100);
  return result;
}

// ──────────────────────────────────────────────
//  Prompt builder
// ──────────────────────────────────────────────

function buildAnalysisPrompt(paperSummaries, relationTypes, totalCount) {
  return `You are an expert research paper analyst. Given the following list of academic papers, identify meaningful relationships between them.

PAPERS:
${paperSummaries}

TASK:
Analyze these papers and identify relationships between them. For each relationship, output a line in this exact format:
[fromIndex] -> [toIndex] | type

Where type is one of: ${relationTypes}

RELATIONSHIP TYPE DEFINITIONS:
- extends: Paper B extends or builds upon Paper A's work
- cites: Paper B likely cites Paper A (based on topic relevance and timeline)
- same-topic: Both papers address the same research topic/problem
- same-method: Both papers use similar methodology/techniques
- compares: Papers that would be compared in a related work section
- foundation: Paper A provides foundational theory/method used by Paper B
- application: Paper B applies concepts from Paper A to a new domain

RULES:
1. Only output meaningful, non-trivial relationships
2. Consider topic similarity, methodology, venue, temporal order (earlier papers can be foundations for later ones)
3. Be selective — quality over quantity. Each paper should have 2-5 connections on average
4. Pay attention to keywords, venues, and year ordering
5. Output ONLY the relationship lines, one per line, nothing else
6. Use the paper indices [number] exactly as given

OUTPUT (one relationship per line):`;
}

// ──────────────────────────────────────────────
//  LLM response parser
// ──────────────────────────────────────────────

function parseLLMRelationships(text) {
  const relations = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const match = line.match(/\[?(\d+)\]?\s*->\s*\[?(\d+)\]?\s*\|\s*(\S+)/);
    if (match) {
      const from = parseInt(match[1], 10);
      const to = parseInt(match[2], 10);
      const type = match[3].trim();
      if (!isNaN(from) && !isNaN(to) && from !== to) {
        relations.push({ from, to, type });
      }
    }
  }

  return relations;
}

function getReverseType(type) {
  const reverses = {
    'extends': 'foundation',
    'foundation': 'extends',
    'application': 'foundation',
    'cites': 'cites',
    'same-topic': 'same-topic',
    'same-method': 'same-method',
    'compares': 'compares',
    'survey': 'survey',
  };
  return reverses[type] || type;
}

function deduplicateRelations(rels) {
  const seen = new Set();
  return rels.filter(r => {
    const key = `${r.target}-${r.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractExistingLinks(section) {
  const links = new Set();
  const re = /\[\[([^\]]+)\]\]/g;
  let m;
  while ((m = re.exec(section)) !== null) {
    links.add(m[1].trim());
  }
  return links;
}
