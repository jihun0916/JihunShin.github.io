// LLM API client - Claude API (Anthropic)
import { config } from './research-config.js';

/**
 * Claude API client class
 * Compatible interface with the previous OllamaClient
 */
export class LLMClient {
  constructor() {
    this.baseUrl = 'https://api.anthropic.com/v1';
    this.apiVersion = '2023-06-01';
  }

  /**
   * Get the API key from localStorage
   * @returns {string|null}
   */
  getApiKey() {
    return localStorage.getItem('claude_api_key');
  }

  /**
   * Generate text completion from Claude API
   * @param {string} prompt - The prompt to send
   * @param {string} model - Model name (e.g., 'claude-sonnet-4-20250514')
   * @param {Object} options - Additional options
   * @returns {Promise<string> | AsyncGenerator} - Generated text or async generator
   */
  generate(prompt, model, options = {}) {
    if (options.stream) {
      return this.generateStream(prompt, model, options);
    }
    return this.generateNonStream(prompt, model, options);
  }

  /**
   * Build request headers
   * @private
   */
  getHeaders(stream = false) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Claude API 키가 설정되지 않았습니다. 설정 탭에서 API 키를 입력해주세요.');
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': this.apiVersion,
      'anthropic-dangerous-direct-browser-access': 'true'
    };

    return headers;
  }

  /**
   * Generate non-streaming response
   * @private
   */
  async generateNonStream(prompt, model, options) {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: model || config.llm.defaultModel,
        max_tokens: options.max_tokens ?? 4096,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: options.temperature ?? 0.7,
        top_p: options.top_p ?? 0.9
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || `${response.status} ${response.statusText}`;
      throw new Error(`Claude API error: ${errorMsg}`);
    }

    const data = await response.json();

    // Extract text from Claude's response format
    if (data.content && data.content.length > 0) {
      return data.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('');
    }

    return '';
  }

  /**
   * Generate streaming response
   * Yields objects with { response: "chunk" } to match previous interface
   * @private
   */
  async *generateStream(prompt, model, options) {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({
        model: model || config.llm.defaultModel,
        max_tokens: options.max_tokens ?? 4096,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: options.temperature ?? 0.7,
        top_p: options.top_p ?? 0.9,
        stream: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || `${response.status} ${response.statusText}`;
      throw new Error(`Claude API error: ${errorMsg}`);
    }

    // Parse SSE stream
    yield* this.handleSSEStream(response);
  }

  /**
   * Handle SSE (Server-Sent Events) stream from Claude API
   * @param {Response} response - Fetch response object
   * @returns {AsyncGenerator<Object>} - Yields { response: "text_chunk" }
   */
  async *handleSSEStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') return;

            try {
              const event = JSON.parse(jsonStr);

              // content_block_delta contains the text chunks
              if (event.type === 'content_block_delta' && event.delta?.text) {
                yield { response: event.delta.text };
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Check if API is available (API key is set and valid)
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    const apiKey = this.getApiKey();
    if (!apiKey) return false;

    try {
      // Quick test with minimal request
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: config.llm.defaultModel,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        }),
        signal: AbortSignal.timeout(10000)
      });
      return response.ok;
    } catch (error) {
      console.error('Claude API not available:', error);
      return false;
    }
  }

  /**
   * Get list of available models
   * @returns {Promise<Array>}
   */
  async listModels() {
    // Claude API doesn't have a list models endpoint for direct use
    // Return the configured models
    return [
      { name: 'claude-sonnet-4-20250514', description: 'Claude Sonnet 4 - Best balance of speed and quality' },
      { name: 'claude-3-5-haiku-20241022', description: 'Claude 3.5 Haiku - Fastest, most affordable' },
      { name: 'claude-3-5-sonnet-20241022', description: 'Claude 3.5 Sonnet - High quality' }
    ];
  }
}

// Export singleton instance (keeping 'ollamaClient' name for backward compatibility)
export const ollamaClient = new LLMClient();
