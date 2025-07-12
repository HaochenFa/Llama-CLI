// src/lib/adapters/base.adapter.ts

import { ChatMessage, StreamingToolCall, ToolDefinition } from "../../types/context.js";

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
  ): AsyncIterable<string | StreamingToolCall>;

  /**
   * 获取当前使用的模型名称。
   * @returns 模型名称字符串。
   */
  getModel(): string;

  /**
   * 获取服务提供商名称。
   * @returns 服务名称字符串。
   */
  getServiceName?(): string;
}
