/**
 * Claude (Anthropic) LLM Adapter implementation for LlamaCLI
 */

import { BaseLLMAdapter } from "./base.js";
import { AdapterConfig, ChatOptions, ChatStreamChunk, ModelInfo } from "../types/adapters.js";
import { ChatMessage, ToolCall } from "../types/context.js";

/**
 * Claude API types
 */
interface ClaudeMessage {
  role: "user" | "assistant";
  content: string | ClaudeContent[];
}

interface ClaudeContent {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: any;
  content?: string;
  tool_use_id?: string;
}

interface ClaudeChatRequest {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
  system?: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  stream?: boolean;
  tools?: ClaudeTool[];
}

interface ClaudeTool {
  name: string;
  description?: string;
  input_schema: any;
}

interface ClaudeChatResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: ClaudeContent[];
  model: string;
  stop_reason: string;
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface ClaudeStreamEvent {
  type:
    | "message_start"
    | "content_block_start"
    | "content_block_delta"
    | "content_block_stop"
    | "message_delta"
    | "message_stop";
  message?: Partial<ClaudeChatResponse>;
  content_block?: ClaudeContent;
  delta?: {
    type: "text_delta" | "input_json_delta";
    text?: string;
    partial_json?: string;
  };
  index?: number;
}

/**
 * Claude LLM Adapter
 */
export class ClaudeAdapter extends BaseLLMAdapter {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: AdapterConfig) {
    super(config);
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || "";
    this.baseUrl = config.baseUrl || "https://api.anthropic.com/v1";

