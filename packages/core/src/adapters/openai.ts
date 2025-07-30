/**
 * OpenAI LLM Adapter implementation for LlamaCLI
 */

import { BaseLLMAdapter } from "./base.js";
import { AdapterConfig, ChatOptions, ChatStreamChunk, ModelInfo } from "../types/adapters.js";
import { ChatMessage, ToolCall } from "../types/context.js";

/**
 * OpenAI API types
 */
interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAIChatRequest {
  model: string;
  messages: OpenAIMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
  tools?: OpenAITool[];
  tool_choice?: "auto" | "none" | { type: "function"; function: { name: string } };
}

interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: any;
  };
}

interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIStreamChunk {
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

interface OpenAIModelsResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>;
}

/**
 * OpenAI LLM Adapter
 */
export class OpenAIAdapter extends BaseLLMAdapter {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: AdapterConfig) {
    super(config);
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || "";
    this.baseUrl = config.baseUrl || "https://api.openai.com/v1";

    if (!this.apiKey) {
      throw new Error("OpenAI API key is required");
    }
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatMessage> {
    const model = this.config.model || "gpt-4";

    const request: OpenAIChatRequest = {
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

    // Add tools if provided
    if (options?.tools && options.tools.length > 0) {
      request.tools = this.formatTools(options.tools);
      request.tool_choice = options.toolChoice || "auto";
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          ...this.config.headers,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${error}`);
      }

      const data = (await response.json()) as OpenAIChatResponse;
      const choice = data.choices[0];

      if (!choice) {
        throw new Error("No response from OpenAI API");
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
        `OpenAI chat request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        { error }
      );
    }
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncIterable<ChatStreamChunk> {
    const model = this.config.model || "gpt-4";

    const request: OpenAIChatRequest = {
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

    // Add tools if provided
    if (options?.tools && options.tools.length > 0) {
      request.tools = this.formatTools(options.tools);
      request.tool_choice = options.toolChoice || "auto";
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          ...this.config.headers,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${error}`);
      }

      if (!response.body) {
        throw new Error("No response body from OpenAI API");
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
                const chunk: OpenAIStreamChunk = JSON.parse(line.slice(6));
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
                          type: "function",
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
                console.warn("Failed to parse OpenAI stream chunk:", line);
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
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...this.config.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = (await response.json()) as OpenAIModelsResponse;

      return data.data
        .filter((model) => model.id.includes("gpt"))
        .map((model) => ({
          name: model.id,
          description: `OpenAI ${model.id} model`,
          contextLength: this.getContextLength(model.id),
          maxTokens: this.getMaxTokens(model.id),
          supportsTools: this.supportsTools(model.id),
          supportsVision: this.supportsVision(model.id),
          pricing: this.getPricing(model.id),
          capabilities: this.getCapabilities(model.id),
        }));
    } catch (error) {
      // Return default models if API call fails
      return this.getDefaultModels();
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...this.config.headers,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  protected async performHealthCheck(): Promise<boolean> {
    return this.validateConfig();
  }

  protected formatMessages(messages: ChatMessage[]): OpenAIMessage[] {
    return messages.map((msg) => {
      const openaiMsg: OpenAIMessage = {
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content,
      };

      // Handle tool calls
      if (msg.tool_calls) {
        openaiMsg.tool_calls = msg.tool_calls.map((tc) => ({
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
        openaiMsg.role = "tool";
        openaiMsg.tool_call_id = msg.tool_call_id;
      }

      return openaiMsg;
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
      result.tool_calls = choice.message.tool_calls.map((tc: OpenAIToolCall) => ({
        id: tc.id,
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

  private formatTools(tools: any[]): OpenAITool[] {
    return tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  private getContextLength(modelId: string): number {
    if (modelId.includes("gpt-4")) {
      if (modelId.includes("32k")) return 32768;
      if (modelId.includes("turbo")) return 128000;
      return 8192;
    }
    if (modelId.includes("gpt-3.5")) {
      if (modelId.includes("16k")) return 16384;
      return 4096;
    }
    return 4096;
  }

  private getMaxTokens(modelId: string): number {
    return Math.floor(this.getContextLength(modelId) * 0.75);
  }

  private supportsTools(modelId: string): boolean {
    return modelId.includes("gpt-4") || modelId.includes("gpt-3.5-turbo");
  }

  private supportsVision(modelId: string): boolean {
    return modelId.includes("gpt-4") && modelId.includes("vision");
  }

  private getPricing(modelId: string) {
    // Simplified pricing - should be updated with actual OpenAI pricing
    const pricing = {
      "gpt-4": { inputTokens: 0.03, outputTokens: 0.06, currency: "USD" },
      "gpt-4-turbo": { inputTokens: 0.01, outputTokens: 0.03, currency: "USD" },
      "gpt-3.5-turbo": { inputTokens: 0.0015, outputTokens: 0.002, currency: "USD" },
    };

    for (const [model, price] of Object.entries(pricing)) {
      if (modelId.includes(model)) {
        return price;
      }
    }

    return { inputTokens: 0.01, outputTokens: 0.03, currency: "USD" };
  }

  private getCapabilities(modelId: string): string[] {
    const capabilities = ["text-generation"];

    if (this.supportsTools(modelId)) {
      capabilities.push("function-calling");
    }

    if (this.supportsVision(modelId)) {
      capabilities.push("vision");
    }

    return capabilities;
  }

  private getDefaultModels(): ModelInfo[] {
    return [
      {
        name: "gpt-4",
        description: "OpenAI GPT-4 model",
        contextLength: 8192,
        maxTokens: 6144,
        supportsTools: true,
        supportsVision: false,
        pricing: { inputTokens: 0.03, outputTokens: 0.06, currency: "USD" },
        capabilities: ["text-generation", "function-calling"],
      },
      {
        name: "gpt-4-turbo",
        description: "OpenAI GPT-4 Turbo model",
        contextLength: 128000,
        maxTokens: 96000,
        supportsTools: true,
        supportsVision: false,
        pricing: { inputTokens: 0.01, outputTokens: 0.03, currency: "USD" },
        capabilities: ["text-generation", "function-calling"],
      },
      {
        name: "gpt-3.5-turbo",
        description: "OpenAI GPT-3.5 Turbo model",
        contextLength: 4096,
        maxTokens: 3072,
        supportsTools: true,
        supportsVision: false,
        pricing: { inputTokens: 0.0015, outputTokens: 0.002, currency: "USD" },
        capabilities: ["text-generation", "function-calling"],
      },
    ];
  }
}
