/**
 * OpenAI Compatible LLM Adapter implementation for LlamaCLI
 * Supports local LLM services like LM Studio, Oobabooga, vLLM, etc.
 */

import { BaseLLMAdapter } from "./base.js";
import { AdapterConfig, ChatOptions, ChatStreamChunk, ModelInfo } from "../types/adapters.js";
import { ChatMessage, ToolCall } from "../types/context.js";

/**
 * OpenAI Compatible API types (reusing OpenAI types for compatibility)
 */
interface OpenAICompatibleMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAICompatibleToolCall[];
  tool_call_id?: string;
}

interface OpenAICompatibleToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAICompatibleChatRequest {
  model: string;
  messages: OpenAICompatibleMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
  tools?: OpenAICompatibleTool[];
  tool_choice?: "auto" | "none" | { type: "function"; function: { name: string } };
}

interface OpenAICompatibleTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: any;
  };
}

interface OpenAICompatibleChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?: OpenAICompatibleToolCall[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAICompatibleStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: "assistant";
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: "function";
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: string;
  }>;
}

interface OpenAICompatibleModelsResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    created?: number;
    owned_by?: string;
  }>;
}

/**
 * OpenAI Compatible LLM Adapter
 * Works with LM Studio, Oobabooga, vLLM, and other OpenAI-compatible services
 */
