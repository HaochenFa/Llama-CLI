/**
 * Mock LLM adapters for testing
 */

import { vi } from 'vitest';
import { LLMAdapter, AdapterConfig, LLMResponse } from '@llamacli/core';
import { createMockLLMResponse } from './factories.js';

export class MockLLMAdapter implements LLMAdapter {
  private config: AdapterConfig;
  private mockResponse: LLMResponse;

  constructor(config: AdapterConfig, mockResponse?: LLMResponse) {
    this.config = config;
    this.mockResponse = mockResponse || createMockLLMResponse();
  }

  async generateResponse(prompt: string): Promise<LLMResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return {
      ...this.mockResponse,
      content: `Mock response for: ${prompt.substring(0, 50)}...`,
    };
  }

  async streamResponse(prompt: string): Promise<AsyncIterable<string>> {
    const response = await this.generateResponse(prompt);
    const words = response.content.split(' ');
    
    return {
      async *[Symbol.asyncIterator]() {
        for (const word of words) {
          await new Promise(resolve => setTimeout(resolve, 5));
          yield word + ' ';
        }
      }
    };
  }

  getConfig(): AdapterConfig {
    return this.config;
  }

  validateConfig(): boolean {
    return true;
  }

  setMockResponse(response: LLMResponse): void {
    this.mockResponse = response;
  }
}

// Factory functions for different adapter types
export const createMockOpenAIAdapter = (config?: Partial<AdapterConfig>): MockLLMAdapter => {
  const defaultConfig: AdapterConfig = {
    type: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4',
    apiKey: 'test-key',
    timeout: 30000,
    retries: 3,
    ...config,
  };
  
  return new MockLLMAdapter(defaultConfig);
};

export const createMockClaudeAdapter = (config?: Partial<AdapterConfig>): MockLLMAdapter => {
  const defaultConfig: AdapterConfig = {
    type: 'claude',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-sonnet-20240229',
    apiKey: 'test-key',
    timeout: 30000,
    retries: 3,
    ...config,
  };
  
  return new MockLLMAdapter(defaultConfig);
};

export const createMockGeminiAdapter = (config?: Partial<AdapterConfig>): MockLLMAdapter => {
  const defaultConfig: AdapterConfig = {
    type: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-1.5-pro',
    apiKey: 'test-key',
    timeout: 30000,
    retries: 3,
    ...config,
  };
  
  return new MockLLMAdapter(defaultConfig);
};

export const createMockOllamaAdapter = (config?: Partial<AdapterConfig>): MockLLMAdapter => {
  const defaultConfig: AdapterConfig = {
    type: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'llama2',
    timeout: 30000,
    retries: 3,
    ...config,
  };
  
  return new MockLLMAdapter(defaultConfig);
};

// Spy utilities for testing adapter interactions
export const createAdapterSpy = (adapter: MockLLMAdapter) => {
  return {
    generateResponse: vi.spyOn(adapter, 'generateResponse'),
    streamResponse: vi.spyOn(adapter, 'streamResponse'),
    getConfig: vi.spyOn(adapter, 'getConfig'),
    validateConfig: vi.spyOn(adapter, 'validateConfig'),
  };
};

// Error simulation utilities
export const createFailingAdapter = (errorMessage = 'Mock adapter error'): MockLLMAdapter => {
  const adapter = createMockOpenAIAdapter();
  
  vi.spyOn(adapter, 'generateResponse').mockRejectedValue(new Error(errorMessage));
  vi.spyOn(adapter, 'streamResponse').mockRejectedValue(new Error(errorMessage));
  
  return adapter;
};

export const createTimeoutAdapter = (timeoutMs = 5000): MockLLMAdapter => {
  const adapter = createMockOpenAIAdapter();
  
  vi.spyOn(adapter, 'generateResponse').mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, timeoutMs));
    throw new Error('Request timeout');
  });
  
  return adapter;
};
