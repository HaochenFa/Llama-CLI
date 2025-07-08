// src/lib/mcp/types.ts
// Model Context Protocol (MCP) type definitions

/**
 * MCP Protocol version
 */
export const MCP_VERSION = '2024-11-05';

/**
 * JSON-RPC 2.0 message types
 */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: JsonRpcError;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

/**
 * MCP Server capabilities
 */
export interface ServerCapabilities {
  experimental?: Record<string, any>;
  logging?: {};
  prompts?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  tools?: {
    listChanged?: boolean;
  };
}

/**
 * MCP Client capabilities
 */
export interface ClientCapabilities {
  experimental?: Record<string, any>;
  sampling?: {};
}

/**
 * MCP Tool definition
 */
export interface McpTool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, any>;
    required?: string[];
  };
}

/**
 * MCP Tool call request
 */
export interface CallToolRequest {
  name: string;
  arguments?: Record<string, any>;
}

/**
 * MCP Tool call result
 */
export interface CallToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

/**
 * MCP Resource definition
 */
export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP Prompt definition
 */
export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

/**
 * MCP Server configuration
 */
export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

/**
 * MCP Connection status
 */
export type McpConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * MCP Server info
 */
export interface McpServerInfo {
  name: string;
  version: string;
  protocolVersion?: string;
}

/**
 * MCP Initialize request
 */
export interface InitializeRequest {
  protocolVersion: string;
  capabilities: ClientCapabilities;
  clientInfo: {
    name: string;
    version: string;
  };
}

/**
 * MCP Initialize response
 */
export interface InitializeResponse {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: McpServerInfo;
}

/**
 * MCP Error codes
 */
export enum McpErrorCode {
  // Standard JSON-RPC error codes
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  
  // MCP-specific error codes
  InvalidTool = -32000,
  ToolExecutionError = -32001,
  ResourceNotFound = -32002,
  PromptNotFound = -32003,
}

/**
 * MCP Event types
 */
export interface McpEvents {
  'connection-status': McpConnectionStatus;
  'tools-changed': McpTool[];
  'resources-changed': McpResource[];
  'prompts-changed': McpPrompt[];
  'error': Error;
}

/**
 * MCP Client interface
 */
export interface IMcpClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getStatus(): McpConnectionStatus;
  
  // Tool operations
  listTools(): Promise<McpTool[]>;
  callTool(request: CallToolRequest): Promise<CallToolResult>;
  
  // Resource operations
  listResources(): Promise<McpResource[]>;
  readResource(uri: string): Promise<any>;
  
  // Prompt operations
  listPrompts(): Promise<McpPrompt[]>;
  getPrompt(name: string, args?: Record<string, any>): Promise<any>;
  
  // Event handling
  on<K extends keyof McpEvents>(event: K, listener: (data: McpEvents[K]) => void): void;
  off<K extends keyof McpEvents>(event: K, listener: (data: McpEvents[K]) => void): void;
}
