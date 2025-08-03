/**
 * Test data factories for creating mock objects
 */

import { AdapterConfig, LLMResponse, ToolResult } from '@llamacli/core';

// LLM Adapter Configuration Factories
export const createMockAdapterConfig = (overrides: Partial<AdapterConfig> = {}): AdapterConfig => ({
  type: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4',
  apiKey: 'test-api-key',
  timeout: 30000,
  retries: 3,
  ...overrides,
});

export const createMockOpenAIConfig = (): AdapterConfig => 
  createMockAdapterConfig({
    type: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4',
  });

export const createMockClaudeConfig = (): AdapterConfig => 
  createMockAdapterConfig({
    type: 'claude',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-sonnet-20240229',
  });

export const createMockGeminiConfig = (): AdapterConfig => 
  createMockAdapterConfig({
    type: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-1.5-pro',
  });

export const createMockOllamaConfig = (): AdapterConfig => 
  createMockAdapterConfig({
    type: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'llama2',
    apiKey: undefined,
  });

// LLM Response Factories
export const createMockLLMResponse = (overrides: Partial<LLMResponse> = {}): LLMResponse => ({
  content: 'This is a mock LLM response',
  usage: {
    promptTokens: 10,
    completionTokens: 20,
    totalTokens: 30,
  },
  model: 'gpt-4',
  finishReason: 'stop',
  ...overrides,
});

// Tool Result Factories
export const createMockToolResult = (overrides: Partial<ToolResult> = {}): ToolResult => ({
  isError: false,
  content: [
    {
      type: 'text',
      text: 'Mock tool execution result',
    },
  ],
  metadata: {
    executionTime: 100,
    timestamp: new Date().toISOString(),
  },
  ...overrides,
});

export const createMockErrorResult = (message = 'Mock error occurred'): ToolResult => 
  createMockToolResult({
    isError: true,
    content: [
      {
        type: 'text',
        text: message,
      },
    ],
  });

// File System Mock Data
export const createMockFileContent = (content = 'Mock file content'): string => content;

export const createMockFileStats = () => ({
  size: 1024,
  isFile: () => true,
  isDirectory: () => false,
  mtime: new Date(),
  ctime: new Date(),
});

// Network Mock Data
export const createMockHttpResponse = (data: any, status = 200) => ({
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  headers: new Headers({ 'Content-Type': 'application/json' }),
  json: async () => data,
  text: async () => JSON.stringify(data),
  ok: status >= 200 && status < 300,
});

// Session Mock Data
export const createMockSession = (overrides: any = {}) => ({
  id: 'test-session-id',
  name: 'Test Session',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [],
  metadata: {},
  ...overrides,
});

// CLI Command Mock Data
export const createMockCommandContext = (overrides: any = {}) => ({
  command: 'test',
  args: [],
  options: {},
  session: createMockSession(),
  ...overrides,
});

// Random data generators
export const randomString = (length = 10): string => 
  Math.random().toString(36).substring(2, 2 + length);

export const randomNumber = (min = 0, max = 100): number => 
  Math.floor(Math.random() * (max - min + 1)) + min;

export const randomBoolean = (): boolean => Math.random() < 0.5;

export const randomArrayItem = <T>(array: T[]): T => 
  array[Math.floor(Math.random() * array.length)];

// Async utilities for testing
export const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export const createMockPromise = <T>(value: T, delayMs = 0): Promise<T> => 
  delayMs > 0 ? delay(delayMs).then(() => value) : Promise.resolve(value);

export const createMockRejectedPromise = (error: Error, delayMs = 0): Promise<never> => 
  delayMs > 0 ? delay(delayMs).then(() => Promise.reject(error)) : Promise.reject(error);
