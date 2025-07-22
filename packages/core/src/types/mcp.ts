/**
 * Model Context Protocol (MCP) types for LlamaCLI
 * Based on MCP specification version 2024-11-05
 */

/**
 * JSON-RPC 2.0 base types
 */
export interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: MCPError;
}

export interface MCPNotification {
  jsonrpc: "2.0";
  method: string;
  params?: any;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

/**
 * MCP Error codes
 */
export enum MCPErrorCode {
  // JSON-RPC 2.0 errors
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,

  // MCP specific errors
  TOOL_NOT_FOUND = -32000,
  TOOL_EXECUTION_ERROR = -32001,
  RESOURCE_NOT_FOUND = -32002,
  RESOURCE_ACCESS_DENIED = -32003,
  PROMPT_NOT_FOUND = -32004,
  INITIALIZATION_ERROR = -32005,
  CONNECTION_ERROR = -32006,
  TIMEOUT_ERROR = -32007,
}

/**
 * MCP Tool definition
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

/**
 * MCP Resource definition
 */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  annotations?: {
    audience?: ("user" | "assistant")[];
    priority?: number;
    [key: string]: any;
  };
}

/**
 * MCP Prompt definition
 */
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: {
    name: string;
    description?: string;
    required?: boolean;
  }[];
}

/**
 * MCP Server capabilities
 */
export interface MCPServerCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: {
    level?: "debug" | "info" | "notice" | "warning" | "error" | "critical" | "alert" | "emergency";
  };
  experimental?: Record<string, any>;
}

/**
 * MCP Client capabilities
 */
export interface MCPClientCapabilities {
  roots?: {
    listChanged?: boolean;
  };
  sampling?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
  };
  experimental?: Record<string, any>;
}

/**
 * MCP Initialization parameters
 */
export interface MCPInitializeParams {
  protocolVersion: string;
  capabilities: MCPClientCapabilities;
  clientInfo: {
    name: string;
    version: string;
  };
}

/**
 * MCP Initialization result
 */
export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: MCPServerCapabilities;
  serverInfo: {
    name: string;
    version: string;
  };
  instructions?: string;
}

/**
 * Tool call parameters
 */
export interface MCPToolCallParams {
  name: string;
  arguments?: Record<string, any>;
}

/**
 * Tool call result
 */
export interface MCPToolCallResult {
  content: MCPContent[];
  isError?: boolean;
}

/**
 * MCP Content types
 */
export type MCPContent = MCPTextContent | MCPImageContent | MCPResourceContent;

export interface MCPTextContent {
  type: "text";
  text: string;
  annotations?: {
    audience?: ("user" | "assistant")[];
    priority?: number;
    [key: string]: any;
  };
}

export interface MCPImageContent {
  type: "image";
  data: string; // base64 encoded
  mimeType: string;
  annotations?: {
    audience?: ("user" | "assistant")[];
    priority?: number;
    [key: string]: any;
  };
}

export interface MCPResourceContent {
  type: "resource";
  resource: {
    uri: string;
    text?: string;
    blob?: string; // base64 encoded
    mimeType?: string;
  };
  annotations?: {
    audience?: ("user" | "assistant")[];
    priority?: number;
    [key: string]: any;
  };
}

/**
 * Resource read parameters
 */
export interface MCPResourceReadParams {
  uri: string;
}

/**
 * Resource read result
 */
export interface MCPResourceReadResult {
  contents: MCPResourceContent[];
}

/**
 * Prompt get parameters
 */
export interface MCPPromptGetParams {
  name: string;
  arguments?: Record<string, any>;
}

/**
 * Prompt get result
 */
export interface MCPPromptGetResult {
  description?: string;
  messages: MCPPromptMessage[];
}

export interface MCPPromptMessage {
  role: "user" | "assistant";
  content: MCPContent;
}

/**
 * Logging parameters
 */
export interface MCPLoggingParams {
  level: "debug" | "info" | "notice" | "warning" | "error" | "critical" | "alert" | "emergency";
  data?: any;
  logger?: string;
}

