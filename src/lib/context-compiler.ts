// src/lib/context-compiler.ts

import { InternalContext, ChatMessage, FileContext, ToolDefinition } from '../types/context.js';

/**
 * 上下文编译器，负责将 InternalContext 压平为 LLM 的系统提示。
 */
export class ContextCompiler {
  /**
   * 将 InternalContext 编译为 LLM 的系统提示字符串。
   * @param context 内部上下文对象。
   * @returns 编译后的系统提示字符串。
   */
  public compile(context: InternalContext): string {
    let systemPrompt = '';

    // 1. 添加长期记忆
    if (context.long_term_memory && context.long_term_memory.length > 0) {
      systemPrompt += '## Long-Term Memory:\n';
      context.long_term_memory.forEach((memory: string, index: number) => { // 明确 memory 类型，添加 index
        systemPrompt += `- ${memory}\n`;
      });
      systemPrompt += '\n';
    }

    // 2. 添加可用工具定义
    if (context.available_tools && context.available_tools.length > 0) {
      systemPrompt += '## Available Tools:\n';
      context.available_tools.forEach((tool: ToolDefinition, index: number) => { // 明确 tool 类型，添加 index
        systemPrompt += `### Tool: ${tool.name}\n`;
        systemPrompt += `Description: ${tool.description}\n`;
        systemPrompt += `Type: ${tool.type}\n`;
        if (tool.schema) {
          systemPrompt += `Schema: ${JSON.stringify(tool.schema, null, 2)}\n`;
        }
        if (tool.endpoint) {
          systemPrompt += `Endpoint: ${tool.endpoint}\n`;
        }
        systemPrompt += '\n';
      });
      systemPrompt += '\n';

      // START: Added to guide LLM to use tools
      // 引导 LLM 生成工具调用指令。后续需要评估这种提示方式的效果和通用性。
      systemPrompt += '## Tool Usage Instructions:\n';
      systemPrompt += 'IMPORTANT: When you need to use a tool, you MUST respond with a JSON object inside <tool_code> tags. Do NOT respond with natural language if a tool is required.\n';
      systemPrompt += 'The JSON object MUST have "name" (string) and "arguments" (object) properties.\n';
      systemPrompt += 'Example for the "echo" tool: <tool_code>{"name": "echo", "arguments": {"message": "your message here"}}</tool_code>\n\n';
      // END: Added to guide LLM to use tools
    }

    // 3. 添加文件上下文
    if (context.file_context && context.file_context.length > 0) {
      systemPrompt += '## File Context:\n';
      context.file_context.forEach((file: FileContext, index: number) => { // 明确 file 类型，添加 index
        systemPrompt += `### File: ${file.path}\n`;
        systemPrompt += '```\n'; // 显式拼接反引号
        systemPrompt += `${file.content}\n`;
        systemPrompt += '```\n';
        systemPrompt += '\n';
      });
      systemPrompt += '\n';
    }

    // 4. 添加聊天历史（可选，通常由 LLM API 独立处理，但这里作为系统提示的一部分）
    // 考虑到 chat_history 通常是作为单独的 messages 数组传递给 LLM API 的，
    // 这里可以只包含一个简要的说明，或者根据需要将部分历史作为系统提示的一部分。
    // 为了简化，目前只添加一个提示，实际的聊天历史会在 LLMAdapter 中处理。
    // if (context.chat_history && context.chat_history.length > 0) {
    //   systemPrompt += '## Chat History (for reference, actual history passed separately):\n';
    //   context.chat_history.forEach((message: ChatMessage) => {
    //     systemPrompt += `${message.role}: ${message.content}\n`;
    //   });
    //   systemPrompt += '\n';
    // }

    // 可以在这里添加其他通用的系统指令或角色设定
    systemPrompt += 'You are a helpful AI assistant for software engineering tasks. Please provide concise and accurate responses.';

    return systemPrompt.trim();
  }
}