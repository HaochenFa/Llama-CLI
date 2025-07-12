// src/lib/mcp/tool-adapter.ts
// Adapter to integrate MCP tools with the existing tool system

import { ToolDefinition } from "../../types/context";
import { McpManager } from "./manager";
import { McpTool, CallToolResult } from "./types";

export class McpToolAdapter {
  private mcpManager: McpManager;

  constructor(mcpManager: McpManager) {
    this.mcpManager = mcpManager;
  }

  /**
   * Convert MCP tools to ToolDefinition format
   */
  public async getToolDefinitions(): Promise<ToolDefinition[]> {
    try {
      const mcpTools = await this.mcpManager.getAllTools();
      return mcpTools.map((tool) => this.convertMcpToolToDefinition(tool));
    } catch (error) {
      console.error("Failed to get MCP tools:", error);
      return [];
    }
  }

  /**
   * Convert a single MCP tool to ToolDefinition
   */
  private convertMcpToolToDefinition(
    mcpTool: McpTool & { serverId: string; serverName: string }
  ): ToolDefinition {
    return {
      type: "mcp",
      name: `mcp_${mcpTool.serverId}_${mcpTool.name}`,
      description: `[${mcpTool.serverName}] ${mcpTool.description || mcpTool.name}`,
      parameters: mcpTool.inputSchema,
      invoke: async (args: any) => {
        try {
          const result = await this.mcpManager.callTool(mcpTool.serverId, {
            name: mcpTool.name,
            arguments: args,
          });

          return this.formatMcpResult(result);
        } catch (error) {
          throw new Error(`MCP tool execution failed: ${(error as Error).message}`);
        }
      },
    };
  }

  /**
   * Format MCP tool result for display
   */
  private formatMcpResult(result: CallToolResult): string {
    if (result.isError) {
      const errorMessage =
        result.content && result.content.length > 0
          ? result.content.map((c) => c.text || c.type).join(" ")
          : "Unknown error";
      throw new Error(`MCP tool returned an error: ${errorMessage}`);
    }

    if (!result.content || result.content.length === 0) {
      return "Tool executed successfully (no content returned)";
    }

    const textContent = result.content
      .filter((item) => item.type === "text" && item.text)
      .map((item) => item.text)
      .join("\n");

    if (textContent) {
      return textContent;
    }

    // Handle other content types
    const otherContent = result.content
      .filter((item) => item.type !== "text")
      .map((item) => {
        switch (item.type) {
          case "image":
            return `[Image: ${item.mimeType || "unknown format"}]`;
          case "resource":
            return `[Resource: ${item.mimeType || "unknown format"}]`;
          default:
            return `[${item.type}: content available]`;
        }
      })
      .join("\n");

    return otherContent || "Tool executed successfully";
  }

  /**
   * Get available MCP servers summary
   */
  public getServersSummary(): string {
    const servers = this.mcpManager.getServers();
    const summary = this.mcpManager.getConnectionSummary();

    if (servers.length === 0) {
      return "No MCP servers configured";
    }

    const lines = [
      `MCP Servers (${summary.total} total):`,
      `  Connected: ${summary.connected}`,
      `  Connecting: ${summary.connecting}`,
      `  Disconnected: ${summary.disconnected}`,
      `  Error: ${summary.error}`,
      "",
      "Servers:",
    ];

    servers.forEach((server) => {
      const statusIcon = this.getStatusIcon(server.status);
      lines.push(`  ${statusIcon} ${server.name} (${server.id}) - ${server.status}`);
      if (server.lastError) {
        lines.push(`    Error: ${server.lastError}`);
      }
    });

    return lines.join("\n");
  }

  /**
   * Get status icon for display
   */
  private getStatusIcon(status: string): string {
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
   * Get tools summary
   */
  public async getToolsSummary(): Promise<string> {
    try {
      const tools = await this.mcpManager.getAllTools();

      if (tools.length === 0) {
        return "No MCP tools available";
      }

      const lines = [`MCP Tools (${tools.length} available):`];

      // Group tools by server
      const toolsByServer = new Map<string, typeof tools>();
      tools.forEach((tool) => {
        if (!toolsByServer.has(tool.serverId)) {
          toolsByServer.set(tool.serverId, []);
        }
        toolsByServer.get(tool.serverId)!.push(tool);
      });

      toolsByServer.forEach((serverTools, serverId) => {
        const server = this.mcpManager.getServer(serverId);
        const serverName = server?.name || serverId;
        lines.push(`\n  ${serverName}:`);

        serverTools.forEach((tool) => {
          lines.push(`    • ${tool.name}: ${tool.description || "No description"}`);
        });
      });

      return lines.join("\n");
    } catch (error) {
      return `Error getting MCP tools: ${(error as Error).message}`;
    }
  }

  /**
   * Get resources summary
   */
  public async getResourcesSummary(): Promise<string> {
    try {
      const resources = await this.mcpManager.getAllResources();

      if (resources.length === 0) {
        return "No MCP resources available";
      }

      const lines = [`MCP Resources (${resources.length} available):`];

      // Group resources by server
      const resourcesByServer = new Map<string, typeof resources>();
      resources.forEach((resource) => {
        if (!resourcesByServer.has(resource.serverId)) {
          resourcesByServer.set(resource.serverId, []);
        }
        resourcesByServer.get(resource.serverId)!.push(resource);
      });

      resourcesByServer.forEach((serverResources, serverId) => {
        const server = this.mcpManager.getServer(serverId);
        const serverName = server?.name || serverId;
        lines.push(`\n  ${serverName}:`);

        serverResources.forEach((resource) => {
          lines.push(`    • ${resource.name} (${resource.uri})`);
          if (resource.description) {
            lines.push(`      ${resource.description}`);
          }
        });
      });

      return lines.join("\n");
    } catch (error) {
      return `Error getting MCP resources: ${(error as Error).message}`;
    }
  }

  /**
   * Test MCP connection and return status
   */
  public async testConnections(): Promise<string> {
    const servers = this.mcpManager.getServers();

    if (servers.length === 0) {
      return "No MCP servers configured to test";
    }

    const results = [];

    for (const server of servers) {
      try {
        if (!server.client.isConnected()) {
          await this.mcpManager.connectServer(server.id);
        }

        // Try to list tools as a connection test
        await server.client.listTools();
        results.push(`✅ ${server.name}: Connected successfully`);
      } catch (error) {
        results.push(`❌ ${server.name}: ${(error as Error).message}`);
      }
    }

    return results.join("\n");
  }
}
