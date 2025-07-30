/**
 * LlamaCLI Core Package
 *
 * This package provides the core functionality for LlamaCLI, including:
 * - Configuration management
 * - LLM adapters (Ollama, etc.)
 * - Model Context Protocol (MCP) support
 * - Tool system
 * - Context and session management
 * - Utility functions
 */

// Types
export * from "./types/context.js";
export * from "./types/adapters.js";
export * from "./types/mcp.js";

// Configuration
export {
  LlamaCLIConfig,
  ConfigAdapterConfig,
  LLMConfig,
  LLMProfile,
  MCPConfig,
  CLIConfig,
  DEFAULT_CONFIG,
  validateConfig,
  mergeConfigs,
  createDefaultConfig,
  loadConfig,
} from "./config/config.js";
export * from "./config/store.js";

// Context
export * from "./context/context.js";

// Adapters
export * from "./adapters/base.js";
export * from "./adapters/ollama.js";
export * from "./adapters/openai.js";
export * from "./adapters/claude.js";
export * from "./adapters/gemini.js";
export * from "./adapters/openai-compatible.js";

// MCP
export * from "./mcp/client.js";

// Tools
export * from "./tools/index.js";

// Export core types and classes (avoiding conflicts)
export type {
  AgentState,
  AgentStep,
  AgentPlan,
  AgentContext,
  AgentResult,
  AgentConfig,
  ToolSchedulerConfig,
} from "./core/index.js";

export type ToolCategory = string;

// Import needed for createDefaultContextWithParams
import { createDefaultContext as createDefaultContextInternal } from "./context/context.js";
import type { InternalContext } from "./types/context.js";

// Enhanced createDefaultContext function
export function createDefaultContextWithParams(
  sessionId: string,
  activeProfile: string
): InternalContext {
  return createDefaultContextInternal(sessionId, activeProfile);
}

// MCP Server
export { BuiltinMCPServer, createMCPServer } from "./mcp/server.js";

// Utils
export * from "./utils/index.js";

// Version
export const VERSION = "0.1.0";

// Default exports for convenience

export { OllamaAdapter } from "./adapters/ollama.js";
export { OpenAIAdapter } from "./adapters/openai.js";
export { ClaudeAdapter } from "./adapters/claude.js";
export { GeminiAdapter } from "./adapters/gemini.js";
export { OpenAICompatibleAdapter } from "./adapters/openai-compatible.js";

export { createMCPClient } from "./mcp/client.js";

// Tool system exports
export {
  BaseTool,
  ToolRegistry,
  globalToolRegistry,
  getToolsByCategory,
  getToolStats,
  initializeTools,
  ToolExecutor,
  ToolDiscovery,
} from "./tools/index.js";

// Core system exports
export { ContextManager, SessionManager, AgenticLoop } from "./core/index.js";
export { TaskDecomposer } from "./core/task-decomposer.js";
export { EnhancedContextManager } from "./core/enhanced-context-manager.js";
export { DynamicExecutionPlanner } from "./core/dynamic-execution-planner.js";

export {
  createDefaultContext,
  createDefaultSettings,
  createFileContext,
} from "./context/context.js";
