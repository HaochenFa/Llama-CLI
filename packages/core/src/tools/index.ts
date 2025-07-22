/**
 * Tools module exports for LlamaCLI
 */

// Simple placeholder exports for now
export function createDefaultToolRegistry() {
  return {
    // Placeholder implementation
    getAllTools: () => [],
    getTool: () => null,
    registerTool: () => {},
  };
}

export function createTool() {
  return {
    // Placeholder implementation
    name: "placeholder",
    execute: () => Promise.resolve({ success: true }),
  };
}

export function getAvailableTools(): string[] {
  return [];
}
