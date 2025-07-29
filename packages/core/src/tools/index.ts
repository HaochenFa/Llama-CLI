/**
 * Tools Module for LlamaCLI
 * Central export point for all tool categories and utilities
 */

// Base tool infrastructure
export {
  BaseTool,
  ToolRegistry,
  globalToolRegistry,
} from './base.js';

// Import for internal use
import { BaseTool, globalToolRegistry, ToolParams, ToolContext, ValidationResult } from './base.js';
import { MCPToolCallResult } from '../types/mcp.js';

export type {
  ToolParams,
  ToolContext,
  ValidationResult as ToolValidationResult,
} from './base.js';

// Additional types for tool system
export type ToolExecutionStats = {
  executionCount: number;
  averageExecutionTime: number;
  lastExecuted?: Date;
  errorCount: number;
};

export type ToolCategoryType = string;

// Network tools
export {
  WebSearchTool,
  HttpRequestTool,
  DownloadFileTool,
  networkTools,
  NETWORK_TOOLS_CONFIG,
} from './network/index.js';

export type {
  WebSearchParams,
  SearchResult,
  HttpRequestParams,
  DownloadParams,
} from './network/index.js';

// MCP types for tool integration
export type {
  MCPTool,
  MCPToolCallParams,
  MCPToolCallResult,
  MCPTextContent,
  MCPImageContent,
} from '../types/mcp.js';

/**
 * Get all available tools by category
 */
export function getToolsByCategory(): Record<string, BaseTool[]> {
  const tools = globalToolRegistry.getAll();
  const categories: Record<string, BaseTool[]> = {};
  
  tools.forEach(tool => {
    const tags = tool.getTags();
    if (tags.length === 0) {
      if (!categories['uncategorized']) {
        categories['uncategorized'] = [];
      }
      categories['uncategorized'].push(tool);
    } else {
      tags.forEach(tag => {
        if (!categories[tag]) {
          categories[tag] = [];
        }
        categories[tag].push(tool);
      });
    }
  });
  
  return categories;
}

/**
 * Get tool statistics
 */
export function getToolStats() {
  const stats = globalToolRegistry.getStats();
  return {
    ...stats,
    totalCategories: stats.uniqueTags + (globalToolRegistry.getAll().some(tool => tool.getTags().length === 0) ? 1 : 0),
  };
}

/**
 * Initialize all tools
 * This function should be called during application startup
 */
export function initializeTools(): void {
  // Network tools are auto-registered via their index file
  // Additional tool categories can be initialized here
  
  const stats = getToolStats();
  console.log(`🔧 Initialized ${stats.totalTools} tools across ${stats.totalCategories} categories`);
}

/**
 * Tool execution utilities
 */
export class ToolExecutor {
  /**
   * Execute a tool by name with parameters
   */
  static async execute(
    toolName: string,
    params: ToolParams,
    context?: ToolContext
  ): Promise<MCPToolCallResult> {
    const tool = globalToolRegistry.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    return await tool.execute(params, context);
  }

  /**
   * Validate tool parameters without execution
   */
  static validate(toolName: string, params: ToolParams): ValidationResult {
    const tool = globalToolRegistry.get(toolName);
    if (!tool) {
      return {
        valid: false,
        errors: [`Tool not found: ${toolName}`],
      };
    }

    return tool.validate(params);
  }

  /**
   * Get tool schema for parameter validation
   */
  static getSchema(toolName: string): object | null {
    const tool = globalToolRegistry.get(toolName);
    return tool?.schema || null;
  }

  /**
   * Check if tool requires confirmation
   */
  static requiresConfirmation(toolName: string, params: ToolParams): boolean {
    const tool = globalToolRegistry.get(toolName);
    return tool?.requiresConfirmation(params) || false;
  }

  /**
   * Get tool examples
   */
  static getExamples(toolName: string): any[] {
    const tool = globalToolRegistry.get(toolName);
    return tool?.getExamples() || [];
  }
}

/**
 * Tool discovery utilities
 */
export class ToolDiscovery {
  /**
   * Search tools by tags
   */
  static findByTags(tags: string[]): BaseTool[] {
    return tags.flatMap(tag => globalToolRegistry.getByTag(tag));
  }

  /**
   * Search tools by category
   */
  static findByCategory(category: string): BaseTool[] {
    return globalToolRegistry.getByTag(category);
  }

  /**
   * Search tools by name pattern
   */
  static findByName(pattern: string): BaseTool[] {
    const allTools = globalToolRegistry.getAll();
    const regex = new RegExp(pattern, 'i');
    return allTools.filter((tool: BaseTool) => regex.test(tool.name));
  }

  /**
   * Get tools that require specific permissions
   */
  static findByPermissions(permissions: string[]): BaseTool[] {
    const allTools = globalToolRegistry.getAll();
    return allTools.filter((tool: BaseTool) => {
      const toolPermissions = tool.getRequiredPermissions();
      return permissions.some(permission => 
        toolPermissions.includes(permission)
      );
    });
  }

  /**
   * Get recommended tools for a specific task
   */
  static getRecommendations(taskDescription: string): BaseTool[] {
    const keywords = taskDescription.toLowerCase().split(/\s+/);
    const allTools = globalToolRegistry.getAll();
    
    // Score tools based on keyword matches in name, description, and tags
    const scoredTools = allTools.map((tool: BaseTool) => {
      let score = 0;
      const searchText = [
        tool.name,
        tool.description,
        ...tool.getTags(),
      ].join(' ').toLowerCase();
      
      keywords.forEach(keyword => {
        if (searchText.includes(keyword)) {
          score += 1;
        }
      });
      
      return { tool, score };
    });
    
    // Return tools with score > 0, sorted by score descending
    return scoredTools
      .filter(({ score }: { score: number }) => score > 0)
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .map(({ tool }: { tool: BaseTool }) => tool)
      .slice(0, 5); // Top 5 recommendations
  }
}

/**
 * Export tool constants
 */
export const TOOL_CONSTANTS = {
  MAX_EXECUTION_TIME: 300000, // 5 minutes
  MAX_RETRY_ATTEMPTS: 3,
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  MAX_CONCURRENT_EXECUTIONS: 10,
} as const;