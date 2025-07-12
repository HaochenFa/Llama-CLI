// src/lib/adapters/openai.adapter.ts

import axios, { AxiosResponse } from "axios";
import { ChatMessage, ToolCallPayload, ToolDefinition } from "../../types/context.js";
import { LLMAdapter } from "./base.adapter.js";

/**
 * OpenAIAdapter 实现了 LLMAdapter 接口，用于与 OpenAI API 进行交互。
 * 支持 GPT-3.5、GPT-4 等模型，以及流式响应和工具调用。
 */
export class OpenAIAdapter implements LLMAdapter {
  private apiKey: string;
  private baseURL: string;
  private model: string;
  private debug: boolean;

  constructor(
    apiKey: string,
    debug: boolean = false,
    model: string = "gpt-3.5-turbo",
    baseURL: string = "https://api.openai.com"
  ) {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.model = model;
    this.debug = debug;
  }

  /**
   * 以流式方式与 OpenAI API 进行聊天交互。
   * @param messages 聊天消息数组，包含对话历史。
   * @param tools 可用的工具定义数组。
   * @returns 一个异步可迭代对象，每次迭代返回 LLM 生成的文本片段或工具调用负载。
   */
  public async *chatStream(
    messages: ChatMessage[],
    tools?: ToolDefinition[]
  ): AsyncIterable<string | ToolCallPayload> {
    try {
      // 构建 OpenAI API 请求负载
      const payload: any = {
        model: this.model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
          ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
        })),
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      };

      // 添加工具定义（如果提供）
      if (tools && tools.length > 0) {
        payload.tools = tools.map((tool) => ({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters || tool.schema,
          },
        }));
        payload.tool_choice = "auto"; // 让模型自动决定是否使用工具
      }

      if (this.debug) {
        console.log("OpenAI Request Payload:", JSON.stringify(payload, null, 2));
      }

      // 发送请求到 OpenAI API
      const response: AxiosResponse = await axios.post(
        `${this.baseURL}/v1/chat/completions`,
        payload,
        {
          responseType: "stream",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            Accept: "text/event-stream",
          },
        }
      );

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
                console.log("OpenAI Response Chunk:", parsed);
              }

              const choice = parsed.choices?.[0];
              if (!choice) continue;

              const delta = choice.delta;
              if (!delta) continue;

              // 处理工具调用
              if (delta.tool_calls) {
                for (const toolCall of delta.tool_calls) {
                  if (toolCall.function && toolCall.function.name && toolCall.function.arguments) {
                    try {
                      const args = JSON.parse(toolCall.function.arguments);
                      yield {
                        type: "tool_call",
                        tool_call_id: toolCall.id,
                        name: toolCall.function.name,
                        arguments: args,
                      } as ToolCallPayload;
                    } catch (e) {
                      console.warn(
                        "Failed to parse tool call arguments:",
                        toolCall.function.arguments
                      );
                    }
                  }
                }
              }

              // 处理文本内容
              if (delta.content) {
                yield delta.content;
              }
            } catch (e) {
              if (this.debug) {
                console.warn("Failed to parse OpenAI response chunk:", data);
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (this.debug) {
        console.error("OpenAI API Error:", error.response?.data || error.message);
      }
      throw new Error(
        `OpenAI API request failed: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }

  /**
   * 测试与 OpenAI API 的连接。
   * @returns Promise<{success: boolean, error?: string, models?: string[]}> 连接测试结果
   */
  public async testConnection(): Promise<{ success: boolean; error?: string; models?: string[] }> {
    try {
      // 尝试获取可用模型列表来测试连接
      const response = await axios.get(`${this.baseURL}/v1/models`, {
        timeout: 10000, // 10 second timeout
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 200 && response.data && response.data.data) {
        const models = response.data.data
          .filter((model: any) => model.id.includes("gpt") || model.id.includes("text"))
          .map((model: any) => model.id)
          .slice(0, 10); // 限制显示前10个模型

        return {
          success: true,
          models: models.length > 0 ? models : ["No compatible models found"],
        };
      } else {
        return {
          success: false,
          error: "Invalid response from OpenAI API",
        };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      return {
        success: false,
        error: `OpenAI API connection failed: ${errorMessage}`,
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
