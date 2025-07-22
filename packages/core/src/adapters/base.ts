/**
 * Base LLM Adapter implementation for LlamaCLI
 */

import {
  LLMAdapter,
  AdapterConfig,
  ChatOptions,
  ChatStreamChunk,
  AdapterHealthStatus,
  AdapterUsageStats,
  ModelInfo,
  AdapterError,
  AdapterErrorType,
  RetryConfig,
  RequestContext,
  ResponseContext,
  AdapterEvent,
  AdapterEventListener,
} from "../types/adapters.js";
import { ChatMessage, ToolCall, ToolResult } from "../types/context.js";

/**
 * Abstract base class for LLM adapters
 */
export abstract class BaseLLMAdapter implements LLMAdapter {
  protected config: AdapterConfig;
  protected eventListeners: Set<AdapterEventListener> = new Set();
  protected stats: AdapterUsageStats;
  protected lastHealthCheck: number = 0;
  protected healthCheckInterval: number = 60000; // 1 minute
  protected retryConfig: RetryConfig;
  protected logger?: {
    info: (message: string) => void;
    debug: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  };

  constructor(config: AdapterConfig) {
    this.config = config;
    this.stats = {
      requestCount: 0,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      errorCount: 0,
      averageLatency: 0,
      lastRequestTime: 0,
    };
    this.retryConfig = {
      maxRetries: config.retries || 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      retryableErrors: ["NETWORK_ERROR", "TIMEOUT_ERROR", "RATE_LIMIT_ERROR"],
    };
  }

  /**
   * Abstract methods that must be implemented by concrete adapters
   */
  abstract chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatMessage>;
  abstract chatStream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncIterable<ChatStreamChunk>;
  abstract getModels(): Promise<ModelInfo[]>;
  abstract validateConfig(): Promise<boolean>;

  /**
   * Get adapter configuration
   */
  getConfig(): AdapterConfig {
    return { ...this.config };
  }

  /**
   * Update adapter configuration
   */
  updateConfig(config: Partial<AdapterConfig>): void {
    this.config = { ...this.config, ...config };
    this.emitEvent({ type: "config_updated", config: this.config });
  }

  /**
   * Get adapter health status
   */
  async getHealth(): Promise<AdapterHealthStatus> {
    const now = Date.now();

    // Use cached health status if recent
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.getCachedHealth();
    }

