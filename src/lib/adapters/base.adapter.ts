// src/lib/adapters/base.adapter.ts

import { ChatMessage, ToolCallPayload, ToolDefinition } from "../../types/context.js";

/**
 * LLMAdapter 接口定义了与大型语言模型交互的通用契约。
 * 所有具体的 LLM 后端适配器都必须实现此接口。
 */
export interface LLMAdapter {
  /**
   * 以流式方式与 LLM 进行聊天交互。
   * @param messages 聊天消息数组，包含对话历史。
   * @returns 一个异步可迭代对象，每次迭代返回 LLM 生成的文本片段或工具调用负载。
   */
  chatStream(
    messages: ChatMessage[],
    tools?: ToolDefinition[]
  ): AsyncIterable<string | ToolCallPayload>;
}
