// src/lib/adapters/anthropic.adapter.ts

import axios, { AxiosResponse } from "axios";
import { ChatMessage, StreamingToolCall, ToolDefinition } from "../../types/context.js";
import { LLMAdapter } from "./base.adapter.js";

/**
 * AnthropicAdapter 实现了 LLMAdapter 接口，用于与 Anthropic Claude API 进行交互。
 * 支持 Claude-3 系列模型，以及流式响应和工具调用。
 */
export class AnthropicAdapter implements LLMAdapter {
  private apiKey: string;
  private baseURL: string;
  private model: string;
  private debug: boolean;

  constructor(
    apiKey: string,
    debug: boolean = false,
    model: string = "claude-3-sonnet-20240229",
    baseURL: string = "https://api.anthropic.com"
  ) {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.model = model;
    this.debug = debug;
  }

  /**
   * 以流式方式与 Anthropic API 进行聊天交互。
   * @param messages 聊天消息数组，包含对话历史。
   * @param tools 可用的工具定义数组。
   * @returns 一个异步可迭代对象，每次迭代返回 LLM 生成的文本片段或工具调用负载。
   */
  public async *chatStream(
    messages: ChatMessage[],
    tools?: ToolDefinition[]
  ): AsyncIterable<string | StreamingToolCall> {
    try {
      // 转换消息格式为 Anthropic 格式
      const anthropicMessages = this.convertMessages(messages);

      // 构建 Anthropic API 请求负载
      const payload: any = {
        model: this.model,
        messages: anthropicMessages,
        stream: true,
        max_tokens: 4096,
      };

      // 添加工具定义（如果提供）
      if (tools && tools.length > 0) {
        payload.tools = tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.parameters || tool.schema,
        }));
      }

      if (this.debug) {
        console.log("Anthropic Request Payload:", JSON.stringify(payload, null, 2));
      }

      // 发送请求到 Anthropic API
      const response: AxiosResponse = await axios.post(`${this.baseURL}/v1/messages`, payload, {
        responseType: "stream",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          Accept: "text/event-stream",
        },
      });

      const reader = response.data;
      let buffer = "";

      for await (const chunk of reader) {
        buffer += chunk.toString();
        let newlineIndex;

        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            if (data === "[DONE]") {
              return;
            }

            try {
              const parsed = JSON.parse(data);

              if (this.debug) {
                console.log("Anthropic Response Chunk:", parsed);
              }

              // 处理不同类型的事件
              switch (parsed.type) {
                case "content_block_delta":
                  if (parsed.delta?.type === "text_delta" && parsed.delta.text) {
                    yield parsed.delta.text;
                  } else if (parsed.delta?.type === "tool_use") {
                    // Claude 的工具调用格式
                    yield {
                      type: "tool_call",
                      tool_call_id: parsed.delta.id,
                      name: parsed.delta.name,
                      arguments: parsed.delta.input,
                    };
                  }
                  break;

                case "content_block_start":
                  if (parsed.content_block?.type === "tool_use") {
                    // 工具调用开始
                    yield {
                      type: "tool_call",
                      tool_call_id: parsed.content_block.id,
                      name: parsed.content_block.name,
                      arguments: parsed.content_block.input,
                    };
                  }
                  break;
              }
            } catch (e) {
              if (this.debug) {
                console.warn("Failed to parse Anthropic response chunk:", data);
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (this.debug) {
        console.error("Anthropic API Error:", error.response?.data || error.message);
      }
      throw new Error(
        `Anthropic API request failed: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }

  /**
   * 转换消息格式为 Anthropic 格式
   */
  private convertMessages(messages: ChatMessage[]): any[] {
    const anthropicMessages: any[] = [];

    for (const msg of messages) {
      switch (msg.role) {
        case "system":
          // Anthropic 的系统消息需要特殊处理
          // 通常放在第一条用户消息之前
          continue;

        case "user":
        case "assistant":
          anthropicMessages.push({
            role: msg.role,
            content: msg.content,
          });
          break;

        case "tool":
          // 工具响应消息需要转换格式
          anthropicMessages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: msg.tool_call_id,
                content: msg.content,
              },
            ],
          });
          break;
      }
    }

    return anthropicMessages;
  }

  /**
   * 测试与 Anthropic API 的连接。
   * @returns Promise<{success: boolean, error?: string, models?: string[]}> 连接测试结果
   */
  public async testConnection(): Promise<{ success: boolean; error?: string; models?: string[] }> {
    try {
      // Anthropic 没有公开的模型列表端点，所以我们发送一个简单的测试请求
      const testPayload = {
        model: this.model,
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 10,
      };

      const response = await axios.post(`${this.baseURL}/v1/messages`, testPayload, {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
      });

      if (response.status === 200) {
        // 返回常见的 Claude 模型列表
        const commonModels = [
          "claude-3-opus-20240229",
          "claude-3-sonnet-20240229",
          "claude-3-haiku-20240307",
          "claude-2.1",
          "claude-2.0",
        ];

        return {
          success: true,
          models: commonModels,
        };
      } else {
        return {
          success: false,
          error: "Invalid response from Anthropic API",
        };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      return {
        success: false,
        error: `Anthropic API connection failed: ${errorMessage}`,
      };
    }
  }

  /**
   * 获取当前配置的模型名称
   */
  public getModel(): string {
    return this.model;
  }

  /**
   * 设置模型名称
   */
  public setModel(model: string): void {
    this.model = model;
  }
}
