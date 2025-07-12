// src/lib/mcp/unified-manager.ts
// Unified MCP Manager that handles both built-in and external MCP servers

import { EventEmitter } from "events";
import { McpClient } from "./client.js";
import { BuiltinMcpServer } from "./builtin-server.js";
import { ToolDefinition } from "../../types/context.js";
import {
  McpServerConfig,
  McpTool,
  CallToolRequest,
  CallToolResult,
  McpConnectionStatus,
} from "./types.js";

export interface McpServerEntry {
  id: string;
  name: string;
  config?: McpServerConfig; // Optional for built-in server
  client?: McpClient; // Optional for built-in server
  status: McpConnectionStatus;
  lastError?: string;
  isBuiltin: boolean;
}

/**
 * Unified MCP Manager that treats all tools equally through MCP protocol
 * Manages both built-in tools (as internal MCP server) and external MCP servers
 */
export class UnifiedMcpManager extends EventEmitter {
  private servers = new Map<string, McpServerEntry>();
  private builtinServer: BuiltinMcpServer;
  private isInitialized = false;

  constructor() {
    super();
    this.builtinServer = new BuiltinMcpServer();

    // Register the built-in server
    this.servers.set("builtin", {
      id: "builtin",
      name: "Built-in Tools",
      status: "connected",
      isBuiltin: true,
    });
  }

  /**
   * Initialize the unified MCP manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Verify built-in server is healthy
    const isHealthy = await this.builtinServer.isHealthy();
    if (!isHealthy) {
      throw new Error("Built-in MCP server failed health check");
    }

    this.isInitialized = true;
    console.log("Unified MCP Manager initialized with built-in server");
  }

  /**
   * Add an external MCP server
   */
  public async addExternalServer(id: string, name: string, config: McpServerConfig): Promise<void> {
    if (this.servers.has(id)) {
      throw new Error(`MCP server with id "${id}" already exists`);
    }

    const client = new McpClient(config, name, process.env.DEBUG_MCP === "true");
    const serverEntry: McpServerEntry = {
      id,
      name,
      config,
      client,
      status: "disconnected",
      isBuiltin: false,
    };

    // Set up event listeners
    client.on("connection-status", (status) => {
      serverEntry.status = status;
      this.emit("server-status-changed", { id, status });
    });

    client.on("error", (error) => {
      serverEntry.lastError = error.message;
      this.emit("server-error", { id, error });
    });

    this.servers.set(id, serverEntry);
    this.emit("server-added", { id, name });
  }

  /**
   * Remove a server (cannot remove built-in server)
   */
  public async removeServer(id: string): Promise<void> {
    if (id === "builtin") {
      throw new Error("Cannot remove built-in server");
    }

    const server = this.servers.get(id);
    if (!server) {
      throw new Error(`MCP server with id "${id}" not found`);
    }

    if (server.client) {
      await server.client.disconnect();
    }

    this.servers.delete(id);
    this.emit("server-removed", { id });
  }

  /**
   * Connect to an external server
   */
  public async connectServer(id: string): Promise<void> {
    if (id === "builtin") {
      return; // Built-in server is always connected
    }

    const server = this.servers.get(id);
    if (!server) {
      throw new Error(`MCP server with id "${id}" not found`);
    }

    if (!server.client) {
      throw new Error(`Server ${id} has no client`);
    }

    await server.client.connect();
  }

