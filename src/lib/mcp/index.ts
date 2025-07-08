// src/lib/mcp/index.ts
// MCP module exports

export * from './types';
export * from './client';
export * from './manager';
export * from './config';
export * from './tool-adapter';

// Re-export commonly used functions
export { getMcpManager, getMcpToolAdapter } from '../tools/mcp_manager';
