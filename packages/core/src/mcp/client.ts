/**
 * MCP (Model Context Protocol) Client implementation for LlamaCLI
 */

import {
  MCPRequest,
  MCPResponse,
  MCPNotification,
  MCPError,
  MCPErrorCode,
  MCPTool,
  MCPResource,
  MCPPrompt,
  MCPInitializeParams,
  MCPInitializeResult,
  MCPToolCallParams,
  MCPToolCallResult,
  MCPResourceReadParams,
  MCPResourceReadResult,
  MCPPromptGetParams,
  MCPPromptGetResult,
  MCPTransport,
  MCPClientConfig,
  MCPConnectionState,
  MCPEvent,
  MCPEventListener,
  MCPStatistics,
  createMCPRequest,
  createMCPResponse,
  createMCPNotification,
  createMCPError,
  isMCPResponse,
  isMCPNotification,
} from '../types/mcp.js';

/**
 * MCP Client implementation
 */
export class MCPClient {
  private config: MCPClientConfig;
  private transport: MCPTransport | null = null;
  private connectionState: MCPConnectionState = MCPConnectionState.DISCONNECTED;
  private eventListeners: Set<MCPEventListener> = new Set();
  private pendingRequests: Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private requestId = 0;
  private statistics: MCPStatistics;
  private serverCapabilities: any = null;
  private availableTools: MCPTool[] = [];
  private availableResources: MCPResource[] = [];
  private availablePrompts: MCPPrompt[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;

  constructor(config: MCPClientConfig) {
    this.config = config;
    this.statistics = {
      requestsSent: 0,
      responsesReceived: 0,
      notificationsSent: 0,
      notificationsReceived: 0,
      errors: 0,
      averageLatency: 0,
      connectionUptime: 0,
      lastActivity: Date.now(),
    };
  }

  /**
   * Connect to MCP server
   */
  async connect(transport: MCPTransport): Promise<void> {
    if (this.connectionState !== MCPConnectionState.DISCONNECTED) {
      throw new Error('Client is already connected or connecting');
    }

    this.transport = transport;
    this.setConnectionState(MCPConnectionState.CONNECTING);

    try {
      // Start listening for messages
      this.startMessageListener();

      // Initialize the connection
      await this.initialize();

      // Load available tools, resources, and prompts
      await this.loadCapabilities();

      this.setConnectionState(MCPConnectionState.READY);
      this.reconnectAttempts = 0;
    } catch (error) {
      this.setConnectionState(MCPConnectionState.ERROR);
      throw error;
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Cancel all pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();

    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }

    this.setConnectionState(MCPConnectionState.DISCONNECTED);
  }

  /**
   * Get connection state
   */
  getConnectionState(): MCPConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === MCPConnectionState.READY;
  }

  /**
   * Add event listener
   */
  addEventListener(listener: MCPEventListener): void {
    this.eventListeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: MCPEventListener): void {
    this.eventListeners.delete(listener);
  }

  /**
   * Get statistics
   */
  getStatistics(): MCPStatistics {
    return { ...this.statistics };
  }

  /**
   * Get available tools
   */
  getTools(): MCPTool[] {
    return [...this.availableTools];
  }

  /**
   * Get available resources
   */
  getResources(): MCPResource[] {
    return [...this.availableResources];
  }

  /**
   * Get available prompts
   */
  getPrompts(): MCPPrompt[] {
    return [...this.availablePrompts];
  }

