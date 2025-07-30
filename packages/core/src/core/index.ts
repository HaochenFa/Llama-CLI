/**
 * Core functionality exports for LlamaCLI
 */

export { ToolScheduler } from "./tool-scheduler.js";
export { AgenticLoop, createAgenticLoop } from "./agentic-loop.js";

export type { ToolSchedulerConfig } from "./tool-scheduler.js";

export type {
  AgentState,
  AgentStep,
  AgentPlan,
  AgentContext,
  AgentResult,
  AgentConfig,
} from "./agentic-loop.js";

// Import actual implementations
export { SessionManager } from "../session/session-manager.js";

// Context management - using enhanced context manager for now
export class ContextManager {
  // Basic context management functionality
  // For advanced features, use EnhancedContextManager from core/enhanced-context-manager.js
}