  /**
   * Call a tool on any server (unified interface)
   */
  public async callTool(toolName: string, args: any): Promise<any> {
    // First try built-in server
    if (this.builtinServer.hasTool(toolName)) {
      const result = await this.builtinServer.handleToolCall({
        name: toolName,
        arguments: args,
      });

      if (result.isError) {
        const errorMessage = result.content?.[0]?.text || "Unknown error";
        throw new Error(errorMessage);
      }

      return result.content?.[0]?.text || "";
    }

    // Then try external servers
    for (const [serverId, server] of this.servers) {
      if (server.isBuiltin || !server.client) continue;

      try {
        const tools = await server.client.listTools();
        if (tools.some((tool) => tool.name === toolName)) {
          const result = await server.client.callTool({ name: toolName, arguments: args });

          if (result.isError) {
            const errorMessage = result.content?.[0]?.text || "Unknown error";
            throw new Error(errorMessage);
          }

          return result.content?.[0]?.text || "";
        }
      } catch (error) {
        console.warn(`Failed to call tool ${toolName} on server ${serverId}:`, error);
        continue;
      }
    }

    throw new Error(`Tool ${toolName} not found in any MCP server`);
  }

  /**
   * Get all available tools from all servers
   */
  public async getAllTools(): Promise<ToolDefinition[]> {
    const tools: ToolDefinition[] = [];

    // Add built-in tools
    const builtinTools = this.builtinServer.listTools();
    tools.push(
      ...builtinTools.map((tool) =>
        this.convertMcpToolToDefinition(tool, "builtin", "Built-in Tools")
      )
    );

    // Add external tools
    for (const [serverId, server] of this.servers) {
      if (server.isBuiltin || !server.client) continue;

      try {
        if (server.status === "connected") {
          const serverTools = await server.client.listTools();
          tools.push(
            ...serverTools.map((tool) =>
              this.convertMcpToolToDefinition(tool, serverId, server.name)
            )
          );
        }
      } catch (error) {
        console.warn(`Failed to get tools from server ${serverId}:`, error);
      }
    }

    return tools;
  }

  /**
   * Convert MCP tool to ToolDefinition format
   */
  private convertMcpToolToDefinition(
    mcpTool: McpTool,
    serverId: string,
    serverName: string
  ): ToolDefinition {
    return {
      type: "mcp",
      name: mcpTool.name,
      description: `[${serverName}] ${mcpTool.description || mcpTool.name}`,
      parameters: mcpTool.inputSchema,
      invoke: async (args: any) => {
        return await this.callTool(mcpTool.name, args);
      },
    };
  }

  /**
   * Get server information
   */
  public getServers(): McpServerEntry[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get server by ID
   */
  public getServer(id: string): McpServerEntry | undefined {
    return this.servers.get(id);
  }

  /**
   * Get connection summary
   */
  public getConnectionSummary(): string {
    const servers = Array.from(this.servers.values());
    const connected = servers.filter((s) => s.status === "connected").length;
    const total = servers.length;

    const lines = [`MCP Servers: ${connected}/${total} connected`];

    servers.forEach((server) => {
      const statusIcon = this.getStatusIcon(server.status);
      lines.push(`  ${statusIcon} ${server.name} (${server.id})`);
      if (server.lastError) {
        lines.push(`    Error: ${server.lastError}`);
      }
    });

    return lines.join("\n");
  }

  /**
   * Get status icon for display
   */
  private getStatusIcon(status: McpConnectionStatus): string {
    switch (status) {
      case "connected":
        return "🟢";
      case "connecting":
        return "🟡";
      case "disconnected":
        return "⚪";
      case "error":
        return "🔴";
      default:
        return "❓";
    }
  }

  /**
   * Get built-in server info
   */
  public getBuiltinServerInfo() {
    return this.builtinServer.getServerInfo();
  }

  /**
   * Health check for all servers
   */
  public async healthCheck(): Promise<{ [serverId: string]: boolean }> {
    const results: { [serverId: string]: boolean } = {};

    // Check built-in server
    results["builtin"] = await this.builtinServer.isHealthy();

    // Check external servers
    for (const [serverId, server] of this.servers) {
      if (server.isBuiltin) continue;

      try {
        if (server.client && server.status === "connected") {
          await server.client.listTools();
          results[serverId] = true;
        } else {
          results[serverId] = false;
        }
      } catch (error) {
        results[serverId] = false;
      }
    }

    return results;
  }
}
