// src/lib/mcp/builtin-server.ts
// Built-in MCP server that provides all native tools through MCP protocol

import { ToolHandler } from "./tool-handler.js";
import { ReadFileHandler } from "./handlers/read-file-handler.js";
import { WriteFileHandler } from "./handlers/write-file-handler.js";
import { SearchFilesHandler } from "./handlers/search-files-handler.js";
import { DeleteFileHandler } from "./handlers/delete-file-handler.js";
import { WebSearchHandler } from "./handlers/web-search-handler.js";
import { McpTool, CallToolRequest, CallToolResult } from "./types.js";

/**
 * Built-in MCP server that provides all native tools through the MCP protocol
 * This eliminates the distinction between internal and external tools
 */
export class BuiltinMcpServer {
  private tools = new Map<string, ToolHandler>();
  private readonly serverId = "builtin";
  private readonly serverName = "Built-in Tools";

  constructor() {
    this.registerAllTools();
  }

  /**
   * Register all built-in tools
   */
  private registerAllTools(): void {
    this.registerTool("read_file", new ReadFileHandler());
    this.registerTool("write_file", new WriteFileHandler());
    this.registerTool("search_files", new SearchFilesHandler());
    this.registerTool("delete_file", new DeleteFileHandler());
    this.registerTool("web_search", new WebSearchHandler());
  }

  /**
   * Register a tool handler
   */
  private registerTool(name: string, handler: ToolHandler): void {
    this.tools.set(name, handler);
  }

  /**
   * Check if a tool exists
   */
  public hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Handle a tool call request (MCP protocol compatible)
   */
  public async handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
    const { name, arguments: args } = request;

    const handler = this.tools.get(name);
    if (!handler) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Tool '${name}' not found in built-in server`,
          },
        ],
      };
    }

    try {
      const result = await handler.execute(args);

      return {
        isError: false,
        content: [
          {
            type: "text",
            text: typeof result === "string" ? result : JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error executing tool '${name}': ${(error as Error).message}`,
          },
        ],
      };
    }
  }

  /**
   * List all available tools (MCP protocol compatible)
   */
  public listTools(): McpTool[] {
    return Array.from(this.tools.entries()).map(([name, handler]) => ({
      name,
      description: handler.description,
      inputSchema: handler.schema,
    }));
  }

  /**
   * Get server information
   */
  public getServerInfo() {
    return {
      id: this.serverId,
      name: this.serverName,
      toolCount: this.tools.size,
      tools: Array.from(this.tools.keys()),
    };
  }

  /**
   * Health check
   */
  public async isHealthy(): Promise<boolean> {
    try {
      // Simple health check - verify all tools are registered
      return this.tools.size > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get tool by name
   */
  public getTool(name: string): ToolHandler | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tool names
   */
  public getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}
