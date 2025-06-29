// src/lib/tool-dispatcher.ts

import {ToolDefinition, ChatMessage} from '../types/context.js';

/**
 * ToolDispatcher 负责根据 LLM 的指令调度和执行工具。
 */
export class ToolDispatcher {
  public availableTools: ToolDefinition[]; // 将 private 改为 public

  constructor(tools: ToolDefinition[]) {
    this.availableTools = tools;
  }

  /**
   * 根据工具调用指令调度并执行工具。
   * @param toolCall LLM 返回的工具调用指令，例如 { name: "echo", arguments: { message: "hello" } }
   * @returns 工具执行的结果，通常是一个 ChatMessage 对象。
   */
  public async dispatch(toolCall: { name: string; arguments: any }): Promise<ChatMessage> {
    const tool = this.availableTools.find(t => t.name === toolCall.name);

    if (!tool) {
      return {
        role: 'tool',
        content: `Error: Tool '${toolCall.name}' not found.`,
      };
    }

    switch (tool.type) {
      case 'native':
        // 这里将调用实际的 native 工具函数
        // 为了简化，我们暂时只处理一个示例工具 'echo'
        if (tool.name === 'echo') {
          const message = toolCall.arguments.message || '';
          return {
            role: 'tool',
            content: `Echo: ${message}`,
          };
        } else {
          return {
            role: 'tool',
            content: `Error: Native tool '${tool.name}' not implemented.`,
          };
        }
      case 'openapi':
        return {
          role: 'tool',
          content: `Error: OpenAPI tool '${tool.name}' not yet implemented.`,
        };
      case 'mcp':
        return {
          role: 'tool',
          content: `Error: MCP tool '${tool.name}' not yet implemented.`,
        };
      default:
        return {
          role: 'tool',
          content: `Error: Unknown tool type '${tool.type}' for tool '${tool.name}'.`,
        };
    }
  }
}
