// src/lib/context-compiler.ts

import {InternalContext, ChatMessage, FileContext, ToolDefinition} from '../types/context.js';

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
    let systemPrompt = `
# Mission Critical Instructions

Your behavior is governed by these rules. You MUST follow them at all times.

## Rule 1: Conversation First (HIGHEST PRIORITY)
Before doing anything else, you MUST determine if the user is making small talk, asking a simple question, or having a general conversation.
- If they are, you MUST respond in natural, conversational language.
- **Under these circumstances, you are FORBIDDEN from using a tool.**

## Rule 2: Use Tools for Actions
If the user's request requires a specific action (e.g., creating a file, reading a file, running a command), you MUST use the appropriate tool.

## Rule 3: Tool Usage Workflow
When you decide to use a tool, you MUST follow this exact workflow:
1.  **First Turn (Your Response):** Respond with a single JSON object containing the \`tool_calls\` array.
    -   You MUST strictly follow the JSON schema for the tool's parameters (e.g., \`content\` vs. \`message\`).
    -   You MUST use absolute paths for all file operations. The current working directory is \`${context.current_working_directory}\`.
2.  **Second Turn (After you receive the tool's result):** After the tool runs, you will receive its output. This is your FINAL step. You MUST respond to the user with a final, user-friendly, natural language message that summarizes the result of the tool's operation. **Your response in this turn MUST be natural language ONLY.**
    -   **Example:** If the tool result is \`Successfully wrote to file: /path/to/file.txt\`, your response should be "I have successfully created the file at /path/to/file.txt for you." or a similar friendly message.
    -   **DO NOT** output JSON, code, or tool calls in this second turn. Your only job is to provide a human-readable summary.

---

`;

    // Environment Context
    systemPrompt += '## Environment Context\n';
    systemPrompt += `Current Working Directory: ${context.current_working_directory}\n\n`;


    // 1. 添加长期记忆
    if (context.long_term_memory && context.long_term_memory.length > 0) {
      systemPrompt += '## Long-Term Memory:\n';
      context.long_term_memory.forEach((memory: string) => {
        systemPrompt += `- ${memory}\n`;
      });
      systemPrompt += '\n';
    }

    // 2. 添加可用工具定义
    if (context.available_tools && context.available_tools.length > 0) {
      systemPrompt += '## Available Tools:\n';
      context.available_tools.forEach((tool: ToolDefinition) => {
        systemPrompt += `### Tool: ${tool.name}\n`;
        systemPrompt += `Description: ${tool.description}\n`;
        if (tool.schema) {
          systemPrompt += `Schema: ${JSON.stringify(tool.schema, null, 2)}\n`;
        }
        systemPrompt += '\n';
      });
      systemPrompt += '\n';
    }

    // 3. 添加文件上下文
    if (context.file_context && context.file_context.length > 0) {
      systemPrompt += '## File Context:\n';
      context.file_context.forEach((file: FileContext) => {
        systemPrompt += `### File: ${file.path}\n`;
        systemPrompt += '```\n';
        systemPrompt += `${file.content}\n`;
        systemPrompt += '```\n\n';
      });
    }

    return systemPrompt.trim();
  }
}
