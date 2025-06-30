// src/lib/tool-dispatcher.ts

import { ToolDefinition, ChatMessage } from '../types/context.js';
import { echo_tool } from './tools/echo.js';
import { read_file_tool } from './tools/read_file.js';
import { write_file_tool } from './tools/write_file.js';

/**
 * ToolDispatcher 负责根据 LLM 的指令调度和执行工具。
 */
export class ToolDispatcher {
  public availableTools: ToolDefinition[];

  constructor(tools: ToolDefinition[]) {
    // 注册所有可用的 native 工具
    this.availableTools = [
      echo_tool,
      read_file_tool,
      write_file_tool,
      ...tools.filter(t => t.type !== 'native') // 过滤掉传入的 native 工具，因为我们已经手动注册了
    ];
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

    switch (tool.type) {
      case 'native':
        if (tool.invoke) {
          try {
            const result = await tool.invoke(toolCall.arguments);
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
        return {
          role: 'tool',
          tool_call_id,
          content: `Error: MCP tool '${tool.name}' not yet implemented.`,
        };
      default:
        return {
          role: 'tool',
          tool_call_id,
          content: `Error: Unknown tool type '${tool.type}' for tool '${tool.name}'.`,
        };
    }
  }
}