export class OpenAICompatibleAdapter extends BaseLLMAdapter {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: AdapterConfig) {
    super(config);
    this.baseUrl = config.baseUrl || config.endpoint || "http://localhost:1234/v1";
    this.apiKey = config.apiKey; // Optional for local services
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatMessage> {
    const model = this.config.model || "local-model";

    const request: OpenAICompatibleChatRequest = {
      model,
      messages: this.formatMessages(messages),
      stream: false,
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 2048,
      top_p: options?.topP || 1.0,
      frequency_penalty: options?.frequencyPenalty || 0,
      presence_penalty: options?.presencePenalty || 0,
      stop: options?.stopSequences,
    };

    // Add tools if provided and supported
    if (options?.tools && options.tools.length > 0) {
      request.tools = this.formatTools(options.tools);
      request.tool_choice = options.toolChoice || "auto";
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...this.config.headers,
      };

      // Add authorization header if API key is provided
      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI Compatible API error: ${response.status} ${error}`);
      }

      const data = (await response.json()) as OpenAICompatibleChatResponse;
      const choice = data.choices[0];

      if (!choice) {
        throw new Error("No response from OpenAI Compatible API");
      }

      const result: ChatMessage = {
        id: data.id,
        role: "assistant",
        content: choice.message.content || "",
        timestamp: Date.now(),
      };

      // Handle tool calls
      if (choice.message.tool_calls) {
        result.tool_calls = choice.message.tool_calls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        }));
      }

      // Update usage stats
      if (data.usage) {
        this.stats.requestCount++;
        this.stats.totalTokens += data.usage.total_tokens;
        this.stats.inputTokens += data.usage.prompt_tokens;
        this.stats.outputTokens += data.usage.completion_tokens;
      }

      return result;
    } catch (error) {
      this.stats.errorCount++;
      throw this.createAdapterError(
        "NETWORK_ERROR",
        `OpenAI Compatible chat request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        { error }
      );
    }
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncIterable<ChatStreamChunk> {
    const model = this.config.model || "local-model";

    const request: OpenAICompatibleChatRequest = {
      model,
      messages: this.formatMessages(messages),
      stream: true,
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 2048,
      top_p: options?.topP || 1.0,
      frequency_penalty: options?.frequencyPenalty || 0,
      presence_penalty: options?.presencePenalty || 0,
      stop: options?.stopSequences,
    };

    // Add tools if provided and supported
    if (options?.tools && options.tools.length > 0) {
      request.tools = this.formatTools(options.tools);
      request.tool_choice = options.toolChoice || "auto";
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...this.config.headers,
      };

      // Add authorization header if API key is provided
      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI Compatible API error: ${response.status} ${error}`);
      }

      if (!response.body) {
        throw new Error("No response body from OpenAI Compatible API");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let toolCallBuffer: { [index: number]: { id?: string; name?: string; arguments: string } } =
        {};

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim() === "" || line.trim() === "data: [DONE]") {
              continue;
            }

            if (line.startsWith("data: ")) {
              try {
                const chunk: OpenAICompatibleStreamChunk = JSON.parse(line.slice(6));
                const choice = chunk.choices[0];

                if (!choice) continue;

                // Handle content
                if (choice.delta.content) {
                  yield {
                    type: "content",
                    content: choice.delta.content,
                  };
                }

                // Handle tool calls
                if (choice.delta.tool_calls) {
                  for (const toolCall of choice.delta.tool_calls) {
                    const index = toolCall.index;

                    if (!toolCallBuffer[index]) {
                      toolCallBuffer[index] = { arguments: "" };
                    }

                    if (toolCall.id) {
                      toolCallBuffer[index].id = toolCall.id;
                    }

                    if (toolCall.function?.name) {
                      toolCallBuffer[index].name = toolCall.function.name;
                    }

                    if (toolCall.function?.arguments) {
                      toolCallBuffer[index].arguments += toolCall.function.arguments;
                    }
                  }
                }

                // Handle completion
                if (choice.finish_reason) {
                  // Emit any completed tool calls
                  for (const [index, toolCall] of Object.entries(toolCallBuffer)) {
                    if (toolCall.id && toolCall.name) {
                      yield {
                        type: "tool_call",
                        toolCall: {
                          id: toolCall.id,
                          type: "function" as const,
                          function: {
                            name: toolCall.name,
                            arguments: toolCall.arguments,
                          },
                        },
                      };
                    }
                  }

                  yield { type: "done" };
                  return;
                }
              } catch (parseError) {
                console.warn("Failed to parse OpenAI Compatible stream chunk:", line);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      this.stats.errorCount++;
      yield {
        type: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    try {
      const headers: Record<string, string> = {
        ...this.config.headers,
      };

      // Add authorization header if API key is provided
      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/models`, {
        headers,
      });

      if (!response.ok) {
        // If models endpoint fails, return default models
        return this.getDefaultModels();
      }

      const data = (await response.json()) as OpenAICompatibleModelsResponse;

      return data.data.map((model) => ({
        name: model.id,
        description: `Local model: ${model.id}`,
        contextLength: this.getEstimatedContextLength(model.id),
        maxTokens: this.getEstimatedMaxTokens(model.id),
        supportsTools: this.estimateToolSupport(model.id),
        supportsVision: this.estimateVisionSupport(model.id),
        pricing: { inputTokens: 0, outputTokens: 0, currency: "FREE" },
        capabilities: this.getEstimatedCapabilities(model.id),
      }));
    } catch (error) {
      // Return default models if API call fails
      return this.getDefaultModels();
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        ...this.config.headers,
      };

      // Add authorization header if API key is provided
      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/models`, {
        headers,
      });

      // Accept both 200 and 404 (some services don't implement /models)
      return response.status === 200 || response.status === 404;
    } catch {
      return false;
    }
  }

  protected async performHealthCheck(): Promise<boolean> {
    return this.validateConfig();
  }

  protected formatMessages(messages: ChatMessage[]): OpenAICompatibleMessage[] {
    return messages.map((msg) => {
      const compatibleMsg: OpenAICompatibleMessage = {
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content,
      };

      // Handle tool calls
      if (msg.tool_calls) {
        compatibleMsg.tool_calls = msg.tool_calls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        }));
      }

      // Handle tool call responses
      if (msg.role === "tool" && msg.tool_call_id) {
        compatibleMsg.role = "tool";
        compatibleMsg.tool_call_id = msg.tool_call_id;
      }

      return compatibleMsg;
    });
  }

  protected parseResponse(response: any): ChatMessage {
    const choice = response.choices[0];
    const result: ChatMessage = {
      id: response.id,
      role: "assistant",
      content: choice.message.content || "",
      timestamp: Date.now(),
    };

    if (choice.message.tool_calls) {
      result.tool_calls = choice.message.tool_calls.map((tc: OpenAICompatibleToolCall) => ({
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      }));
    }

    return result;
  }

  protected parseStreamChunk(chunk: any): ChatStreamChunk {
    const choice = chunk.choices[0];

    if (choice.delta.content) {
      return {
        type: "content",
        content: choice.delta.content,
      };
    }

    if (choice.finish_reason) {
      return { type: "done" };
    }

    return { type: "content", content: "" };
  }

  private formatTools(tools: any[]): OpenAICompatibleTool[] {
    return tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  private getEstimatedContextLength(modelId: string): number {
    // Estimate context length based on model name patterns
    if (modelId.toLowerCase().includes("32k")) return 32768;
    if (modelId.toLowerCase().includes("16k")) return 16384;
    if (modelId.toLowerCase().includes("8k")) return 8192;
    if (modelId.toLowerCase().includes("4k")) return 4096;
    if (modelId.toLowerCase().includes("llama")) return 4096;
    if (modelId.toLowerCase().includes("mistral")) return 8192;
    if (modelId.toLowerCase().includes("codellama")) return 16384;
    return 4096; // Default
  }

  private getEstimatedMaxTokens(modelId: string): number {
    return Math.floor(this.getEstimatedContextLength(modelId) * 0.75);
  }

  private estimateToolSupport(modelId: string): boolean {
    // Most modern local models support function calling
    const toolSupportedModels = [
      "llama",
      "mistral",
      "codellama",
      "vicuna",
      "alpaca",
      "wizard",
      "orca",
    ];
    return toolSupportedModels.some((model) => modelId.toLowerCase().includes(model));
  }

  private estimateVisionSupport(modelId: string): boolean {
    // Vision support is less common in local models
    const visionModels = ["llava", "vision", "multimodal"];
    return visionModels.some((model) => modelId.toLowerCase().includes(model));
  }

  private getEstimatedCapabilities(modelId: string): string[] {
    const capabilities = ["text-generation"];

    if (this.estimateToolSupport(modelId)) {
      capabilities.push("function-calling");
    }

    if (this.estimateVisionSupport(modelId)) {
      capabilities.push("vision");
    }

    if (modelId.toLowerCase().includes("code")) {
      capabilities.push("code-generation");
    }

    return capabilities;
  }

  private getDefaultModels(): ModelInfo[] {
    return [
      {
        name: "local-model",
        description: "Local OpenAI-compatible model",
        contextLength: 4096,
        maxTokens: 3072,
        supportsTools: true,
        supportsVision: false,
        pricing: { inputTokens: 0, outputTokens: 0, currency: "FREE" },
        capabilities: ["text-generation", "function-calling"],
      },
    ];
  }
}
