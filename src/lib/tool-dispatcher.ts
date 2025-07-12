// src/lib/tool-dispatcher.ts
// Unified Tool Dispatcher - All tools are handled through MCP protocol

import { ToolDefinition, ChatMessage } from "../types/context.js";
import { UnifiedMcpManager } from "./mcp/unified-manager.js";
import Ajv from "ajv";

const ajv = new Ajv();

/**
 * Unified ToolDispatcher - All tools are handled through MCP protocol
 * This eliminates the distinction between native, MCP, and OpenAPI tools
 */
export class ToolDispatcher {
  public availableTools: ToolDefinition[] = [];
  private mcpManager: UnifiedMcpManager;
  private isInitialized: boolean = false;

  constructor(tools: ToolDefinition[] = []) {
    this.mcpManager = new UnifiedMcpManager();

    // Add any external tools passed in (though in the unified architecture,
    // these should also be MCP-based)
    this.availableTools = [...tools];
  }

  /**
   * Initialize the tool dispatcher and load all tools
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize the unified MCP manager
      await this.mcpManager.initialize();

      // Load all tools from all MCP servers (including built-in)
      await this.refreshTools();

      this.isInitialized = true;
      console.log(`ToolDispatcher initialized with ${this.availableTools.length} tools`);
    } catch (error) {
      console.error("Failed to initialize ToolDispatcher:", error);
      throw error;
    }
  }

  /**
   * Refresh all tools from all MCP servers
   */
  public async refreshTools(): Promise<void> {
    try {
      // Get all tools from the unified MCP manager
      const mcpTools = await this.mcpManager.getAllTools();

      // Replace all tools with the latest from MCP servers
      this.availableTools = mcpTools;

      console.log(`Refreshed tools: ${this.availableTools.length} total`);
    } catch (error) {
      console.error("Failed to refresh tools:", error);
    }
  }

  /**
   * Get tool statistics (simplified since all tools are now MCP-based)
   */
  public getToolStats(): { builtin: number; external: number; total: number } {
    const builtinCount = this.availableTools.filter((t) =>
      t.description?.includes("[Built-in Tools]")
    ).length;
    const externalCount = this.availableTools.length - builtinCount;

    return {
      builtin: builtinCount,
      external: externalCount,
      total: this.availableTools.length,
    };
  }

  /**
   * Dispatch and execute a tool call through the unified MCP protocol
   * @param toolCall LLM tool call instruction, e.g., { name: "read_file", arguments: { absolute_path: "/path/to/file" } }
   * @param tool_call_id The ID of the tool call
   * @returns Tool execution result as a ChatMessage object
   */
  public async dispatch(
    toolCall: { name: string; arguments: any },
    tool_call_id: string
  ): Promise<ChatMessage> {
    // Ensure dispatcher is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    const tool = this.availableTools.find((t) => t.name === toolCall.name);

    if (!tool) {
      return {
        role: "tool",
        tool_call_id,
        content: `Error: Tool '${toolCall.name}' not found. Available tools: ${this.availableTools
          .map((t) => t.name)
          .join(", ")}`,
      };
    }

    // Parse string arguments if needed
    let parsedArguments = toolCall.arguments;
    if (typeof toolCall.arguments === "string") {
      try {
        parsedArguments = JSON.parse(toolCall.arguments);
      } catch (error) {
        return {
          role: "tool",
          tool_call_id,
          content: `Error: Invalid JSON in arguments for tool '${toolCall.name}': ${
            (error as Error).message
          }`,
        };
      }
    }

    // Validate arguments against the tool's schema
    const schema = tool.parameters || tool.schema;
    if (schema) {
      const validate = ajv.compile(schema);
      if (!validate(parsedArguments)) {
        return {
          role: "tool",
          tool_call_id,
          content: `Error: Invalid arguments for tool '${toolCall.name}'. Details: ${ajv.errorsText(
            validate.errors
          )}`,
        };
      }
    }

    // Execute tool through unified MCP protocol
    // All tools are now MCP-based, so we use a single execution path
    try {
      const result = await this.mcpManager.callTool(toolCall.name, parsedArguments);

      return {
        role: "tool",
        tool_call_id,
        content: typeof result === "string" ? result : JSON.stringify(result),
      };
    } catch (error: any) {
      return {
        role: "tool",
        tool_call_id,
        content: `Error executing tool '${toolCall.name}': ${(error as Error).message}`,
      };
    }
  }

  /**
   * Add an external MCP server
   */
  public async addMcpServer(id: string, name: string, config: any): Promise<void> {
    await this.mcpManager.addExternalServer(id, name, config);
    await this.refreshTools();
  }

  /**
   * Remove an external MCP server
   */
  public async removeMcpServer(id: string): Promise<void> {
    await this.mcpManager.removeServer(id);
    await this.refreshTools();
  }

  /**
   * Get MCP connection summary
   */
  public getMcpConnectionSummary(): string {
    return this.mcpManager.getConnectionSummary();
  }

  /**
   * Get the unified MCP manager (for advanced operations)
   */
  public getMcpManager(): UnifiedMcpManager {
    return this.mcpManager;
  }

  /**
   * Health check for all MCP servers
   */
  public async healthCheck(): Promise<{ [serverId: string]: boolean }> {
    return await this.mcpManager.healthCheck();
  }
}
