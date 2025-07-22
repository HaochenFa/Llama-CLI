/**
 * LLM Adapter types for LlamaCLI
 * Defines interfaces for different LLM backend integrations
 */

import { ChatMessage, ToolCall, ToolDefinition } from "./context.js";

/**
 * Base LLM adapter interface
 */
export interface LLMAdapter {
  // Core chat methods
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatMessage>;
  chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<ChatStreamChunk>;

  // Model information
  getModels(): Promise<ModelInfo[]>;

  // Configuration validation
  validateConfig(): Promise<boolean>;

  // Configuration management
  getConfig(): AdapterConfig;
  updateConfig(config: Partial<AdapterConfig>): void;

  // Health and statistics
  getHealth(): Promise<AdapterHealthStatus>;
  getUsageStats(): AdapterUsageStats;
  resetUsageStats(): void;

  // Event handling
  addEventListener(listener: AdapterEventListener): void;
  removeEventListener(listener: AdapterEventListener): void;
}

/**
 * Chat options for LLM requests
 */
export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  tools?: ToolDefinition[];
  toolChoice?: "auto" | "none" | { type: "function"; function: { name: string } };
  stream?: boolean;
  seed?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  logitBias?: Record<string, number>;
  user?: string;
}

/**
 * Streaming chat response chunk
 */
export interface ChatStreamChunk {
  type: "content" | "tool_call" | "done" | "error" | "metadata";
  content?: string;
  toolCall?: ToolCall;
  error?: string;
  metadata?: {
    model?: string;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
    finishReason?: "stop" | "length" | "tool_calls" | "content_filter";
    [key: string]: any;
  };
}

/**
 * Adapter configuration
 */
export interface AdapterConfig {
  type: string;
  baseUrl?: string;
  endpoint?: string;
  model?: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  customHeaders?: Record<string, string>;
  maxConcurrentRequests?: number;
  rateLimitPerMinute?: number;
  enableLogging?: boolean;
  logLevel?: "debug" | "info" | "warn" | "error";
  models?: string[];
  healthCheck?: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };
}

/**
 * Adapter health status
 */
export interface AdapterHealthStatus {
  healthy: boolean;
  latency?: number;
  error?: string;
  lastChecked: number;
  modelAvailable: boolean;
  apiKeyValid?: boolean;
  rateLimitRemaining?: number;
}

/**
 * Adapter usage statistics
 */
export interface AdapterUsageStats {
  requestCount: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  errorCount: number;
  averageLatency: number;
  lastRequestTime: number;
}

/**
 * Model information
 */
export interface ModelInfo {
  name: string;
  description?: string;
  contextLength?: number;
  maxTokens?: number;
  supportsTools?: boolean;
  supportsVision?: boolean;
  pricing?: {
    inputTokens?: number;
    outputTokens?: number;
    currency?: string;
  };
  capabilities: string[];
}

/**
 * Adapter error types
 */
export type AdapterErrorType =
  | "CONNECTION_ERROR"
  | "NETWORK_ERROR"
  | "AUTHENTICATION_ERROR"
  | "AUTH_ERROR"
  | "RATE_LIMIT_ERROR"
  | "MODEL_ERROR"
  | "TIMEOUT_ERROR"
  | "VALIDATION_ERROR"
  | "UNKNOWN_ERROR";

/**
 * Adapter error interface
 */
export interface AdapterError {
  type: AdapterErrorType;
  message: string;
  timestamp: number;
  adapter: string;
  details?: any;
}

/**
 * Request retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: string[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryableErrors: ["CONNECTION_ERROR", "TIMEOUT_ERROR", "RATE_LIMIT_ERROR"],
};

/**
 * Adapter factory interface
 */
export interface AdapterFactory {
  createAdapter(config: AdapterConfig): LLMAdapter;
  getSupportedTypes(): string[];
  validateConfig(type: string, config: any): Promise<boolean>;
}

/**
 * Adapter registry for managing multiple adapters
 */
export interface AdapterRegistry {
  register(type: string, factory: AdapterFactory): void;
  create(type: string, config: AdapterConfig): LLMAdapter;
  getAvailableTypes(): string[];
  isSupported(type: string): boolean;
}

/**
 * Streaming response handler
 */
export interface StreamHandler {
  onChunk(chunk: ChatStreamChunk): void;
  onError(error: Error): void;
  onComplete(): void;
}

/**
 * Request context for tracking
 */
export interface RequestContext {
  requestId: string;
  timestamp: number;
  messages: ChatMessage[];
  options: ChatOptions;
  adapter: string;
}

/**
 * Response context for tracking
 */
export interface ResponseContext {
  requestId: string;
  timestamp: number;
  response: ChatMessage;
  inputTokens?: number;
  outputTokens?: number;
  adapter: string;
}

/**
 * Adapter event types
 */
export type AdapterEvent =
  | { type: "request_start"; context: RequestContext }
  | { type: "request_end"; context: ResponseContext }
  | { type: "stream_chunk"; chunk: ChatStreamChunk }
  | { type: "error"; error: AdapterError }
  | { type: "health_check"; status: AdapterHealthStatus }
  | { type: "config_updated"; config: AdapterConfig }
  | { type: "stats_updated"; stats: AdapterUsageStats }
  | { type: "stats_reset"; stats: AdapterUsageStats }
  | {
      type: "retry_attempt";
      attempt: number;
      maxRetries: number;
      delay: number;
      context: RequestContext;
    };

/**
 * Adapter event listener
 */
export type AdapterEventListener = (event: AdapterEvent) => void;

/**
 * Type guards for adapter types
 */
export function isChatStreamChunk(obj: any): obj is ChatStreamChunk {
  return (
    obj &&
    typeof obj === "object" &&
    ["content", "tool_call", "done", "error", "metadata"].includes(obj.type)
  );
}

export function isAdapterError(obj: any): obj is AdapterError {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.type === "string" &&
    typeof obj.message === "string" &&
    typeof obj.timestamp === "number" &&
    typeof obj.adapter === "string"
  );
}

export function isModelInfo(obj: any): obj is ModelInfo {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.name === "string" &&
    Array.isArray(obj.capabilities)
  );
}

/**
 * Utility functions
 */
export function createRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

export function formatUsageStats(stats: AdapterUsageStats): string {
  const successRate =
    stats.requestCount > 0
      ? (((stats.requestCount - stats.errorCount) / stats.requestCount) * 100).toFixed(1)
      : "0";

  return (
    `Requests: ${stats.requestCount} (${successRate}% success), ` +
    `Tokens: ${stats.totalTokens}, ` +
    `Avg Latency: ${stats.averageLatency.toFixed(0)}ms`
  );
}
