/**
 * MCP (Model Context Protocol) Server implementation for LlamaCLI
 * Provides built-in tool registration and execution capabilities
 */

import {
  MCPRequest,
  MCPResponse,
  MCPNotification,
  MCPError,
  MCPErrorCode,
  MCPTool,
  MCPResource,
  MCPServerCapabilities,
  MCPToolCallParams,
  MCPToolCallResult,
  MCPResourceReadParams,
  MCPResourceReadResult,
  createMCPResponse,
  createMCPError,
} from '../types/mcp.js';

/**
 * Tool handler function type
 */
export type ToolHandler = (params: any) => Promise<MCPToolCallResult>;

/**
 * Resource handler function type
 */
export type ResourceHandler = (params: MCPResourceReadParams) => Promise<MCPResourceReadResult>;

/**
 * Server configuration
 */
export interface MCPServerConfig {
  name: string;
  version: string;
  maxConcurrentRequests?: number;
  requestTimeout?: number;
  enableLogging?: boolean;
}

/**
 * Built-in MCP Server implementation
 */
export class BuiltinMCPServer {
  private tools: Map<string, { handler: ToolHandler; definition: MCPTool }> = new Map();
  private resources: Map<string, { handler: ResourceHandler; definition: MCPResource }> = new Map();
  private capabilities: MCPServerCapabilities;
  private config: MCPServerConfig;
  private isRunning = false;
  private activeRequests = 0;
  private requestQueue: Array<{ request: MCPRequest; resolve: (response: MCPResponse) => void }> = [];

  constructor(config: MCPServerConfig) {
    this.config = {
      maxConcurrentRequests: 10,
      requestTimeout: 30000,
      enableLogging: true,
      ...config,
    };

    this.capabilities = {
      tools: {
        listChanged: true,
      },
      resources: {
        subscribe: false,
        listChanged: true,
      },
      logging: {
        level: 'info',
      },
    };
  }

  /**
   * Register a tool with the server
   */
  registerTool(name: string, definition: MCPTool, handler: ToolHandler): void {
    if (this.tools.has(name)) {
      throw new Error(`Tool '${name}' is already registered`);
    }

    this.tools.set(name, { handler, definition });
    this.log('info', `Tool '${name}' registered successfully`);
  }

  /**
   * Register a resource with the server
   */
  registerResource(uri: string, definition: MCPResource, handler: ResourceHandler): void {
    if (this.resources.has(uri)) {
      throw new Error(`Resource '${uri}' is already registered`);
    }

    this.resources.set(uri, { handler, definition });
    this.log('info', `Resource '${uri}' registered successfully`);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): boolean {
    const result = this.tools.delete(name);
    if (result) {
      this.log('info', `Tool '${name}' unregistered`);
    }
    return result;
  }

  /**
   * Unregister a resource
   */
  unregisterResource(uri: string): boolean {
    const result = this.resources.delete(uri);
    if (result) {
      this.log('info', `Resource '${uri}' unregistered`);
    }
    return result;
  }

  /**
   * Get all registered tools
   */
  getTools(): MCPTool[] {
    return Array.from(this.tools.values()).map(({ definition }) => definition);
  }

  /**
   * Get all registered resources
   */
  getResources(): MCPResource[] {
    return Array.from(this.resources.values()).map(({ definition }) => definition);
  }

  /**
   * Handle incoming MCP request
   */
  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    if (!this.isRunning) {
      return this.createErrorResponse(request.id, MCPErrorCode.INTERNAL_ERROR, 'Server is not running');
    }

    if (!this.validateRequest(request)) {
      return this.createErrorResponse(request.id, MCPErrorCode.INVALID_REQUEST, 'Invalid request format');
    }

    // Check concurrent request limit
    if (this.activeRequests >= this.config.maxConcurrentRequests!) {
      return new Promise((resolve) => {
        this.requestQueue.push({ request, resolve });
      });
    }

    return this.processRequest(request);
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    this.isRunning = true;
    this.log('info', `MCP Server '${this.config.name}' started`);
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    // Wait for active requests to complete
    while (this.activeRequests > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Clear request queue
    this.requestQueue.forEach(({ request, resolve }) => {
      resolve(this.createErrorResponse(request.id, MCPErrorCode.INTERNAL_ERROR, 'Server is shutting down'));
    });
    this.requestQueue = [];

    this.log('info', `MCP Server '${this.config.name}' stopped`);
  }

  /**
   * Get server capabilities
   */
  getCapabilities(): MCPServerCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Get server info
   */
  getServerInfo() {
    return {
      name: this.config.name,
      version: this.config.version,
    };
  }

