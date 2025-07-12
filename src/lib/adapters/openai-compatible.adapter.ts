// src/lib/adapters/openai-compatible.adapter.ts

import axios, { AxiosResponse } from "axios";
import { ChatMessage, StreamingToolCall, ToolDefinition } from "../../types/context.js";
import { LLMAdapter } from "./base.adapter.js";

/**
 * OpenAICompatibleAdapter 实现了 LLMAdapter 接口，用于与各种 OpenAI 兼容的 API 进行交互。
 * 支持 Together AI、Groq、Perplexity、DeepSeek、Moonshot 等服务。
 */
export class OpenAICompatibleAdapter implements LLMAdapter {
  private apiKey: string;
  private baseURL: string;
  private model: string;
  private debug: boolean;
  private serviceName: string;

  constructor(
    baseURL: string,
    apiKey: string,
    model: string,
    debug: boolean = false,
    serviceName: string = "OpenAI-Compatible"
  ) {
    this.baseURL = baseURL.replace(/\/$/, ""); // 移除末尾的斜杠
    this.apiKey = apiKey;
    this.model = model;
    this.debug = debug;
    this.serviceName = serviceName;
  }

  /**
   * 以流式方式与 OpenAI 兼容的 API 进行聊天交互。
   * @param messages 聊天消息数组，包含对话历史。
   * @param tools 可用的工具定义数组。
   * @returns 一个异步可迭代对象，每次迭代返回 LLM 生成的文本片段或工具调用负载。
   */
  public async *chatStream(
    messages: ChatMessage[],
    tools?: ToolDefinition[]
  ): AsyncIterable<string | StreamingToolCall> {
    try {
      // 构建 OpenAI 兼容的请求负载
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

      // 添加工具定义（如果提供且服务支持）
      if (tools && tools.length > 0) {
        payload.tools = tools.map((tool) => ({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters || tool.schema,
          },
        }));
        payload.tool_choice = "auto";
      }

      if (this.debug) {
        console.log(`${this.serviceName} Request Payload:`, JSON.stringify(payload, null, 2));
      }

      // 构建请求头
      const headers: any = {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      };

      // 根据不同服务设置认证头
      if (this.apiKey) {
        if (this.serviceName.toLowerCase().includes("anthropic")) {
          headers["x-api-key"] = this.apiKey;
          headers["anthropic-version"] = "2023-06-01";
        } else {
          headers["Authorization"] = `Bearer ${this.apiKey}`;
        }
      }

      // 发送请求
      const endpoint = this.baseURL.includes("/v1/chat/completions")
        ? this.baseURL
        : `${this.baseURL}/v1/chat/completions`;

      const response: AxiosResponse = await axios.post(endpoint, payload, {
        responseType: "stream",
        headers,
        timeout: 30000, // 30秒超时
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
                console.log(`${this.serviceName} Response Chunk:`, parsed);
              }

              const choice = parsed.choices?.[0];
              if (!choice) continue;

              const delta = choice.delta;
              if (!delta) continue;

              // 处理工具调用
              if (delta.tool_calls) {
                for (const toolCall of delta.tool_calls) {
                  if (toolCall.function && toolCall.function.name) {
                    try {
                      const args = toolCall.function.arguments
                        ? JSON.parse(toolCall.function.arguments)
                        : {};

                      yield {
                        type: "tool_call",
                        tool_call_id: toolCall.id || `call_${Date.now()}`,
                        name: toolCall.function.name,
                        arguments: args,
                      };
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
                console.warn(`Failed to parse ${this.serviceName} response chunk:`, data);
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (this.debug) {
        console.error(`${this.serviceName} API Error:`, error.response?.data || error.message);
      }
      throw new Error(
        `${this.serviceName} API request failed: ${
          error.response?.data?.error?.message || error.message
        }`
      );
    }
  }

  /**
   * 测试与 API 的连接。
   * @returns Promise<{success: boolean, error?: string, models?: string[]}> 连接测试结果
   */
  public async testConnection(): Promise<{ success: boolean; error?: string; models?: string[] }> {
    try {
      // 构建请求头
      const headers: any = {
        "Content-Type": "application/json",
      };

      if (this.apiKey) {
        if (this.serviceName.toLowerCase().includes("anthropic")) {
          headers["x-api-key"] = this.apiKey;
          headers["anthropic-version"] = "2023-06-01";
        } else {
          headers["Authorization"] = `Bearer ${this.apiKey}`;
        }
      }

      // 尝试获取模型列表
      const modelsEndpoint = this.baseURL.includes("/v1/models")
        ? this.baseURL
        : `${this.baseURL}/v1/models`;

      const response = await axios.get(modelsEndpoint, {
        timeout: 10000,
        headers,
      });

      if (response.status === 200 && response.data) {
        let models: string[] = [];

        if (response.data.data && Array.isArray(response.data.data)) {
          // OpenAI 格式
          models = response.data.data
            .map((model: any) => model.id || model.name)
            .filter(Boolean)
            .slice(0, 10);
        } else if (Array.isArray(response.data)) {
          // 简单数组格式
          models = response.data.slice(0, 10);
        }

        return {
          success: true,
          models: models.length > 0 ? models : [`${this.serviceName} connection successful`],
        };
      } else {
        return {
          success: false,
          error: `Invalid response from ${this.serviceName} API`,
        };
      }
    } catch (error: any) {
      // 如果模型列表获取失败，尝试简单的聊天测试
      try {
        const testPayload = {
          model: this.model,
          messages: [{ role: "user", content: "test" }],
          max_tokens: 5,
        };

        const headers: any = {
          "Content-Type": "application/json",
        };

        if (this.apiKey) {
          headers["Authorization"] = `Bearer ${this.apiKey}`;
        }

        const chatEndpoint = this.baseURL.includes("/v1/chat/completions")
          ? this.baseURL
          : `${this.baseURL}/v1/chat/completions`;

        await axios.post(chatEndpoint, testPayload, {
          timeout: 10000,
          headers,
        });

        return {
          success: true,
          models: [`${this.serviceName} connection successful`],
        };
      } catch (chatError: any) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        return {
          success: false,
          error: `${this.serviceName} API connection failed: ${errorMessage}`,
        };
      }
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

  /**
   * 获取服务名称
   */
  public getServiceName(): string {
    return this.serviceName;
  }
}
