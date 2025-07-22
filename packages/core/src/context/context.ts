/**
 * Context management utilities
 */

import { InternalContext, ContextSettings, FileContext } from "../types/context.js";

/**
 * Create a default internal context
 */
export function createDefaultContext(sessionId: string, activeProfile: string): InternalContext {
  return {
    sessionId,
    activeProfile,
    longTermMemory: [],
    availableTools: [],
    chatHistory: [],
    fileContext: [],
    workingDirectory: process.cwd(),
    settings: {
      maxHistoryLength: 100,
      maxFileContextSize: 1024 * 1024,
      autoSaveInterval: 30000,
      confirmDestructiveActions: true,
      enableToolCalls: true,
      maxConcurrentTools: 3,
      toolTimeout: 30000,
      contextCompressionThreshold: 8192,
      autoApproveTools: false,
      maxTokens: 4096,
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      contextWindow: 128000,
      systemPrompt: "You are a helpful AI assistant.",
    },
    sessionMetadata: {
      createdAt: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0,
      toolCallCount: 0,
      totalTokens: 0,
      workingDirectory: process.cwd(),
      activeFiles: [],
    },
  };
}

/**
 * Create default context settings
 */
export function createDefaultSettings(): ContextSettings {
  return {
    maxHistoryLength: 100,
    maxFileContextSize: 1024 * 1024,
    autoSaveInterval: 30000,
    confirmDestructiveActions: true,
    enableToolCalls: true,
    maxConcurrentTools: 3,
    toolTimeout: 30000,
    contextCompressionThreshold: 8192,
    autoApproveTools: false,
    maxTokens: 4096,
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    contextWindow: 128000,
    systemPrompt: "You are a helpful AI assistant.",
  };
}

/**
 * Create file context from file path and content
 */
export function createFileContext(path: string, content: string, stats?: any): FileContext {
  return {
    path,
    content,
    lastModified: stats?.mtime?.getTime() || Date.now(),
    size: stats?.size || content.length,
    encoding: "utf8",
  };
}
