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

// MCP
export * from "./mcp/client.js";

// Tools
export * from "./tools/index.js";

// Core
export * from "./core/index.js";

// Utils
export * from "./utils/index.js";

// Version
export const VERSION = "0.1.0";

// Default exports for convenience

export { OllamaAdapter } from "./adapters/ollama.js";

export { createMCPClient } from "./mcp/client.js";

export { createDefaultToolRegistry, createTool, getAvailableTools } from "./tools/index.js";

export { createContextManager, createSessionManager, SessionState } from "./core/index.js";

export {
  createDefaultContext,
  createDefaultSettings,
  createFileContext,
} from "./context/context.js";
