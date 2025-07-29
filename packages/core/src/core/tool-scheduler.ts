/**
 * Tool Scheduler for LlamaCLI
 * Manages tool execution, queuing, concurrency control, and result caching
 */

import { MCPClient } from '../mcp/client.js';
import { BuiltinMCPServer } from '../mcp/server.js';
import {
  MCPToolCallResult,
  MCPContent,
  MCPTextContent,
} from '../types/mcp.js';

/**
 * Tool call definition
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  timestamp: number;
  requiresConfirmation?: boolean;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  id: string;
  success: boolean;
  content: MCPContent[];
  error?: string;
  executionTime: number;
  timestamp: number;
}

/**
 * Tool call queue item
 */
interface QueueItem {
  toolCall: ToolCall;
  resolve: (result: ToolResult) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  retryCount: number;
}

/**
 * Confirmation handler function
 */
export type ConfirmationHandler = (toolCall: ToolCall) => Promise<boolean>;

/**
 * Cache entry
 */
interface CacheEntry {
  result: ToolResult;
  timestamp: number;
  accessCount: number;
}

/**
 * Tool scheduler configuration
 */
export interface ToolSchedulerConfig {
  maxConcurrentExecutions?: number;
  defaultTimeout?: number;
  maxRetries?: number;
  cacheSize?: number;
  cacheTTL?: number;
  enableCache?: boolean;
}

/**
 * Tool Scheduler implementation
 */
