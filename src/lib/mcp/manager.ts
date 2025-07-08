// src/lib/mcp/manager.ts
// MCP Server Manager for handling multiple MCP connections

import { EventEmitter } from 'events';
import { McpClient } from './client';
import {
  McpServerConfig,
  McpTool,
  McpResource,
  McpPrompt,
  CallToolRequest,
  CallToolResult,
  McpConnectionStatus
} from './types';

export interface McpServerEntry {
  id: string;
  name: string;
  config: McpServerConfig;
  client: McpClient;
  status: McpConnectionStatus;
  lastError?: string;
}

export class McpManager extends EventEmitter {
  private servers = new Map<string, McpServerEntry>();
  private isInitialized = false;

  constructor() {
    super();
  }

  /**
   * Initialize the MCP manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;
    console.log('MCP Manager initialized');
  }

  /**
   * Add a new MCP server
   */
  public async addServer(id: string, name: string, config: McpServerConfig): Promise<void> {
    if (this.servers.has(id)) {
      throw new Error(`MCP server with id "${id}" already exists`);
    }

    const client = new McpClient(config, name, process.env.DEBUG_MCP === 'true');
    const serverEntry: McpServerEntry = {
      id,
      name,
      config,
      client,
      status: 'disconnected'
    };

    // Set up event listeners
    client.on('connection-status', (status) => {
      serverEntry.status = status;
      this.emit('server-status-changed', { id, status });
    });

    client.on('error', (error) => {
      serverEntry.lastError = error.message;
      this.emit('server-error', { id, error });
    });

    this.servers.set(id, serverEntry);
    this.emit('server-added', { id, name });
  }

  /**
   * Remove an MCP server
   */
  public async removeServer(id: string): Promise<void> {
    const server = this.servers.get(id);
    if (!server) {
      throw new Error(`MCP server with id "${id}" not found`);
    }

    await server.client.disconnect();
    this.servers.delete(id);
    this.emit('server-removed', { id });
  }

  /**
   * Connect to a specific server
   */
  public async connectServer(id: string): Promise<void> {
    const server = this.servers.get(id);
    if (!server) {
      throw new Error(`MCP server with id "${id}" not found`);
    }

    await server.client.connect();
  }

  /**
   * Disconnect from a specific server
   */
  public async disconnectServer(id: string): Promise<void> {
    const server = this.servers.get(id);
    if (!server) {
      throw new Error(`MCP server with id "${id}" not found`);
    }

    await server.client.disconnect();
  }

  /**
   * Connect to all servers
   */
  public async connectAll(): Promise<void> {
    const promises = Array.from(this.servers.values()).map(server => 
      server.client.connect().catch(error => {
        console.error(`Failed to connect to MCP server ${server.id}:`, error);
      })
    );

    await Promise.all(promises);
  }

  /**
   * Disconnect from all servers
   */
  public async disconnectAll(): Promise<void> {
    const promises = Array.from(this.servers.values()).map(server => 
      server.client.disconnect()
    );

    await Promise.all(promises);
  }

  /**
   * Get all servers
   */
  public getServers(): McpServerEntry[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get a specific server
   */
  public getServer(id: string): McpServerEntry | undefined {
    return this.servers.get(id);
  }

  /**
   * Get all available tools from all connected servers
   */
  public async getAllTools(): Promise<Array<McpTool & { serverId: string; serverName: string }>> {
    const allTools: Array<McpTool & { serverId: string; serverName: string }> = [];

    for (const server of this.servers.values()) {
      if (server.client.isConnected()) {
        try {
          const tools = await server.client.listTools();
          tools.forEach(tool => {
            allTools.push({
              ...tool,
              serverId: server.id,
              serverName: server.name
            });
          });
        } catch (error) {
          console.error(`Failed to get tools from server ${server.id}:`, error);
        }
      }
    }

    return allTools;
  }

  /**
   * Get all available resources from all connected servers
   */
  public async getAllResources(): Promise<Array<McpResource & { serverId: string; serverName: string }>> {
    const allResources: Array<McpResource & { serverId: string; serverName: string }> = [];

    for (const server of this.servers.values()) {
      if (server.client.isConnected()) {
        try {
          const resources = await server.client.listResources();
          resources.forEach(resource => {
            allResources.push({
              ...resource,
              serverId: server.id,
              serverName: server.name
            });
          });
        } catch (error) {
          console.error(`Failed to get resources from server ${server.id}:`, error);
        }
      }
    }

    return allResources;
  }

  /**
   * Get all available prompts from all connected servers
   */
  public async getAllPrompts(): Promise<Array<McpPrompt & { serverId: string; serverName: string }>> {
    const allPrompts: Array<McpPrompt & { serverId: string; serverName: string }> = [];

    for (const server of this.servers.values()) {
      if (server.client.isConnected()) {
        try {
          const prompts = await server.client.listPrompts();
          prompts.forEach(prompt => {
            allPrompts.push({
              ...prompt,
              serverId: server.id,
              serverName: server.name
            });
          });
        } catch (error) {
          console.error(`Failed to get prompts from server ${server.id}:`, error);
        }
      }
    }

    return allPrompts;
  }

  /**
   * Call a tool on a specific server
   */
  public async callTool(serverId: string, request: CallToolRequest): Promise<CallToolResult> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`MCP server with id "${serverId}" not found`);
    }

    if (!server.client.isConnected()) {
      throw new Error(`MCP server "${serverId}" is not connected`);
    }

    return await server.client.callTool(request);
  }

  /**
   * Find and call a tool by name (searches all servers)
   */
  public async callToolByName(toolName: string, args?: Record<string, any>): Promise<CallToolResult> {
    const allTools = await this.getAllTools();
    const tool = allTools.find(t => t.name === toolName);

    if (!tool) {
      throw new Error(`Tool "${toolName}" not found in any connected MCP server`);
    }

    return await this.callTool(tool.serverId, {
      name: toolName,
      arguments: args
    });
  }

  /**
   * Read a resource from a specific server
   */
  public async readResource(serverId: string, uri: string): Promise<any> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`MCP server with id "${serverId}" not found`);
    }

    if (!server.client.isConnected()) {
      throw new Error(`MCP server "${serverId}" is not connected`);
    }

    return await server.client.readResource(uri);
  }

  /**
   * Get a prompt from a specific server
   */
  public async getPrompt(serverId: string, name: string, args?: Record<string, any>): Promise<any> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`MCP server with id "${serverId}" not found`);
    }

    if (!server.client.isConnected()) {
      throw new Error(`MCP server "${serverId}" is not connected`);
    }

    return await server.client.getPrompt(name, args);
  }

  /**
   * Get connection status summary
   */
  public getConnectionSummary(): {
    total: number;
    connected: number;
    connecting: number;
    disconnected: number;
    error: number;
  } {
    const summary = {
      total: this.servers.size,
      connected: 0,
      connecting: 0,
      disconnected: 0,
      error: 0
    };

    for (const server of this.servers.values()) {
      summary[server.status]++;
    }

    return summary;
  }
}
