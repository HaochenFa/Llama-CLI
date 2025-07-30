/**
 * Google Gemini LLM Adapter implementation for LlamaCLI
 */

import { BaseLLMAdapter } from "./base.js";
import { AdapterConfig, ChatOptions, ChatStreamChunk, ModelInfo } from "../types/adapters.js";
import { ChatMessage, ToolCall } from "../types/context.js";

/**
 * Gemini API types
 */
interface GeminiContent {
  role?: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiPart {
  text?: string;
  functionCall?: {
    name: string;
    args: any;
  };
  functionResponse?: {
    name: string;
    response: any;
  };
}

interface GeminiGenerateRequest {
  contents: GeminiContent[];
  tools?: GeminiTool[];
  toolConfig?: {
    functionCallingConfig: {
      mode: "AUTO" | "ANY" | "NONE";
      allowedFunctionNames?: string[];
    };
  };
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  systemInstruction?: {
    parts: GeminiPart[];
  };
}

interface GeminiTool {
  functionDeclarations: GeminiFunctionDeclaration[];
}

interface GeminiFunctionDeclaration {
  name: string;
  description?: string;
  parameters?: any;
}

interface GeminiGenerateResponse {
  candidates: Array<{
    content: GeminiContent;
    finishReason: string;
    index: number;
    safetyRatings?: any[];
  }>;
  promptFeedback?: {
    safetyRatings: any[];
  };
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GeminiStreamResponse {
  candidates?: Array<{
    content?: GeminiContent;
    finishReason?: string;
    index?: number;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GeminiModelsResponse {
  models: Array<{
    name: string;
    displayName: string;
    description: string;
    inputTokenLimit: number;
    outputTokenLimit: number;
    supportedGenerationMethods: string[];
  }>;
}

/**
 * Gemini LLM Adapter
 */
export class GeminiAdapter extends BaseLLMAdapter {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: AdapterConfig) {
    super(config);
    this.apiKey = config.apiKey || process.env.GOOGLE_API_KEY || "";
    this.baseUrl = config.baseUrl || "https://generativelanguage.googleapis.com/v1beta";

    if (!this.apiKey) {
      throw new Error("Google API key is required");
    }
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatMessage> {
    const model = this.config.model || "gemini-1.5-pro";
    const { systemInstruction, contents } = this.formatMessages(messages);

    const request: GeminiGenerateRequest = {
      contents,
      generationConfig: {
        temperature: options?.temperature || 0.7,
        topP: options?.topP || 0.95,
        topK: options?.topK || 40,
        maxOutputTokens: options?.maxTokens || 2048,
        stopSequences: options?.stopSequences,
      },
    };

    if (systemInstruction) {
      request.systemInstruction = systemInstruction;
    }

    // Add tools if provided
    if (options?.tools && options.tools.length > 0) {
      request.tools = this.formatTools(options.tools);
      request.toolConfig = {
        functionCallingConfig: {
          mode: options.toolChoice === "none" ? "NONE" : "AUTO",
        },
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...this.config.headers,
          },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${error}`);
      }

      const data = (await response.json()) as GeminiGenerateResponse;

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error("No response from Gemini API");
      }

      const candidate = data.candidates[0];
      const result: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: this.extractTextContent(candidate.content),
        timestamp: Date.now(),
      };

      // Handle function calls
      const toolCalls = this.extractToolCalls(candidate.content);
      if (toolCalls.length > 0) {
        result.tool_calls = toolCalls;
      }

      // Update usage stats
      if (data.usageMetadata) {
        this.stats.requestCount++;
        this.stats.totalTokens += data.usageMetadata.totalTokenCount;
        this.stats.inputTokens += data.usageMetadata.promptTokenCount;
        this.stats.outputTokens += data.usageMetadata.candidatesTokenCount;
      }

      return result;
    } catch (error) {
      this.stats.errorCount++;
      throw this.createAdapterError(
        "NETWORK_ERROR",
        `Gemini chat request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        { error }
      );
    }
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncIterable<ChatStreamChunk> {
    const model = this.config.model || "gemini-1.5-pro";
    const { systemInstruction, contents } = this.formatMessages(messages);

    const request: GeminiGenerateRequest = {
      contents,
      generationConfig: {
        temperature: options?.temperature || 0.7,
        topP: options?.topP || 0.95,
        topK: options?.topK || 40,
        maxOutputTokens: options?.maxTokens || 2048,
        stopSequences: options?.stopSequences,
      },
    };

    if (systemInstruction) {
      request.systemInstruction = systemInstruction;
    }

    // Add tools if provided
    if (options?.tools && options.tools.length > 0) {
      request.tools = this.formatTools(options.tools);
      request.toolConfig = {
        functionCallingConfig: {
          mode: options.toolChoice === "none" ? "NONE" : "AUTO",
        },
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${model}:streamGenerateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...this.config.headers,
          },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${error}`);
      }

      if (!response.body) {
        throw new Error("No response body from Gemini API");
      }

      const reader = response.body.getReader();
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
            if (line.trim() === "" || !line.startsWith("data: ")) {
              continue;
            }

            try {
              const chunk: GeminiStreamResponse = JSON.parse(line.slice(6));

              if (chunk.candidates && chunk.candidates.length > 0) {
                const candidate = chunk.candidates[0];

                if (candidate.content) {
                  // Handle text content
                  const textContent = this.extractTextContent(candidate.content);
                  if (textContent) {
                    yield {
                      type: "content",
                      content: textContent,
                    };
                  }

                  // Handle function calls
                  const toolCalls = this.extractToolCalls(candidate.content);
                  for (const toolCall of toolCalls) {
                    yield {
                      type: "tool_call",
                      toolCall: toolCall,
                    };
                  }
                }

                if (candidate.finishReason) {
                  yield { type: "done" };
                  return;
                }
              }
            } catch (parseError) {
              console.warn("Failed to parse Gemini stream chunk:", line);
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
      const response = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`, {
        headers: {
          ...this.config.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = (await response.json()) as GeminiModelsResponse;

      return data.models
        .filter(
          (model) =>
            model.name.includes("gemini") &&
            model.supportedGenerationMethods.includes("generateContent")
        )
        .map((model) => ({
          name: model.name.replace("models/", ""),
          description: model.description || model.displayName,
          contextLength: model.inputTokenLimit,
          maxTokens: model.outputTokenLimit,
          supportsTools: true,
          supportsVision: model.name.includes("vision") || model.name.includes("pro"),
          pricing: this.getPricing(model.name),
          capabilities: this.getCapabilities(model.name),
        }));
    } catch (error) {
      // Return default models if API call fails
      return this.getDefaultModels();
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`, {
        headers: {
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

  protected formatMessages(messages: ChatMessage[]): {
    systemInstruction?: { parts: GeminiPart[] };
    contents: GeminiContent[];
  } {
    const systemMessages = messages.filter((msg) => msg.role === "system");
    const userMessages = messages.filter((msg) => msg.role !== "system");

    const systemInstruction =
      systemMessages.length > 0
        ? {
            parts: systemMessages.map((msg) => ({ text: msg.content })),
          }
        : undefined;

    const contents: GeminiContent[] = [];

    for (const msg of userMessages) {
      const parts: GeminiPart[] = [];

      // Add text content
      if (msg.content) {
        parts.push({ text: msg.content });
      }

      // Add function calls
      if (msg.tool_calls) {
        for (const toolCall of msg.tool_calls) {
          parts.push({
            functionCall: {
              name: toolCall.function.name,
              args: JSON.parse(toolCall.function.arguments),
            },
          });
        }
      }

      // Handle function responses
      if (msg.role === "tool" && msg.tool_call_id) {
        // Find the corresponding function call name
        const functionName = this.findFunctionNameForToolCall(messages, msg.tool_call_id);
        if (functionName) {
          parts.push({
            functionResponse: {
              name: functionName,
              response: { result: msg.content },
            },
          });
        }
      }

      if (parts.length > 0) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts,
        });
      }
    }

    return { systemInstruction, contents };
  }

  protected parseResponse(response: any): ChatMessage {
    const candidate = response.candidates[0];
    const result: ChatMessage = {
      id: Date.now().toString(),
      role: "assistant",
      content: this.extractTextContent(candidate.content),
      timestamp: Date.now(),
    };

    const toolCalls = this.extractToolCalls(candidate.content);
    if (toolCalls.length > 0) {
      result.tool_calls = toolCalls;
    }

    return result;
  }

  protected parseStreamChunk(chunk: any): ChatStreamChunk {
    if (chunk.candidates && chunk.candidates.length > 0) {
      const candidate = chunk.candidates[0];

      if (candidate.content) {
        const textContent = this.extractTextContent(candidate.content);
        if (textContent) {
          return {
            type: "content",
            content: textContent,
          };
        }
      }

      if (candidate.finishReason) {
        return { type: "done" };
      }
    }

    return { type: "content", content: "" };
  }

  private formatTools(tools: any[]): GeminiTool[] {
    return [
      {
        functionDeclarations: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        })),
      },
    ];
  }

  private extractTextContent(content: GeminiContent): string {
    return content.parts
      .filter((part) => part.text)
      .map((part) => part.text)
      .join("");
  }

  private extractToolCalls(content: GeminiContent): ToolCall[] {
    return content.parts
      .filter((part) => part.functionCall)
      .map((part) => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: "function" as const,
        function: {
          name: part.functionCall!.name,
          arguments: JSON.stringify(part.functionCall!.args),
        },
      }));
  }

  private findFunctionNameForToolCall(
    messages: ChatMessage[],
    toolCallId: string
  ): string | undefined {
    // Look for the function call that corresponds to this tool call ID
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.tool_calls) {
        const toolCall = msg.tool_calls.find((tc) => tc.id === toolCallId);
        if (toolCall) {
          return toolCall.function.name;
        }
      }
    }
    return undefined;
  }

  private getPricing(modelName: string) {
    // Simplified pricing - should be updated with actual Google pricing
    const pricing = {
      "gemini-1.5-pro": { inputTokens: 0.0035, outputTokens: 0.0105, currency: "USD" },
      "gemini-1.5-flash": { inputTokens: 0.00035, outputTokens: 0.00105, currency: "USD" },
      "gemini-1.0-pro": { inputTokens: 0.0005, outputTokens: 0.0015, currency: "USD" },
    };

    for (const [model, price] of Object.entries(pricing)) {
      if (modelName.includes(model)) {
        return price;
      }
    }

    return { inputTokens: 0.001, outputTokens: 0.003, currency: "USD" };
  }

  private getCapabilities(modelName: string): string[] {
    const capabilities = ["text-generation"];

    capabilities.push("function-calling");

    if (modelName.includes("vision") || modelName.includes("pro")) {
      capabilities.push("vision");
    }

    return capabilities;
  }

  private getDefaultModels(): ModelInfo[] {
    return [
      {
        name: "gemini-1.5-pro",
        description: "Google Gemini 1.5 Pro - Most capable model",
        contextLength: 2097152,
        maxTokens: 8192,
        supportsTools: true,
        supportsVision: true,
        pricing: { inputTokens: 0.0035, outputTokens: 0.0105, currency: "USD" },
        capabilities: ["text-generation", "function-calling", "vision"],
      },
      {
        name: "gemini-1.5-flash",
        description: "Google Gemini 1.5 Flash - Fast and efficient",
        contextLength: 1048576,
        maxTokens: 8192,
        supportsTools: true,
        supportsVision: true,
        pricing: { inputTokens: 0.00035, outputTokens: 0.00105, currency: "USD" },
        capabilities: ["text-generation", "function-calling", "vision"],
      },
      {
        name: "gemini-1.0-pro",
        description: "Google Gemini 1.0 Pro - Reliable performance",
        contextLength: 32768,
        maxTokens: 2048,
        supportsTools: true,
        supportsVision: false,
        pricing: { inputTokens: 0.0005, outputTokens: 0.0015, currency: "USD" },
        capabilities: ["text-generation", "function-calling"],
      },
    ];
  }
}
