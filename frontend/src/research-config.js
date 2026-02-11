// Research Assistant configuration
export const config = {
  // Environment detection
  isLocal: window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1',

  // LLM configuration (Claude API)
  llm: {
    provider: 'claude',
    get enabled() {
      return !!localStorage.getItem('claude_api_key');
    },
    defaultModel: 'claude-sonnet-4-20250514',
    models: {
      translation: 'claude-sonnet-4-20250514',     // Korean↔English translation
      relatedWork: 'claude-sonnet-4-20250514',     // Related Work generation
      summary: 'claude-sonnet-4-20250514',         // Paper summarization
      keywords: 'claude-3-5-haiku-20241022'        // Keyword extraction (fast)
    }
  },

  // Firebase configuration
  firebase: {
    enabled: true
  },

  // Semantic Scholar API
  semanticScholar: {
    baseUrl: 'https://api.semanticscholar.org/graph/v1',
    enabled: true
  }
};