  /**
   * Call a tool
   */
  async callTool(name: string, arguments_?: Record<string, any>): Promise<MCPToolCallResult> {
    this.ensureConnected();

    const params: MCPToolCallParams = {
      name,
      ...(arguments_ && { arguments: arguments_ }),
    };

    return this.sendRequest('tools/call', params);
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<MCPResourceReadResult> {
    this.ensureConnected();

    const params: MCPResourceReadParams = { uri };
    return this.sendRequest('resources/read', params);
  }

  /**
   * Get a prompt
   */
  async getPrompt(name: string, arguments_?: Record<string, any>): Promise<MCPPromptGetResult> {
    this.ensureConnected();

    const params: MCPPromptGetParams = {
      name,
      ...(arguments_ && { arguments: arguments_ }),
    };

    return this.sendRequest('prompts/get', params);
  }

  /**
   * List tools
   */
  async listTools(): Promise<MCPTool[]> {
    this.ensureConnected();
    const response = await this.sendRequest('tools/list');
    this.availableTools = response.tools || [];
    this.emitEvent({ type: 'tools_list_changed', tools: this.availableTools });
    return this.availableTools;
  }

  /**
   * List resources
   */
  async listResources(): Promise<MCPResource[]> {
    this.ensureConnected();
    const response = await this.sendRequest('resources/list');
    this.availableResources = response.resources || [];
    this.emitEvent({ type: 'resources_list_changed', resources: this.availableResources });
    return this.availableResources;
  }

  /**
   * List prompts
   */
  async listPrompts(): Promise<MCPPrompt[]> {
    this.ensureConnected();
    const response = await this.sendRequest('prompts/list');
    this.availablePrompts = response.prompts || [];
    this.emitEvent({ type: 'prompts_list_changed', prompts: this.availablePrompts });
    return this.availablePrompts;
  }

  /**
   * Send a request and wait for response
   */
  private async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.transport) {
      throw new Error('Not connected to MCP server');
    }

    const id = ++this.requestId;
    const request = createMCPRequest(method, params, id);
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        this.statistics.errors++;
        reject(new Error(`Request timeout: ${method}`));
      }, this.config.timeout || 30000);

      this.pendingRequests.set(id, {
        resolve: (result) => {
          clearTimeout(timeout);
          const latency = Date.now() - startTime;
          this.updateLatencyStats(latency);
          this.statistics.responsesReceived++;
          this.statistics.lastActivity = Date.now();
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          this.statistics.errors++;
          this.statistics.lastActivity = Date.now();
          reject(error);
        },
        timeout,
      });

      this.transport!.send(request).catch(reject);
      this.statistics.requestsSent++;
    });
  }

  /**
   * Send a notification (no response expected)
   */
  private async sendNotification(method: string, params?: any): Promise<void> {
    if (!this.transport) {
      throw new Error('Not connected to MCP server');
    }

    const notification = createMCPNotification(method, params);
    await this.transport.send(notification);
    this.statistics.notificationsSent++;
    this.statistics.lastActivity = Date.now();
  }

  /**
   * Initialize the MCP connection
   */
  private async initialize(): Promise<void> {
    this.setConnectionState(MCPConnectionState.INITIALIZING);

    const params: MCPInitializeParams = {
      protocolVersion: '2024-11-05',
      capabilities: this.config.capabilities,
      clientInfo: {
        name: this.config.name,
        version: this.config.version,
      },
    };

    try {
      const result: MCPInitializeResult = await this.sendRequest('initialize', params);
      this.serverCapabilities = result.capabilities;
      
      // Send initialized notification
      await this.sendNotification('notifications/initialized');
      
      this.setConnectionState(MCPConnectionState.CONNECTED);
    } catch (error) {
      throw new Error(`Failed to initialize MCP connection: ${error}`);
    }
  }

  /**
   * Load server capabilities
   */
  private async loadCapabilities(): Promise<void> {
    try {
      // Load tools if supported
      if (this.serverCapabilities?.tools) {
        await this.listTools();
      }

      // Load resources if supported
      if (this.serverCapabilities?.resources) {
        await this.listResources();
      }

      // Load prompts if supported
      if (this.serverCapabilities?.prompts) {
        await this.listPrompts();
      }
    } catch (error) {
      console.warn('Failed to load some server capabilities:', error);
    }
  }

  /**
   * Start listening for messages from the server
   */
  private async startMessageListener(): Promise<void> {
    if (!this.transport) return;

    try {
      for await (const message of this.transport.receive()) {
        await this.handleMessage(message);
      }
    } catch (error) {
      if (this.connectionState !== MCPConnectionState.DISCONNECTED) {
        this.handleConnectionError(error as Error);
      }
    }
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(message: any): Promise<void> {
    try {
      if (isMCPResponse(message)) {
        this.handleResponse(message);
      } else if (isMCPNotification(message)) {
        this.handleNotification(message);
      } else {
        console.warn('Unknown message type:', message);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  /**
   * Handle response message
   */
  private handleResponse(response: MCPResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) {
      console.warn('Received response for unknown request:', response.id);
      return;
    }

    this.pendingRequests.delete(response.id);

    if (response.error) {
      const error = new Error(response.error.message);
      (error as any).code = response.error.code;
      (error as any).data = response.error.data;
      pending.reject(error);
    } else {
      pending.resolve(response.result);
    }
  }

  /**
   * Handle notification message
   */
  private handleNotification(notification: MCPNotification): void {
    this.statistics.notificationsReceived++;
    this.statistics.lastActivity = Date.now();

    // Handle specific notifications
    switch (notification.method) {
      case 'notifications/tools/list_changed':
        this.listTools().catch(console.error);
        break;
      case 'notifications/resources/list_changed':
        this.listResources().catch(console.error);
        break;
      case 'notifications/prompts/list_changed':
        this.listPrompts().catch(console.error);
        break;
      default:
        // Emit generic notification event
        this.emitEvent({ type: 'notification_received', notification });
    }
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(error: Error): void {
    console.error('MCP connection error:', error);
    this.setConnectionState(MCPConnectionState.ERROR);
    
    // Attempt to reconnect if configured
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      try {
        if (this.transport) {
          await this.transport.close();
        }
        // Note: Actual reconnection would need to be handled by the caller
        // as they need to provide a new transport instance
      } catch (error) {
        console.error('Reconnection failed:', error);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      }
    }, this.reconnectInterval);
  }

  /**
   * Set connection state and emit event
   */
  private setConnectionState(state: MCPConnectionState, error?: Error): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emitEvent({ type: 'connection_state_changed', state, error });
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: MCPEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in MCP event listener:', error);
      }
    }
  }

  /**
   * Update latency statistics
   */
  private updateLatencyStats(latency: number): void {
    const count = this.statistics.responsesReceived;
    this.statistics.averageLatency = (
      (this.statistics.averageLatency * (count - 1) + latency) / count
    );
  }

  /**
   * Ensure client is connected
   */
  private ensureConnected(): void {
    if (!this.isConnected()) {
      throw new Error('MCP client is not connected');
    }
  }
}

