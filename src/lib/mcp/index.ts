// src/lib/mcp/index.ts
// MCP module exports

export * from "./types.js";
export * from "./client.js";
export * from "./manager.js";
export * from "./config.js";
export * from "./tool-adapter.js";

// Re-export commonly used functions
export { getMcpManager, getMcpToolAdapter } from "../tools/mcp_manager.js";
