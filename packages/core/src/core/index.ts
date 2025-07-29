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

// Placeholder classes for future implementation
export class ContextManager {
  // TODO)): Implement context management
}

export class SessionManager {
  // TODO)): Implement session management
}