/**
 * MCP Transport implementation for stdio
 */
export class StdioTransport implements MCPTransport {
  private process: any;
  private connected = false;

  constructor(command: string, args: string[] = [], options: any = {}) {
    // This would typically use child_process.spawn in Node.js
    // For now, this is a placeholder implementation
    console.warn('StdioTransport is not fully implemented');
  }

  async send(message: MCPRequest | MCPResponse | MCPNotification): Promise<void> {
    if (!this.connected) {
      throw new Error('Transport not connected');
    }
    
    // Send message to process stdin
    const messageStr = JSON.stringify(message) + '\n';
    // this.process.stdin.write(messageStr);
  }

  async *receive(): AsyncIterable<MCPRequest | MCPResponse | MCPNotification> {
    // Read messages from process stdout
    // This would typically use readline or similar
    while (this.connected) {
      // Yield parsed messages
      yield* [];
    }
  }

  async close(): Promise<void> {
    this.connected = false;
    // Close process if running
  }

  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Create MCP client with default configuration
 */
export function createMCPClient(config: Partial<MCPClientConfig> = {}): MCPClient {
  const defaultConfig: MCPClientConfig = {
    name: 'LlamaCLI',
    version: '1.0.0',
    capabilities: {
      roots: {
        listChanged: true,
      },
      sampling: {
        maxTokens: 4096,
        temperature: 0.7,
        topP: 0.9,
      },
    },
    timeout: 30000,
    retries: 3,
    logLevel: 'info',
  };

  return new MCPClient({ ...defaultConfig, ...config });
}

/**
 * Utility function to create MCP error
 */
export function createMCPClientError(code: MCPErrorCode, message: string, data?: any): MCPError {
  return createMCPError(code, message, data);
}