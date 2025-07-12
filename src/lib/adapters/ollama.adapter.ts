// src/lib/adapters/ollama.adapter.ts

import axios, { AxiosResponse } from "axios";
import { ChatMessage, ToolCallPayload, ToolDefinition } from "../../types/context.js"; // 导入 ToolDefinition
import { LLMAdapter } from "./base.adapter.js";

/**
 * OllamaAdapter 实现了 LLMAdapter 接口，用于与 Ollama 后端进行交互。
 * 它处理与 Ollama API 的 HTTP 通信，并以流式方式返回 LLM 生成的文本。
 */
export class OllamaAdapter implements LLMAdapter {
  private ollamaEndpoint: string;
  private debug: boolean;

  constructor(endpoint: string, debug: boolean = false) {
    this.ollamaEndpoint = endpoint;
    this.debug = debug;
  }

  /**
   * 以流式方式与 Ollama LLM 进行聊天交互。
   * @param messages 聊天消息数组，包含对话历史。
   * @returns 一个异步可迭代对象，每次迭代返回 LLM 生成的文本片段或工具调用负载。
   */
  public async *chatStream(
    messages: ChatMessage[],
    tools?: ToolDefinition[]
  ): AsyncIterable<string | ToolCallPayload> {
    try {
      const payload = {
        model: "llama3.2:3b", // 默认使用 deepseek-r1:8b-0528-qwen3-q4_K_M 模型
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          // Ollama API 期望工具调用消息的 content 为 null
          ...(msg.role === "tool" && { content: null }),
        })),
        stream: true,
        ...(tools &&
          tools.length > 0 && {
            tools: tools.map((tool) => ({
              type: "function", // Ollama API 期望工具类型为 'function'
              function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters || tool.schema,
              },
            })),
          }),
      };

      if (this.debug) {
        console.log("Ollama Request Payload:", JSON.stringify(payload, null, 2));
      }

      const response: AxiosResponse = await axios.post(`${this.ollamaEndpoint}/api/chat`, payload, {
        responseType: "stream",
      });

      const reader = response.data;
      let buffer = "";

      for await (const chunk of reader) {
        buffer += chunk.toString();
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.substring(0, newlineIndex).trim();
          buffer = buffer.substring(newlineIndex + 1);

          if (line) {
            try {
              const data = JSON.parse(line);
              if (this.debug) {
                console.log("Ollama Raw Data:", JSON.stringify(data, null, 2));
              }
              if (data.done === false) {
                if (data.message?.content) {
                  yield data.message.content;
                }
                if (data.message?.tool_calls && data.message.tool_calls.length > 0) {
                  yield { type: "tool_calls", tool_calls: data.message.tool_calls };
                }
              } else if (data.done === true) {
                // 结束标志，可以处理最终的统计信息等
                break; // 退出循环
              }
            } catch (parseError) {
              console.error("Error parsing Ollama stream chunk:", parseError);
              // 可以在这里选择抛出错误或继续处理下一行
            }
          }
        }
      }
    } catch (error) {
      console.error("Error communicating with Ollama API:", (error as Error).message);
      throw new Error(`Failed to connect to Ollama: ${(error as Error).message}`);
    }
  }

  /**
   * 测试与 Ollama 后端的连接。
   * @returns Promise<boolean> 连接是否成功
   */
  public async testConnection(): Promise<{ success: boolean; error?: string; models?: string[] }> {
    try {
      // 尝试获取可用模型列表来测试连接
      const response = await axios.get(`${this.ollamaEndpoint}/api/tags`, {
        timeout: 10000, // 10 second timeout
      });

      if (response.status === 200 && response.data && response.data.models) {
        const models = response.data.models.map((model: any) => model.name);
        return {
          success: true,
          models: models.length > 0 ? models : ["No models found"],
        };
      } else {
        return {
          success: false,
          error: "Invalid response from Ollama API",
        };
      }
    } catch (error) {
      const axiosError = error as any;
      if (axiosError.code === "ECONNREFUSED") {
        return {
          success: false,
          error: "Connection refused - is Ollama running?",
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
}
