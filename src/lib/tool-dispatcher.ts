// src/lib/tool-dispatcher.ts

import { ToolDefinition, ChatMessage } from '../types/context.js';
import { read_file_tool } from './tools/read_file';
import { write_file_tool } from './tools/write_file';
import { search_files_tool } from './tools/search_files';
import { delete_file_tool } from './tools/delete_file';
import { web_search_tool } from './tools/web_search';
import { mcp_manager_tool, getMcpManager, getMcpToolAdapter } from './tools/mcp_manager';
import Ajv from 'ajv';

const ajv = new Ajv();

/**
 * ToolDispatcher 负责根据 LLM 的指令调度和执行工具。
 */
export class ToolDispatcher {
  public availableTools: ToolDefinition[];
  private nativeTools: ToolDefinition[];
  private mcpToolsLoaded: boolean = false;

  constructor(tools: ToolDefinition[]) {
    // 注册所有可用的 native 工具
    this.nativeTools = [
      read_file_tool,
      write_file_tool,
      search_files_tool,
      delete_file_tool,
      web_search_tool,
      mcp_manager_tool,
    ];

    this.availableTools = [
      ...this.nativeTools,
      ...tools.filter(t => t.type !== 'native') // 过滤掉传入的 native 工具，因为我们已经手动注册了
    ];
  }

  /**
   * Load MCP tools from connected servers and add them to available tools
   */
  public async loadMcpTools(): Promise<void> {
    try {
      const mcpToolAdapter = getMcpToolAdapter();
      if (mcpToolAdapter) {
        const mcpTools = await mcpToolAdapter.getToolDefinitions();

        // Remove existing MCP tools and add new ones
        this.availableTools = this.availableTools.filter(t => t.type !== 'mcp');
        this.availableTools.push(...mcpTools);

        this.mcpToolsLoaded = true;
        console.log(`Loaded ${mcpTools.length} MCP tools`);
      }
    } catch (error) {
      console.error('Failed to load MCP tools:', error);
    }
  }

  /**
   * Refresh all tools including MCP tools
   */
  public async refreshTools(): Promise<void> {
    await this.loadMcpTools();
  }

  /**
   * Get the count of available tools by type
   */
  public getToolStats(): { native: number; mcp: number; total: number } {
    const nativeCount = this.availableTools.filter(t => t.type === 'native').length;
    const mcpCount = this.availableTools.filter(t => t.type === 'mcp').length;

    return {
      native: nativeCount,
      mcp: mcpCount,
      total: this.availableTools.length
    };
  }

  /**
   * 根据工具调用指令调度并执行工具。
   * @param toolCall LLM 返回的工具调用指令，例如 { name: "echo", arguments: { message: "hello" } }
   * @param tool_call_id The ID of the tool call.
   * @returns 工具执行的结果，通常是一个 ChatMessage 对象。
   */
  public async dispatch(toolCall: { name: string; arguments: any }, tool_call_id: string): Promise<ChatMessage> {
    const tool = this.availableTools.find(t => t.name === toolCall.name);

    if (!tool) {
      return {
        role: 'tool',
        tool_call_id,
        content: `Error: Tool '${toolCall.name}' not found.`,
      };
    }

    // Parse string arguments if needed
    let parsedArguments = toolCall.arguments;
    if (typeof toolCall.arguments === 'string') {
      try {
        parsedArguments = JSON.parse(toolCall.arguments);
      } catch (error) {
        return {
          role: 'tool',
          tool_call_id,
          content: `Error: Invalid JSON in arguments for tool '${toolCall.name}': ${(error as Error).message}`,
        };
      }
    }

    // Validate arguments against the tool's schema
    const schema = tool.parameters || tool.schema;
    if (schema) {
      const validate = ajv.compile(schema);
      if (!validate(parsedArguments)) {
        return {
          role: 'tool',
          tool_call_id,
          content: `Error: Invalid arguments for tool '${toolCall.name}'. Details: ${ajv.errorsText(validate.errors)}`,
        };
      }
    }

    switch (tool.type) {
      case 'native':
        if (tool.invoke) {
          try {
            const result = await tool.invoke(parsedArguments);
            return {
              role: 'tool',
              tool_call_id,
              content: typeof result === 'string' ? result : JSON.stringify(result),
            };
          } catch (error: any) {
            return {
              role: 'tool',
              tool_call_id,
              content: `Error executing native tool '${tool.name}': ${(error as Error).message}`,
            };
          }
        } else {
          return {
            role: 'tool',
            tool_call_id,
            content: `Error: Native tool '${tool.name}' has no invoke method.`,
          };
        }
      case 'openapi':
        return {
          role: 'tool',
          tool_call_id,
          content: `Error: OpenAPI tool '${tool.name}' not yet implemented.`,
        };
      case 'mcp':
        if (tool.invoke) {
          try {
            const result = await tool.invoke(parsedArguments);
            return {
              role: 'tool',
              tool_call_id,
              content: typeof result === 'string' ? result : JSON.stringify(result),
            };
          } catch (error: any) {
            return {
              role: 'tool',
              tool_call_id,
              content: `Error executing MCP tool '${tool.name}': ${(error as Error).message}`,
            };
          }
        } else {
          return {
            role: 'tool',
            tool_call_id,
            content: `Error: MCP tool '${tool.name}' has no invoke method.`,
          };
        }
      default:
        return {
          role: 'tool',
          tool_call_id,
          content: `Error: Unknown tool type '${tool.type}' for tool '${tool.name}'.`,
        };
    }
  }
}
