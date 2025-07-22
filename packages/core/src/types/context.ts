/**
 * Core context types for LlamaCLI
 * Defines the fundamental data structures used throughout the system
 */

/**
 * LLM Profile configuration
 */
export interface LLMProfile {
  name: string;
  type: "ollama" | "vllm" | "openai" | "claude";
  endpoint: string;
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  timeout?: number;
  retries?: number;
  customHeaders?: Record<string, string>;
}

/**
 * Tool definition for MCP and native tools
 */
export interface ToolDefinition {
  type: "native" | "mcp";
  name: string;
  description: string;
  schema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  endpoint?: string;
  serverId?: string;
  category?: string;
  dangerous?: boolean;
}

/**
 * File context information
 */
export interface FileContext {
  path: string;
  content: string;
  lastModified: number;
  size: number;
  encoding: "utf8" | "binary";
  mimeType?: string;
  language?: string;
  relevanceScore?: number;
}

/**
 * Chat message structure
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  timestamp: number;
  id: string;
  metadata?: {
    tokens?: number;
    model?: string;
    processingTime?: number;
    [key: string]: any;
  };
}

/**
 * Tool call structure
 */
export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

/**
 * Tool execution result
 */
export interface ToolResult {
  tool_call_id: string;
  content: string;
  success: boolean;
  error?: string;
  metadata?: {
    executionTime?: number;
    outputSize?: number;
    [key: string]: any;
  };
}

/**
 * Session metadata
 */
export interface SessionMetadata {
  createdAt: number;
  lastActivity: number;
  messageCount: number;
  toolCallCount: number;
  totalTokens?: number;
  workingDirectory?: string;
  activeFiles?: string[];
}

/**
 * Context settings
 */
export interface ContextSettings {
  maxHistoryLength: number;
  maxFileContextSize: number;
  autoSaveInterval: number;
  confirmDestructiveActions: boolean;
  enableToolCalls: boolean;
  maxConcurrentTools: number;
  toolTimeout: number;
  contextCompressionThreshold: number;
  autoApproveTools: boolean;
  maxTokens: number;
  temperature: number;
  topP: number;
  topK: number;
  contextWindow: number;
  systemPrompt: string;
}

/**
 * Main internal context structure
 */
export interface InternalContext {
  sessionId: string;
  activeProfile: string;
  longTermMemory: string[];
  availableTools: ToolDefinition[];
  fileContext: FileContext[];
  chatHistory: ChatMessage[];
  sessionMetadata: SessionMetadata;
  settings: ContextSettings;
  workingDirectory?: string;
  environmentVariables?: Record<string, string>;
}

/**
 * Context compilation options
 */
export interface ContextCompilationOptions {
  includeSystemPrompt?: boolean;
  includeTools?: boolean;
  includeFileContext?: boolean;
  includeLongTermMemory?: boolean;
  maxTokens?: number;
  compressionLevel?: "none" | "light" | "aggressive";
}

/**
 * Context update event
 */
export interface ContextUpdateEvent {
  type: "message" | "tool_call" | "file_change" | "setting_change";
  timestamp: number;
  data: any;
  sessionId: string;
}

/**
 * Memory entry for long-term storage
 */
export interface MemoryEntry {
  id: string;
  content: string;
  timestamp: number;
  importance: number;
  tags: string[];
  sessionId?: string;
  relatedFiles?: string[];
}

/**
 * File change event
 */
export interface FileChangeEvent {
  type: "created" | "modified" | "deleted" | "renamed";
  path: string;
  oldPath?: string;
  timestamp: number;
  size?: number;
}

/**
 * Context validation result
 */
export interface ContextValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Context statistics
 */
export interface ContextStatistics {
  totalMessages: number;
  totalTokens: number;
  totalToolCalls: number;
  averageResponseTime: number;
  fileContextSize: number;
  memoryUsage: number;
  sessionDuration: number;
}

/**
 * Default context settings
 */
export const DEFAULT_CONTEXT_SETTINGS: ContextSettings = {
  maxHistoryLength: 100,
  maxFileContextSize: 1024 * 1024, // 1MB
  autoSaveInterval: 30000, // 30 seconds
  confirmDestructiveActions: true,
  enableToolCalls: true,
  maxConcurrentTools: 3,
  toolTimeout: 30000, // 30 seconds
  contextCompressionThreshold: 8000, // tokens
  autoApproveTools: false,
  maxTokens: 4096,
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  contextWindow: 128000,
  systemPrompt: "You are a helpful AI assistant.",
};

/**
 * Create a new internal context with default values
 */
export function createDefaultContext(sessionId: string, activeProfile: string): InternalContext {
  return {
    sessionId,
    activeProfile,
    longTermMemory: [],
    availableTools: [],
    fileContext: [],
    chatHistory: [],
    sessionMetadata: {
      createdAt: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0,
      toolCallCount: 0,
    },
    settings: { ...DEFAULT_CONTEXT_SETTINGS },
  };
}

/**
 * Type guards for runtime type checking
 */
export function isToolCall(obj: any): obj is ToolCall {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.id === "string" &&
    obj.type === "function" &&
    obj.function &&
    typeof obj.function.name === "string" &&
    typeof obj.function.arguments === "string"
  );
}

export function isChatMessage(obj: any): obj is ChatMessage {
  return (
    obj &&
    typeof obj === "object" &&
    ["system", "user", "assistant", "tool"].includes(obj.role) &&
    typeof obj.content === "string" &&
    typeof obj.timestamp === "number" &&
    typeof obj.id === "string"
  );
}

export function isToolResult(obj: any): obj is ToolResult {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.tool_call_id === "string" &&
    typeof obj.content === "string" &&
    typeof obj.success === "boolean"
  );
}
