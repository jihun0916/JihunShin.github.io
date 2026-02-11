// Research Assistant configuration
export const config = {
  // Environment detection
  isLocal: window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1',

  // Ollama configuration
  ollama: {
    // Ollama is enabled if:
    // 1. Custom URL is configured (for remote access via Tailscale)
    // 2. Running on localhost
    get enabled() {
      const customUrl = localStorage.getItem('ollama_url');
      return !!customUrl ||
             window.location.hostname === 'localhost' ||
             window.location.hostname === '127.0.0.1';
    },
    // Use custom URL from localStorage (e.g., Tailscale IP) or default to localhost
    get baseUrl() {
      return localStorage.getItem('ollama_url') || 'http://localhost:11434';
    },
    models: {
      translation: 'qwen2.5:14b',         // Korean→English translation
      relatedWork: 'deepseek-r1:14b',     // Related Work generation
      summary: 'deepseek-r1:14b',         // Paper summarization
      keywords: 'qwen3-coder'             // Keyword extraction
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