    if (!this.apiKey) {
      throw new Error("Anthropic API key is required");
    }
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatMessage> {
    const model = this.config.model || "claude-3-sonnet-20240229";
    const { systemMessage, userMessages } = this.separateSystemMessage(messages);

    const request: ClaudeChatRequest = {
      model,
      max_tokens: options?.maxTokens || 2048,
      messages: this.formatMessages(userMessages),
      temperature: options?.temperature || 0.7,
      top_p: options?.topP || 1.0,
      top_k: options?.topK || 40,
      stop_sequences: options?.stopSequences,
      stream: false,
    };

    if (systemMessage) {
      request.system = systemMessage;
    }

    // Add tools if provided
    if (options?.tools && options.tools.length > 0) {
      request.tools = this.formatTools(options.tools);
    }

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          ...this.config.headers,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${response.status} ${error}`);
      }

      const data = (await response.json()) as ClaudeChatResponse;

      const result: ChatMessage = {
        id: data.id,
        role: "assistant",
        content: this.extractTextContent(data.content),
        timestamp: Date.now(),
      };

      // Handle tool calls
      const toolCalls = this.extractToolCalls(data.content);
      if (toolCalls.length > 0) {
        result.tool_calls = toolCalls;
      }

      // Update usage stats
      if (data.usage) {
        this.stats.requestCount++;
        this.stats.totalTokens += data.usage.input_tokens + data.usage.output_tokens;
        this.stats.inputTokens += data.usage.input_tokens;
        this.stats.outputTokens += data.usage.output_tokens;
      }

      return result;
    } catch (error) {
      this.stats.errorCount++;
      throw this.createAdapterError(
        "NETWORK_ERROR",
        `Claude chat request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        { error }
      );
    }
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncIterable<ChatStreamChunk> {
    const model = this.config.model || "claude-3-sonnet-20240229";
    const { systemMessage, userMessages } = this.separateSystemMessage(messages);

    const request: ClaudeChatRequest = {
      model,
      max_tokens: options?.maxTokens || 2048,
      messages: this.formatMessages(userMessages),
      temperature: options?.temperature || 0.7,
      top_p: options?.topP || 1.0,
      top_k: options?.topK || 40,
      stop_sequences: options?.stopSequences,
      stream: true,
    };

    if (systemMessage) {
      request.system = systemMessage;
    }

    // Add tools if provided
    if (options?.tools && options.tools.length > 0) {
      request.tools = this.formatTools(options.tools);
    }

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          ...this.config.headers,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${response.status} ${error}`);
      }

      if (!response.body) {
        throw new Error("No response body from Claude API");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let toolCallBuffer: { [id: string]: { name?: string; input: string } } = {};

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim() === "" || !line.startsWith("data: ")) {
              continue;
            }

            try {
              const event: ClaudeStreamEvent = JSON.parse(line.slice(6));

              if (event.type === "content_block_delta" && event.delta) {
                if (event.delta.type === "text_delta" && event.delta.text) {
                  yield {
                    type: "content",
                    content: event.delta.text,
                  };
                } else if (event.delta.type === "input_json_delta" && event.delta.partial_json) {
                  // Handle tool call input streaming
                  const blockIndex = event.index || 0;
                  if (event.content_block?.id) {
                    if (!toolCallBuffer[event.content_block.id]) {
                      toolCallBuffer[event.content_block.id] = { input: "" };
                    }
                    toolCallBuffer[event.content_block.id].input += event.delta.partial_json;
                  }
                }
              } else if (event.type === "content_block_start" && event.content_block) {
                if (event.content_block.type === "tool_use") {
                  const toolCall = event.content_block;
                  if (toolCall.id && toolCall.name) {
                    toolCallBuffer[toolCall.id] = {
                      name: toolCall.name,
                      input: "",
                    };
                  }
                }
              } else if (event.type === "content_block_stop") {
                // Emit completed tool calls
                for (const [id, toolCall] of Object.entries(toolCallBuffer)) {
                  if (toolCall.name) {
                    yield {
                      type: "tool_call",
                      toolCall: {
                        id,
                        type: "function" as const,
                        function: {
                          name: toolCall.name,
                          arguments: toolCall.input,
                        },
                      },
                    };
                  }
                }
                toolCallBuffer = {};
              } else if (event.type === "message_stop") {
                yield { type: "done" };
                return;
              }
            } catch (parseError) {
              console.warn("Failed to parse Claude stream event:", line);
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
    // Claude doesn't have a public models endpoint, so return known models
    return this.getDefaultModels();
  }

  async validateConfig(): Promise<boolean> {
    try {
      // Test with a minimal request
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          ...this.config.headers,
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1,
          messages: [{ role: "user", content: "Hi" }],
        }),
      });

      // Even if the request fails due to rate limits, a 200 or 429 means auth is valid
      return response.status === 200 || response.status === 429;
    } catch {
      return false;
    }
  }

  protected async performHealthCheck(): Promise<boolean> {
    return this.validateConfig();
  }

  protected formatMessages(messages: ChatMessage[]): ClaudeMessage[] {
    return messages
      .map((msg) => {
        if (msg.role === "system") {
          // System messages are handled separately in Claude
          return null;
        }

        const content: ClaudeContent[] = [];

        // Add text content
        if (msg.content) {
          content.push({
            type: "text",
            text: msg.content,
          });
        }

        // Add tool calls
        if (msg.tool_calls) {
          for (const toolCall of msg.tool_calls) {
            content.push({
              type: "tool_use",
              id: toolCall.id,
              name: toolCall.function.name,
              input: JSON.parse(toolCall.function.arguments),
            });
          }
        }

        // Handle tool results
        if (msg.role === "tool" && msg.tool_call_id) {
          content.push({
            type: "tool_result",
            tool_use_id: msg.tool_call_id,
            content: msg.content,
          });
        }

        return {
          role: msg.role === "user" ? "user" : "assistant",
          content: content.length === 1 && content[0].type === "text" ? content[0].text! : content,
        };
      })
      .filter(Boolean) as ClaudeMessage[];
  }

  protected parseResponse(response: any): ChatMessage {
    const result: ChatMessage = {
      id: response.id,
      role: "assistant",
      content: this.extractTextContent(response.content),
      timestamp: Date.now(),
    };

    const toolCalls = this.extractToolCalls(response.content);
    if (toolCalls.length > 0) {
      result.tool_calls = toolCalls;
    }

    return result;
  }

  protected parseStreamChunk(chunk: any): ChatStreamChunk {
    if (chunk.type === "content_block_delta" && chunk.delta?.text) {
      return {
        type: "content",
        content: chunk.delta.text,
      };
    }

    if (chunk.type === "message_stop") {
      return { type: "done" };
    }

    return { type: "content", content: "" };
  }

  private separateSystemMessage(messages: ChatMessage[]): {
    systemMessage?: string;
    userMessages: ChatMessage[];
  } {
    const systemMessages = messages.filter((msg) => msg.role === "system");
    const userMessages = messages.filter((msg) => msg.role !== "system");

    const systemMessage =
      systemMessages.length > 0 ? systemMessages.map((msg) => msg.content).join("\n\n") : undefined;

    return { systemMessage, userMessages };
  }

  private formatTools(tools: any[]): ClaudeTool[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));
  }

  private extractTextContent(content: ClaudeContent[]): string {
    return content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
  }

  private extractToolCalls(content: ClaudeContent[]): ToolCall[] {
    return content
      .filter((block) => block.type === "tool_use")
      .map((block) => ({
        id: block.id!,
        type: "function" as const,
        function: {
          name: block.name!,
          arguments: JSON.stringify(block.input),
        },
      }));
  }

  private getDefaultModels(): ModelInfo[] {
    return [
      {
        name: "claude-3-opus-20240229",
        description: "Claude 3 Opus - Most capable model",
        contextLength: 200000,
        maxTokens: 4096,
        supportsTools: true,
        supportsVision: true,
        pricing: { inputTokens: 0.015, outputTokens: 0.075, currency: "USD" },
        capabilities: ["text-generation", "function-calling", "vision"],
      },
      {
        name: "claude-3-sonnet-20240229",
        description: "Claude 3 Sonnet - Balanced performance and speed",
        contextLength: 200000,
        maxTokens: 4096,
        supportsTools: true,
        supportsVision: true,
        pricing: { inputTokens: 0.003, outputTokens: 0.015, currency: "USD" },
        capabilities: ["text-generation", "function-calling", "vision"],
      },
      {
        name: "claude-3-haiku-20240307",
        description: "Claude 3 Haiku - Fastest and most affordable",
        contextLength: 200000,
        maxTokens: 4096,
        supportsTools: true,
        supportsVision: true,
        pricing: { inputTokens: 0.00025, outputTokens: 0.00125, currency: "USD" },
        capabilities: ["text-generation", "function-calling", "vision"],
      },
    ];
  }
}