    try {
      const startTime = Date.now();
      const isHealthy = await this.performHealthCheck();
      const latency = Date.now() - startTime;

      this.lastHealthCheck = now;

      const status: AdapterHealthStatus = {
        healthy: isHealthy,
        latency,
        lastChecked: now,
        modelAvailable: isHealthy,
        error: isHealthy ? undefined : "Health check failed",
      };

      this.emitEvent({ type: "health_check", status });
      return status;
    } catch (error) {
      const status: AdapterHealthStatus = {
        healthy: false,
        latency: -1,
        lastChecked: now,
        modelAvailable: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };

      this.emitEvent({ type: "health_check", status });
      return status;
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): AdapterUsageStats {
    return { ...this.stats };
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats(): void {
    this.stats = {
      requestCount: 0,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      errorCount: 0,
      averageLatency: 0,
      lastRequestTime: 0,
    };
    this.emitEvent({ type: "stats_reset", stats: this.stats });
  }

  /**
   * Add event listener
   */
  addEventListener(listener: AdapterEventListener): void {
    this.eventListeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: AdapterEventListener): void {
    this.eventListeners.delete(listener);
  }

  /**
   * Protected helper methods
   */

  /**
   * Emit an event to all listeners
   */
  protected emitEvent(event: AdapterEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in adapter event listener:", error);
      }
    }
  }

  /**
   * Update usage statistics
   */
  protected updateStats(context: RequestContext, response: ResponseContext): void {
    const latency = response.timestamp - context.timestamp;

    this.stats.requestCount++;
    this.stats.totalTokens += (response.inputTokens || 0) + (response.outputTokens || 0);
    this.stats.inputTokens += response.inputTokens || 0;
    this.stats.outputTokens += response.outputTokens || 0;
    this.stats.lastRequestTime = response.timestamp;

    // Update average latency
    this.stats.averageLatency =
      (this.stats.averageLatency * (this.stats.requestCount - 1) + latency) /
      this.stats.requestCount;

    this.emitEvent({ type: "stats_updated", stats: this.stats });
  }

  /**
   * Update error statistics
   */
  protected updateErrorStats(error: AdapterError): void {
    this.stats.errorCount++;
    this.emitEvent({ type: "error", error });
  }

  /**
   * Create request context
   */
  protected createRequestContext(
    requestId: string,
    messages: ChatMessage[],
    options?: ChatOptions
  ): RequestContext {
    return {
      requestId,
      timestamp: Date.now(),
      messages,
      options: options || {},
      adapter: this.config.type,
    };
  }

  /**
   * Create response context
   */
  protected createResponseContext(
    requestId: string,
    response: ChatMessage,
    inputTokens?: number,
    outputTokens?: number
  ): ResponseContext {
    return {
      requestId,
      timestamp: Date.now(),
      response,
      inputTokens,
      outputTokens,
      adapter: this.config.type,
    };
  }

  /**
   * Execute request with retry logic
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: RequestContext
  ): Promise<T> {
    let lastError: Error = new Error("Unknown error");
    let delay = this.retryConfig.baseDelay;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.emitEvent({
            type: "retry_attempt",
            attempt,
            maxRetries: this.retryConfig.maxRetries,
            delay,
            context,
          });
          await this.sleep(delay);
        }

        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        if (attempt === this.retryConfig.maxRetries || !this.isRetryableError(lastError)) {
          break;
        }

        // Calculate next delay with exponential backoff
        delay = Math.min(delay * this.retryConfig.backoffFactor, this.retryConfig.maxDelay);
      }
    }

    // All retries failed
    const adapterError = this.createAdapterError(this.getErrorType(lastError), lastError.message, {
      originalError: lastError,
      context,
    });

    this.updateErrorStats(adapterError);
    throw adapterError;
  }

  /**
   * Check if an error is retryable
   */
  protected isRetryableError(error: Error): boolean {
    const errorType = this.getErrorType(error);
    return this.retryConfig.retryableErrors.includes(errorType);
  }

  /**
   * Get error type from error instance
   */
  protected getErrorType(error: Error): AdapterErrorType {
    const message = error.message.toLowerCase();

    if (message.includes("timeout") || message.includes("timed out")) {
      return "TIMEOUT_ERROR";
    }
    if (message.includes("network") || message.includes("connection")) {
      return "NETWORK_ERROR";
    }
    if (message.includes("rate limit") || message.includes("too many requests")) {
      return "RATE_LIMIT_ERROR";
    }
    if (message.includes("auth") || message.includes("unauthorized")) {
      return "AUTH_ERROR";
    }
    if (message.includes("invalid") || message.includes("bad request")) {
      return "VALIDATION_ERROR";
    }
    if (message.includes("not found") || message.includes("model")) {
      return "MODEL_ERROR";
    }

    return "UNKNOWN_ERROR";
  }

  /**
   * Create adapter error
   */
  protected createAdapterError(
    type: AdapterErrorType,
    message: string,
    details?: any
  ): AdapterError {
    return {
      type,
      message,
      timestamp: Date.now(),
      adapter: this.config.type,
      details,
    };
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate tool calls in messages
   */
  protected validateToolCalls(messages: ChatMessage[]): void {
    for (const message of messages) {
      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          if (!toolCall.id || !toolCall.function?.name) {
            throw this.createAdapterError("VALIDATION_ERROR", "Tool call must have id and name", {
              toolCall,
            });
          }
        }
      }
    }
  }

  /**
   * Validate chat options
   */
  protected validateChatOptions(options?: ChatOptions): void {
    if (!options) return;

    if (options.temperature !== undefined) {
      if (options.temperature < 0 || options.temperature > 2) {
        throw this.createAdapterError("VALIDATION_ERROR", "Temperature must be between 0 and 2", {
          temperature: options.temperature,
        });
      }
    }

    if (options.maxTokens !== undefined) {
      if (options.maxTokens < 1) {
        throw this.createAdapterError("VALIDATION_ERROR", "Max tokens must be greater than 0", {
          maxTokens: options.maxTokens,
        });
      }
    }

    if (options.topP !== undefined) {
      if (options.topP < 0 || options.topP > 1) {
        throw this.createAdapterError("VALIDATION_ERROR", "Top P must be between 0 and 1", {
          topP: options.topP,
        });
      }
    }
  }

  /**
   * Abstract method for performing health check
   */
  protected abstract performHealthCheck(): Promise<boolean>;

  /**
   * Connect to the adapter service
   */
  async connect(): Promise<void> {
    // Default implementation - can be overridden by subclasses
    this.logger?.info(`Connecting to ${this.config.type} adapter...`);
  }

  /**
   * Disconnect from the adapter service
   */
  async disconnect(): Promise<void> {
    // Default implementation - can be overridden by subclasses
    this.logger?.info(`Disconnecting from ${this.config.type} adapter...`);
  }

  /**
   * Generate unique request ID
   */
  protected generateRequestId(): string {
    return `${this.config.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get cached health status
   */
  protected getCachedHealth(): AdapterHealthStatus {
    return {
      healthy: true,
      latency: this.stats.averageLatency,
      lastChecked: this.lastHealthCheck,
      modelAvailable: true,
    };
  }

  /**
   * Format messages for the specific adapter
   */
  protected abstract formatMessages(messages: ChatMessage[]): any;

  /**
   * Parse response from the specific adapter
   */
  protected abstract parseResponse(response: any): ChatMessage;

  /**
   * Parse streaming response from the specific adapter
   */
  protected abstract parseStreamChunk(chunk: any): ChatStreamChunk;
}

/**
 * Utility functions for adapters
 */
export function createAdapterFactory<T extends BaseLLMAdapter>(
  AdapterClass: new (config: AdapterConfig) => T
) {
  return (config: AdapterConfig): T => {
    return new AdapterClass(config);
  };
}

export function validateAdapterConfig(config: AdapterConfig): boolean {
  if (!config.type || typeof config.type !== "string") {
    return false;
  }

  if (!config.baseUrl || typeof config.baseUrl !== "string") {
    return false;
  }

  if (config.timeout !== undefined && (typeof config.timeout !== "number" || config.timeout < 0)) {
    return false;
  }

  if (config.retries !== undefined && (typeof config.retries !== "number" || config.retries < 0)) {
    return false;
  }

  return true;
}

export function mergeAdapterConfigs(
  base: AdapterConfig,
  override: Partial<AdapterConfig>
): AdapterConfig {
  return {
    ...base,
    ...override,
    headers: {
      ...base.headers,
      ...override.headers,
    },
    healthCheck:
      base.healthCheck || override.healthCheck
        ? {
            enabled: true,
            interval: 60000,
            timeout: 5000,
            ...base.healthCheck,
            ...override.healthCheck,
          }
        : undefined,
  };
}
