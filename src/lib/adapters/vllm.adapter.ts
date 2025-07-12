// src/lib/adapters/vllm.adapter.ts

import axios, { AxiosResponse } from "axios";
import { ChatMessage, StreamingToolCall, ToolDefinition } from "../../types/context.js";
import { LLMAdapter } from "./base.adapter.js";

/**
 * vLLMAdapter 实现了 LLMAdapter 接口，用于与 vLLM 后端进行交互。
 * vLLM 使用 OpenAI 兼容的 API 格式，支持流式响应和工具调用。
 */
export class vLLMAdapter implements LLMAdapter {
  private vllmEndpoint: string;
  private debug: boolean;
  private model: string;

  constructor(endpoint: string, debug: boolean = false, model: string = "default") {
    this.vllmEndpoint = endpoint;
    this.debug = debug;
    this.model = model;
  }

  /**
   * 以流式方式与 vLLM 进行聊天交互。
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
        console.log("vLLM Request Payload:", JSON.stringify(payload, null, 2));
      }

      // 发送请求到 vLLM 的 OpenAI 兼容端点
      const response: AxiosResponse = await axios.post(
        `${this.vllmEndpoint}/v1/chat/completions`,
        payload,
        {
          responseType: "stream",
          headers: {
            "Content-Type": "application/json",
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
          const line = buffer.substring(0, newlineIndex).trim();
          buffer = buffer.substring(newlineIndex + 1);

          if (line.startsWith("data: ")) {
            const dataStr = line.substring(6).trim();

            // 检查是否为结束标志
            if (dataStr === "[DONE]") {
              return;
            }

            try {
              const data = JSON.parse(dataStr);

              if (this.debug) {
                console.log("vLLM Raw Data:", JSON.stringify(data, null, 2));
              }

              if (data.choices && data.choices.length > 0) {
                const choice = data.choices[0];
                const delta = choice.delta;

                // 处理文本内容
                if (delta.content) {
                  yield delta.content;
                }

                // 处理工具调用
                if (delta.tool_calls && delta.tool_calls.length > 0) {
                  // vLLM 可能会分块发送工具调用，需要累积
                  for (const tc of delta.tool_calls) {
                    yield {
                      type: "tool_call",
                      tool_call_id:
                        tc.id ||
                        `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                      name: tc.function?.name || tc.name,
                      arguments: tc.function?.arguments || tc.arguments || {},
                    };
                  }
                }

                // 检查是否完成
                if (choice.finish_reason === "stop" || choice.finish_reason === "tool_calls") {
                  return;
                }
              }
            } catch (parseError) {
              if (this.debug) {
                console.error("Error parsing vLLM stream chunk:", parseError);
              }
              // 继续处理下一行
            }
          }
        }
      }
    } catch (error) {
      console.error("Error communicating with vLLM API:", (error as Error).message);
      throw new Error(`Failed to connect to vLLM: ${(error as Error).message}`);
    }
  }

  /**
   * 测试与 vLLM 后端的连接。
   * @returns Promise<boolean> 连接是否成功
   */
  public async testConnection(): Promise<{ success: boolean; error?: string; models?: string[] }> {
    try {
      // 尝试获取可用模型列表来测试连接
      const response = await axios.get(`${this.vllmEndpoint}/v1/models`, {
        timeout: 10000, // 10 second timeout
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status === 200 && response.data && response.data.data) {
        const models = response.data.data.map((model: any) => model.id);
        return {
          success: true,
          models: models.length > 0 ? models : ["No models found"],
        };
      } else {
        return {
          success: false,
          error: "Invalid response from vLLM API",
        };
      }
    } catch (error) {
      const axiosError = error as any;
      if (axiosError.code === "ECONNREFUSED") {
        return {
          success: false,
          error: "Connection refused - is vLLM running?",
        };
      } else if (axiosError.code === "ETIMEDOUT") {
        return {
          success: false,
          error: "Connection timeout - check your endpoint URL",
        };
      } else {
        return {
          success: false,
          error: axiosError.message || "Unknown connection error",
        };
      }
    }
  }

  /**
   * 获取可用的模型列表
   * @returns Promise<string[]> 可用模型列表
   */
  public async getAvailableModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.vllmEndpoint}/v1/models`, {
        timeout: 5000,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status === 200 && response.data && response.data.data) {
        return response.data.data.map((model: any) => model.id);
      }

      return [];
    } catch (error) {
      console.error("Error fetching vLLM models:", (error as Error).message);
      return [];
    }
  }

  /**
   * 获取当前配置的模型名称
   */
  public getModel(): string {
    return this.model;
  }

  /**
   * 获取服务名称
   */
  public getServiceName(): string {
    return "vLLM";
  }
}