  /**
   * Process a request with timeout and error handling
   */
  private async processRequest(request: MCPRequest): Promise<MCPResponse> {
    this.activeRequests++;

    try {
      const timeoutPromise = new Promise<MCPResponse>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timeout'));
        }, this.config.requestTimeout);
      });

      const requestPromise = this.executeRequest(request);
      const response = await Promise.race([requestPromise, timeoutPromise]);
      
      return response;
    } catch (error) {
      this.log('error', `Request processing failed: ${error}`);
      return this.handleError(error as Error, request.id);
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  /**
   * Execute the actual request
   */
  private async executeRequest(request: MCPRequest): Promise<MCPResponse> {
    switch (request.method) {
      case 'initialize':
        return this.handleInitialize(request);
      case 'tools/list':
        return this.handleToolsList(request);
      case 'tools/call':
        return this.handleToolCall(request);
      case 'resources/list':
        return this.handleResourcesList(request);
      case 'resources/read':
        return this.handleResourceRead(request);
      default:
        return this.createErrorResponse(request.id, MCPErrorCode.METHOD_NOT_FOUND, `Method '${request.method}' not found`);
    }
  }

  /**
   * Handle initialize request
   */
  private handleInitialize(request: MCPRequest): MCPResponse {
    return createMCPResponse(request.id, {
      protocolVersion: '2024-11-05',
      capabilities: this.capabilities,
      serverInfo: this.getServerInfo(),
    });
  }

  /**
   * Handle tools list request
   */
  private handleToolsList(request: MCPRequest): MCPResponse {
    return createMCPResponse(request.id, {
      tools: this.getTools(),
    });
  }

  /**
   * Handle tool call request
   */
  private async handleToolCall(request: MCPRequest): Promise<MCPResponse> {
    const params = request.params as MCPToolCallParams;
    
    if (!params || !params.name) {
      return this.createErrorResponse(request.id, MCPErrorCode.INVALID_PARAMS, 'Tool name is required');
    }

    const tool = this.tools.get(params.name);
    if (!tool) {
      return this.createErrorResponse(request.id, MCPErrorCode.TOOL_NOT_FOUND, `Tool '${params.name}' not found`);
    }

    try {
      const result = await tool.handler(params.arguments || {});
      return createMCPResponse(request.id, result);
    } catch (error) {
      this.log('error', `Tool '${params.name}' execution failed: ${error}`);
      return this.createErrorResponse(request.id, MCPErrorCode.TOOL_EXECUTION_ERROR, `Tool execution failed: ${error}`);
    }
  }

  /**
   * Handle resources list request
   */
  private handleResourcesList(request: MCPRequest): MCPResponse {
    return createMCPResponse(request.id, {
      resources: this.getResources(),
    });
  }

  /**
   * Handle resource read request
   */
  private async handleResourceRead(request: MCPRequest): Promise<MCPResponse> {
    const params = request.params as MCPResourceReadParams;
    
    if (!params || !params.uri) {
      return this.createErrorResponse(request.id, MCPErrorCode.INVALID_PARAMS, 'Resource URI is required');
    }

    const resource = this.resources.get(params.uri);
    if (!resource) {
      return this.createErrorResponse(request.id, MCPErrorCode.RESOURCE_NOT_FOUND, `Resource '${params.uri}' not found`);
    }

    try {
      const result = await resource.handler(params);
      return createMCPResponse(request.id, result);
    } catch (error) {
      this.log('error', `Resource '${params.uri}' read failed: ${error}`);
      return this.createErrorResponse(request.id, MCPErrorCode.RESOURCE_ACCESS_DENIED, `Resource access failed: ${error}`);
    }
  }

  /**
   * Process queued requests
   */
  private processQueue(): void {
    if (this.requestQueue.length > 0 && this.activeRequests < this.config.maxConcurrentRequests!) {
      const { request, resolve } = this.requestQueue.shift()!;
      this.processRequest(request).then(resolve);
    }
  }

  /**
   * Validate request format
   */
  private validateRequest(request: MCPRequest): boolean {
    return (
      request &&
      request.jsonrpc === '2.0' &&
      typeof request.method === 'string' &&
      (request.id !== undefined && request.id !== null)
    );
  }

  /**
   * Handle errors and create error response
   */
  private handleError(error: Error, requestId: string | number): MCPResponse {
    if (error.message.includes('timeout')) {
      return this.createErrorResponse(requestId, MCPErrorCode.TIMEOUT_ERROR, 'Request timeout');
    }
    
    return this.createErrorResponse(requestId, MCPErrorCode.INTERNAL_ERROR, error.message);
  }

  /**
   * Create error response
   */
  private createErrorResponse(id: string | number, code: MCPErrorCode, message: string): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: createMCPError(code, message),
    };
  }

  /**
   * Log messages
   */
  private log(level: 'debug' | 'info' | 'warning' | 'error', message: string): void {
    if (!this.config.enableLogging) {
      return;
    }

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] [MCP-Server] ${message}`);
  }
}

/**
 * Create a new MCP server instance
 */
export function createMCPServer(config: MCPServerConfig): BuiltinMCPServer {
  return new BuiltinMCPServer(config);
}