export class ToolScheduler {
  private mcpClient: MCPClient | null = null;
  private builtinServer: BuiltinMCPServer | null = null;
  private executionQueue: QueueItem[] = [];
  private activeExecutions = 0;
  private confirmationHandler: ConfirmationHandler | null = null;
  private resultCache: Map<string, CacheEntry> = new Map();
  private config: Required<ToolSchedulerConfig>;
  private cacheCleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: ToolSchedulerConfig = {}) {
    this.config = {
      maxConcurrentExecutions: 5,
      defaultTimeout: 30000,
      maxRetries: 3,
      cacheSize: 100,
      cacheTTL: 300000, // 5 minutes
      enableCache: true,
      ...config,
    };

    // Start cache cleanup timer
    if (this.config.enableCache) {
      this.startCacheCleanup();
    }
  }

  /**
   * Set MCP client for external tool calls
   */
  setMCPClient(client: MCPClient): void {
    this.mcpClient = client;
  }

  /**
   * Set builtin MCP server for internal tool calls
   */
  setBuiltinServer(server: BuiltinMCPServer): void {
    this.builtinServer = server;
  }

  /**
   * Set confirmation handler
   */
  setConfirmationHandler(handler: ConfirmationHandler): void {
    this.confirmationHandler = handler;
  }

  /**
   * Execute a single tool call
   */
  async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    if (!this.validateToolCall(toolCall)) {
      throw new Error(`Invalid tool call: ${JSON.stringify(toolCall)}`);
    }

    // Check cache first
    if (this.config.enableCache) {
      const cached = this.getCachedResult(toolCall);
      if (cached) {
        return cached;
      }
    }

    // Handle confirmation if required
    if (toolCall.requiresConfirmation && this.confirmationHandler) {
      const confirmed = await this.confirmationHandler(toolCall);
      if (!confirmed) {
        return this.createErrorResult(toolCall.id, 'Tool execution cancelled by user');
      }
    }

    return new Promise<ToolResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Tool call timeout: ${toolCall.name}`));
      }, this.config.defaultTimeout);

      const queueItem: QueueItem = {
        toolCall,
        resolve,
        reject,
        timeout,
        retryCount: 0,
      };

      this.executionQueue.push(queueItem);
      this.processQueue();
    });
  }

  /**
   * Execute multiple tool calls in batch
   */
  async executeBatch(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    const promises = toolCalls.map(toolCall => this.executeToolCall(toolCall));
    return Promise.all(promises);
  }

  /**
   * Get execution statistics
   */
  getStatistics() {
    return {
      queueLength: this.executionQueue.length,
      activeExecutions: this.activeExecutions,
      cacheSize: this.resultCache.size,
      cacheHitRate: this.calculateCacheHitRate(),
    };
  }

  /**
   * Clear result cache
   */
  clearCache(): void {
    this.resultCache.clear();
  }

  /**
   * Shutdown the scheduler
   */
  async shutdown(): Promise<void> {
    // Cancel all queued items
    this.executionQueue.forEach(item => {
      clearTimeout(item.timeout);
      item.reject(new Error('Scheduler is shutting down'));
    });
    this.executionQueue = [];

    // Wait for active executions to complete
    while (this.activeExecutions > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Stop cache cleanup
    if (this.cacheCleanupTimer) {
      clearInterval(this.cacheCleanupTimer);
      this.cacheCleanupTimer = null;
    }
  }

  /**
   * Process the execution queue
   */
  private processQueue(): void {
    while (
      this.executionQueue.length > 0 &&
      this.activeExecutions < this.config.maxConcurrentExecutions
    ) {
      const item = this.executionQueue.shift()!;
      this.executeQueueItem(item);
    }
  }

  /**
   * Execute a queue item
   */
  private async executeQueueItem(item: QueueItem): Promise<void> {
    this.activeExecutions++;

    try {
      const startTime = Date.now();
      const result = await this.performToolExecution(item.toolCall);
      const executionTime = Date.now() - startTime;

      const toolResult: ToolResult = {
        id: item.toolCall.id,
        success: !result.isError,
        content: result.content,
        executionTime,
        timestamp: Date.now(),
      };

      if (result.isError) {
        toolResult.error = this.extractErrorMessage(result.content);
      }

      // Cache the result
      if (this.config.enableCache && toolResult.success) {
        this.cacheResult(item.toolCall, toolResult);
      }

      clearTimeout(item.timeout);
      item.resolve(toolResult);
    } catch (error) {
      // Handle retry logic
      if (item.retryCount < this.config.maxRetries) {
        item.retryCount++;
        this.executionQueue.unshift(item); // Retry at front of queue
      } else {
        clearTimeout(item.timeout);
        item.reject(error as Error);
      }
    } finally {
      this.activeExecutions--;
      this.processQueue();
    }
  }

  /**
   * Perform the actual tool execution
   */
  private async performToolExecution(toolCall: ToolCall): Promise<MCPToolCallResult> {
    // Try builtin server first
    if (this.builtinServer) {
      const tools = this.builtinServer.getTools();
      const tool = tools.find(t => t.name === toolCall.name);
      
      if (tool) {
        const request = {
          jsonrpc: '2.0' as const,
          id: toolCall.id,
          method: 'tools/call',
          params: {
            name: toolCall.name,
            arguments: toolCall.arguments,
          },
        };

        const response = await this.builtinServer.handleRequest(request);
        if (response.error) {
          throw new Error(response.error.message);
        }
        return response.result;
      }
    }

    // Fall back to MCP client
    if (this.mcpClient && this.mcpClient.isConnected()) {
      return await this.mcpClient.callTool(toolCall.name, toolCall.arguments);
    }

    throw new Error(`No available handler for tool: ${toolCall.name}`);
  }

  /**
   * Validate tool call
   */
  private validateToolCall(toolCall: ToolCall): boolean {
    return (
      toolCall &&
      typeof toolCall.id === 'string' &&
      typeof toolCall.name === 'string' &&
      typeof toolCall.arguments === 'object' &&
      typeof toolCall.timestamp === 'number'
    );
  }

  /**
   * Get cached result
   */
  private getCachedResult(toolCall: ToolCall): ToolResult | null {
    const cacheKey = this.generateCacheKey(toolCall);
    const entry = this.resultCache.get(cacheKey);
    
    if (entry) {
      const now = Date.now();
      if (now - entry.timestamp < this.config.cacheTTL) {
        entry.accessCount++;
        return { ...entry.result };
      } else {
        this.resultCache.delete(cacheKey);
      }
    }
    
    return null;
  }

  /**
   * Cache execution result
   */
  private cacheResult(toolCall: ToolCall, result: ToolResult): void {
    if (this.resultCache.size >= this.config.cacheSize) {
      this.evictOldestCacheEntry();
    }

    const cacheKey = this.generateCacheKey(toolCall);
    this.resultCache.set(cacheKey, {
      result: { ...result },
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  /**
   * Generate cache key for tool call
   */
  private generateCacheKey(toolCall: ToolCall): string {
    const argsString = JSON.stringify(toolCall.arguments, Object.keys(toolCall.arguments).sort());
    return `${toolCall.name}:${argsString}`;
  }

  /**
   * Evict oldest cache entry
   */
  private evictOldestCacheEntry(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.resultCache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.resultCache.delete(oldestKey);
    }
  }

  /**
   * Start cache cleanup timer
   */
  private startCacheCleanup(): void {
    this.cacheCleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.resultCache) {
        if (now - entry.timestamp > this.config.cacheTTL) {
          this.resultCache.delete(key);
        }
      }
    }, this.config.cacheTTL / 2);
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    let totalAccess = 0;
    let cacheHits = 0;
    
    for (const entry of this.resultCache.values()) {
      totalAccess += entry.accessCount;
      if (entry.accessCount > 1) {
        cacheHits += entry.accessCount - 1;
      }
    }
    
    return totalAccess > 0 ? cacheHits / totalAccess : 0;
  }

  /**
   * Extract error message from content
   */
  private extractErrorMessage(content: MCPContent[]): string {
    const textContent = content.find(c => c.type === 'text') as MCPTextContent;
    return textContent ? textContent.text : 'Unknown error';
  }

  /**
   * Create error result
   */
  private createErrorResult(id: string, error: string): ToolResult {
    return {
      id,
      success: false,
      content: [{
        type: 'text',
        text: error,
      }],
      error,
      executionTime: 0,
      timestamp: Date.now(),
    };
  }
}

/**
 * Create a new tool scheduler instance
 */
export function createToolScheduler(config?: ToolSchedulerConfig): ToolScheduler {
  return new ToolScheduler(config);
}