/**
 * Progress notification parameters
 */
export interface MCPProgressParams {
  progressToken: string | number;
  progress: number;
  total?: number;
}

/**
 * Root list parameters
 */
export interface MCPRootListParams {
  // No parameters for root list
}

/**
 * Root list result
 */
export interface MCPRootListResult {
  roots: MCPRoot[];
}

export interface MCPRoot {
  uri: string;
  name?: string;
}

/**
 * MCP Transport interface
 */
export interface MCPTransport {
  send(message: MCPRequest | MCPResponse | MCPNotification): Promise<void>;
  receive(): AsyncIterable<MCPRequest | MCPResponse | MCPNotification>;
  close(): Promise<void>;
  isConnected(): boolean;
}

/**
 * MCP Server configuration
 */
export interface MCPServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  cwd?: string;
  enabled: boolean;
  timeout?: number;
  retries?: number;
  capabilities?: MCPServerCapabilities;
}

/**
 * MCP Client configuration
 */
export interface MCPClientConfig {
  name: string;
  version: string;
  capabilities: MCPClientCapabilities;
  timeout?: number;
  retries?: number;
  logLevel?: "debug" | "info" | "warn" | "error";
}

/**
 * MCP Connection state
 */
export enum MCPConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  INITIALIZING = "initializing",
  READY = "ready",
  ERROR = "error",
}

/**
 * MCP Event types
 */
export type MCPEvent =
  | { type: "connection_state_changed"; state: MCPConnectionState; error?: Error }
  | { type: "tools_list_changed"; tools: MCPTool[] }
  | { type: "resources_list_changed"; resources: MCPResource[] }
  | { type: "prompts_list_changed"; prompts: MCPPrompt[] }
  | { type: "notification_received"; notification: MCPNotification }
  | { type: "error"; error: MCPError };

/**
 * MCP Event listener
 */
export type MCPEventListener = (event: MCPEvent) => void;

/**
 * MCP Statistics
 */
export interface MCPStatistics {
  requestsSent: number;
  responsesReceived: number;
  notificationsSent: number;
  notificationsReceived: number;
  errors: number;
  averageLatency: number;
  connectionUptime: number;
  lastActivity: number;
}

/**
 * Type guards
 */
export function isMCPRequest(obj: any): obj is MCPRequest {
  return (
    obj &&
    obj.jsonrpc === "2.0" &&
    (typeof obj.id === "string" || typeof obj.id === "number") &&
    typeof obj.method === "string"
  );
}

export function isMCPResponse(obj: any): obj is MCPResponse {
  return (
    obj &&
    obj.jsonrpc === "2.0" &&
    (typeof obj.id === "string" || typeof obj.id === "number") &&
    ("result" in obj || "error" in obj)
  );
}

export function isMCPNotification(obj: any): obj is MCPNotification {
  return obj && obj.jsonrpc === "2.0" && typeof obj.method === "string" && !("id" in obj);
}

export function isMCPError(obj: any): obj is MCPError {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.code === "number" &&
    typeof obj.message === "string"
  );
}

export function isMCPTool(obj: any): obj is MCPTool {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.name === "string" &&
    typeof obj.description === "string" &&
    obj.inputSchema &&
    obj.inputSchema.type === "object"
  );
}

/**
 * Utility functions
 */
export function createMCPError(code: MCPErrorCode, message: string, data?: any): MCPError {
  return { code, message, data };
}

export function createMCPRequest(method: string, params?: any, id?: string | number): MCPRequest {
  return {
    jsonrpc: "2.0",
    id: id ?? Date.now(),
    method,
    ...(params && { params }),
  };
}

export function createMCPResponse(
  id: string | number,
  result?: any,
  error?: MCPError
): MCPResponse {
  return {
    jsonrpc: "2.0",
    id,
    ...(error ? { error } : { result }),
  };
}

export function createMCPNotification(method: string, params?: any): MCPNotification {
  return {
    jsonrpc: "2.0",
    method,
    ...(params && { params }),
  };
}
