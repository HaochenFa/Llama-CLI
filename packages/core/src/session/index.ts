/**
 * Session Management Module for LlamaCLI
 * Exports all session-related functionality
 */

// Core session management
export { SessionManager } from "./session-manager.js";
export type { SessionManagerEvents } from "./session-manager.js";

// History management
export { SessionHistoryManager } from "./session-history-manager.js";
export type {
  SessionHistoryManagerEvents,
  HistorySnapshot,
  BranchOptions,
  RestorationOptions,
  HistorySearchOptions,
  HistorySearchResult,
} from "./session-history-manager.js";

// Context optimization
export { SessionContextOptimizer } from "./session-context-optimizer.js";
export type {
  SessionContextOptimizerEvents,
  ContextOptimizationConfig,
  CrossSessionMemory,
  ContextOptimizationResult,
} from "./session-context-optimizer.js";

// Storage backends
export { FileStorageBackend } from "./file-storage-backend.js";
export type { FileStorageConfig } from "./file-storage-backend.js";

// Utilities
export * from "./session-utils.js";

// Re-export types for convenience
export * from "../types/session.js";
