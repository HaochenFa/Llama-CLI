/**
 * Simple Ollama LLM Adapter implementation for LlamaCLI
 */

import { BaseLLMAdapter } from "./base.js";
import { AdapterConfig, ChatOptions, ChatStreamChunk, ModelInfo } from "../types/adapters.js";
import { ChatMessage } from "../types/context.js";

/**
 * Simple Ollama API types
 */
interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

interface OllamaStreamResponse {
  model: string;
  message: {
    role: "assistant";
    content: string;
  };
  done: boolean;
}

/**
 * Simple Ollama LLM Adapter
 */
export class OllamaAdapter extends BaseLLMAdapter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatMessage> {
    // Simple non-streaming chat - just return the first chunk from stream
    let response = "";
    for await (const chunk of this.chatStream(messages, options)) {
      if (chunk.type === "content" && chunk.content) {
        response += chunk.content;
      } else if (chunk.type === "done") {
        break;
      }
    }

    return {
      id: Date.now().toString(),
      role: "assistant",
      content: response,
      timestamp: Date.now(),
    };
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncIterable<ChatStreamChunk> {
    const baseUrl = this.config.baseUrl || this.config.endpoint || "http://localhost:11434";
    const model = this.config.model || "llama3.2";

    const request: OllamaChatRequest = {
      model,
      messages: this.formatMessages(messages),
      stream: true,
      options: {
        temperature: options?.temperature || 0.7,
        top_p: options?.topP || 0.9,
        top_k: options?.topK || 40,
      },
    };

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.config.headers,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim()) {
              try {
                const chunk: OllamaStreamResponse = JSON.parse(line);

                if (chunk.message?.content) {
                  yield {
                    type: "content",
                    content: chunk.message.content,
                  };
                }

                if (chunk.done) {
                  yield { type: "done" };
                  return;
                }
              } catch (parseError) {
                console.warn("Failed to parse chunk:", line);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      yield {
        type: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    // Simple implementation - return basic model info
    return [
      {
        name: "llama3.2",
        description: "Meta Llama 3.2 model",
        contextLength: 128000,
        maxTokens: 4096,
        supportsTools: false,
        supportsVision: false,
        pricing: {
          inputTokens: 0,
          outputTokens: 0,
          currency: "USD",
        },
        capabilities: ["text-generation"],
      },
    ];
  }

  async validateConfig(): Promise<boolean> {
    try {
      const baseUrl = this.config.baseUrl || this.config.endpoint || "http://localhost:11434";
      const response = await fetch(`${baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  protected async performHealthCheck(): Promise<boolean> {
    return this.validateConfig();
  }

  protected formatMessages(messages: ChatMessage[]): OllamaMessage[] {
    return messages.map((msg) => ({
      role: msg.role as "system" | "user" | "assistant",
      content: msg.content,
    }));
  }

  protected parseResponse(response: any): ChatMessage {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: response.message?.content || "",
      timestamp: Date.now(),
    };
  }

  protected parseStreamChunk(chunk: any): ChatStreamChunk {
    return {
      type: "content",
      content: chunk.message?.content || "",
    };
  }
}
