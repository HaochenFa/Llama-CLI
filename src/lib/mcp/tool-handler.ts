// src/lib/mcp/tool-handler.ts
// Base interface for all tool handlers in the unified MCP architecture

/**
 * Interface that all tool handlers must implement
 * This provides a unified way to handle tools regardless of their implementation
 */
export interface ToolHandler {
  /** Human-readable description of what this tool does */
  description: string;

  /** JSON Schema defining the tool's input parameters */
  schema: any;

  /**
   * Execute the tool with the given arguments
   * @param args The arguments passed to the tool
   * @returns The result of the tool execution
   */
  execute(args: any): Promise<any>;
}

/**
 * Result of a tool execution
 */
export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Base class for tool handlers that provides common functionality
 */
export abstract class BaseToolHandler implements ToolHandler {
  abstract description: string;
  abstract schema: any;

  /**
   * Execute the tool with error handling
   */
  async execute(args: any): Promise<any> {
    try {
      // Validate arguments against schema if needed
      this.validateArgs(args);

      // Execute the actual tool logic
      return await this.executeImpl(args);
    } catch (error) {
      throw new Error(`Tool execution failed: ${(error as Error).message}`);
    }
  }

  /**
   * Implement this method in subclasses
   */
  protected abstract executeImpl(args: any): Promise<any>;

  /**
   * Basic argument validation
   * Override in subclasses for custom validation
   */
  protected validateArgs(args: any): void {
    if (!args || typeof args !== "object") {
      throw new Error("Arguments must be an object");
    }
  }
}
