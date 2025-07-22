/**
 * Core functionality exports
 */

// Simple placeholder exports for now
export const SessionState = {
  IDLE: "idle",
  ACTIVE: "active",
  PAUSED: "paused",
  TERMINATED: "terminated",
} as const;

export type SessionStateType = (typeof SessionState)[keyof typeof SessionState];

// Simple factory functions
export function createContextManager() {
  return {
    // Placeholder implementation
    getContext: () => ({}),
    updateContext: () => {},
  };
}

export function createSessionManager() {
  return {
    // Placeholder implementation
    createSession: () => ({}),
    getSession: () => ({}),
  };
}
