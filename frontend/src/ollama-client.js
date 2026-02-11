// Ollama API client for local LLM communication
import { config } from './research-config.js';

/**
 * Ollama API client class
 */
export class OllamaClient {
  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate text completion from Ollama
   * @param {string} prompt - The prompt to send to the model
   * @param {string} model - Model name (e.g., 'qwen2.5:14b')
   * @param {Object} options - Additional options
   * @returns {Promise<string> | AsyncGenerator} - Generated text or async generator
   */
  generate(prompt, model, options = {}) {
    // If streaming, return async generator directly
    if (options.stream) {
      return this.generateStream(prompt, model, options);
    }

    // Non-streaming mode
    return this.generateNonStream(prompt, model, options);
  }

  /**
   * Generate non-streaming response
   * @private
   */
  async generateNonStream(prompt, model, options) {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          top_p: options.top_p ?? 0.9,
          ...options.modelOptions
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  }

  /**
   * Generate streaming response
   * @private
   */
  async *generateStream(prompt, model, options) {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
        options: {
          temperature: options.temperature ?? 0.7,
          top_p: options.top_p ?? 0.9,
          ...options.modelOptions
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    // Delegate to handleStream
    yield* this.handleStream(response);
  }

  /**
   * Handle streaming response from Ollama
   * @param {Response} response - Fetch response object
   * @returns {AsyncGenerator<Object>} - Async generator yielding chunks
   */
  async *handleStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            yield data;
          } catch (e) {
            console.warn('Failed to parse JSON chunk:', line);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Check if Ollama is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });
      return response.ok;
    } catch (error) {
      console.error('Ollama not available:', error);
      return false;
    }
  }

  /**
   * Get list of available models
   * @returns {Promise<Array>}
   */
  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error listing models:', error);
      return [];
    }
  }
}

// Export singleton instance
export const ollamaClient = new OllamaClient(config.ollama.baseUrl);
