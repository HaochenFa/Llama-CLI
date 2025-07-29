/**
 * Base tool class for LlamaCLI
 * Provides common functionality for all tools
 */

import {
  MCPTool,
  MCPToolCallResult,
  MCPContent,
  MCPTextContent,
} from '../types/mcp.js';

/**
 * Tool execution context
 */
export interface ToolContext {
  userId?: string;
  sessionId?: string;
  workingDirectory?: string;
  environment?: Record<string, string>;
  permissions?: string[];
}

/**
 * Tool execution parameters
 */
export interface ToolParams {
  [key: string]: any;
}

/**
 * Tool validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Base tool abstract class
 */
export abstract class BaseTool {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };

  /**
   * Execute the tool with given parameters
   */
  abstract execute(params: ToolParams, context?: ToolContext): Promise<MCPToolCallResult>;

  /**
   * Get tool definition for MCP
   */
  getDefinition(): MCPTool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.schema,
    };
  }

  /**
   * Validate tool parameters
   */
  validate(params: ToolParams): ValidationResult {
    const errors: string[] = [];

    // Check required parameters
    if (this.schema.required) {
      for (const required of this.schema.required) {
        if (!(required in params)) {
          errors.push(`Missing required parameter: ${required}`);
        }
      }
    }

    // Check parameter types
    for (const [key, value] of Object.entries(params)) {
      const propertySchema = this.schema.properties[key];
      if (!propertySchema) {
        if (!this.schema.additionalProperties) {
          errors.push(`Unknown parameter: ${key}`);
        }
        continue;
      }

      const validationError = this.validateParameter(key, value, propertySchema);
      if (validationError) {
        errors.push(validationError);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create success result
   */
  protected createSuccessResult(content: MCPContent[]): MCPToolCallResult {
    return {
      content,
      isError: false,
    };
  }

  /**
   * Create error result
   */
  protected createErrorResult(message: string, details?: any): MCPToolCallResult {
    const content: MCPTextContent[] = [
      {
        type: 'text',
        text: message,
      },
    ];

    if (details) {
      content.push({
        type: 'text',
        text: `Details: ${JSON.stringify(details, null, 2)}`,
      });
    }

    return {
      content,
      isError: true,
    };
  }

  /**
   * Create text content
   */
  protected createTextContent(text: string, annotations?: any): MCPTextContent {
    return {
      type: 'text',
      text,
      ...(annotations && { annotations }),
    };
  }

  /**
   * Validate individual parameter
   */
  private validateParameter(key: string, value: any, schema: any): string | null {
    if (schema.type) {
      const expectedType = schema.type;
      const actualType = Array.isArray(value) ? 'array' : typeof value;

      if (expectedType === 'integer' && actualType === 'number') {
        if (!Number.isInteger(value)) {
          return `Parameter '${key}' must be an integer`;
        }
      } else if (expectedType !== actualType) {
        return `Parameter '${key}' must be of type ${expectedType}, got ${actualType}`;
      }
    }

    if (schema.enum && !schema.enum.includes(value)) {
      return `Parameter '${key}' must be one of: ${schema.enum.join(', ')}`;
    }

    if (schema.minimum !== undefined && typeof value === 'number' && value < schema.minimum) {
      return `Parameter '${key}' must be >= ${schema.minimum}`;
    }

    if (schema.maximum !== undefined && typeof value === 'number' && value > schema.maximum) {
      return `Parameter '${key}' must be <= ${schema.maximum}`;
    }

    if (schema.minLength !== undefined && typeof value === 'string' && value.length < schema.minLength) {
      return `Parameter '${key}' must be at least ${schema.minLength} characters long`;
    }

    if (schema.maxLength !== undefined && typeof value === 'string' && value.length > schema.maxLength) {
      return `Parameter '${key}' must be at most ${schema.maxLength} characters long`;
    }

    if (schema.pattern && typeof value === 'string') {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        return `Parameter '${key}' does not match required pattern`;
      }
    }

    return null;
  }

  /**
   * Check if tool requires confirmation
   */
  requiresConfirmation(params: ToolParams): boolean {
    return false; // Override in subclasses if needed
  }

  /**
   * Get tool usage examples
   */
  getExamples(): Array<{ description: string; params: ToolParams }> {
    return []; // Override in subclasses
  }

  /**
   * Get tool tags for categorization
   */
  getTags(): string[] {
    return []; // Override in subclasses
  }

  /**
   * Check if tool is available in current context
   */
  isAvailable(context?: ToolContext): boolean {
    return true; // Override in subclasses if needed
  }

  /**
   * Get tool permissions required
   */
  getRequiredPermissions(): string[] {
    return []; // Override in subclasses
  }

  /**
   * Cleanup resources after tool execution
   */
  async cleanup(): Promise<void> {
    // Override in subclasses if needed
  }
}

/**
 * Tool registry for managing available tools
 */
export class ToolRegistry {
  private tools: Map<string, BaseTool> = new Map();

  /**
   * Register a tool
   */
  register(tool: BaseTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool '${tool.name}' is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get a tool by name
   */
  get(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAll(): BaseTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by tag
   */
  getByTag(tag: string): BaseTool[] {
    return this.getAll().filter(tool => tool.getTags().includes(tag));
  }

  /**
   * Get available tools for context
   */
  getAvailable(context?: ToolContext): BaseTool[] {
    return this.getAll().filter(tool => tool.isAvailable(context));
  }

  /**
   * Get tool definitions for MCP
   */
  getDefinitions(context?: ToolContext): MCPTool[] {
    return this.getAvailable(context).map(tool => tool.getDefinition());
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const tools = this.getAll();
    const tags = new Set<string>();
    
    tools.forEach(tool => {
      tool.getTags().forEach(tag => tags.add(tag));
    });

    return {
      totalTools: tools.length,
      uniqueTags: tags.size,
      toolsByTag: Array.from(tags).map(tag => ({
        tag,
        count: this.getByTag(tag).length,
      })),
    };
  }
}

/**
 * Create a global tool registry instance
 */
export const globalToolRegistry = new ToolRegistry();