// src/lib/adapters/adapter-factory.ts

import { LLMAdapter } from "./base.adapter.js";
import { OllamaAdapter } from "./ollama.adapter.js";
import { vLLMAdapter } from "./vllm.adapter.js";
import { OpenAIAdapter } from "./openai.adapter.js";
import { AnthropicAdapter } from "./anthropic.adapter.js";
import { OpenAICompatibleAdapter } from "./openai-compatible.adapter.js";
import { GeminiAdapter } from "./gemini.adapter.js";
import { LLMProfile } from "../config-store.js";

/**
 * 适配器工厂类，负责根据配置创建相应的LLM适配器实例
 */
export class AdapterFactory {
  /**
   * 根据LLM配置文件创建适配器实例
   * @param profile LLM配置文件
   * @param debug 是否启用调试模式
   * @returns LLM适配器实例
   */
  public static createAdapter(profile: LLMProfile, debug: boolean = false): LLMAdapter {
    switch (profile.type) {
      case "ollama":
        return new OllamaAdapter(profile.endpoint, debug);

      case "vllm":
        // 从配置中获取模型名称，如果没有则使用默认值
        const model = profile.model || "default";
        return new vLLMAdapter(profile.endpoint, debug, model);

      case "openai":
        if (!profile.apiKey) {
          throw new Error("OpenAI API key is required");
        }
        return new OpenAIAdapter(
          profile.apiKey,
          debug,
          profile.model || "gpt-3.5-turbo",
          profile.endpoint || "https://api.openai.com"
        );

      case "anthropic":
        if (!profile.apiKey) {
          throw new Error("Anthropic API key is required");
        }
        return new AnthropicAdapter(
          profile.apiKey,
          debug,
          profile.model || "claude-3-sonnet-20240229",
          profile.endpoint || "https://api.anthropic.com"
        );

      case "openai-compatible":
        return new OpenAICompatibleAdapter(
          profile.endpoint,
          profile.apiKey || "",
          profile.model || "default",
          debug,
          profile.serviceName || "OpenAI-Compatible"
        );

      case "gemini":
        if (!profile.apiKey) {
          throw new Error("Gemini API key is required");
        }
        return new GeminiAdapter(
          profile.apiKey,
          debug,
          profile.model || "gemini-pro",
          profile.endpoint || "https://generativelanguage.googleapis.com"
        );

      default:
        throw new Error(`Unsupported LLM type: ${profile.type}`);
    }
  }

  /**
   * 测试指定配置的连接
   * @param profile LLM配置文件
   * @returns 连接测试结果
   */
  public static async testConnection(
    profile: LLMProfile
  ): Promise<{ success: boolean; error?: string; models?: string[] }> {
    try {
      const adapter = AdapterFactory.createAdapter(profile, false);

      // 检查适配器是否有测试连接方法
      if ("testConnection" in adapter && typeof adapter.testConnection === "function") {
        return await (adapter as any).testConnection();
      } else {
        // 如果没有测试方法，尝试创建一个简单的聊天请求
        try {
          const testMessages = [{ role: "user" as const, content: "test" }];

          // 尝试获取第一个响应块
          const iterable = adapter.chatStream(testMessages, []);
          const iterator = iterable[Symbol.asyncIterator]();
          const firstResult = await iterator.next();

          return {
            success: !firstResult.done,
            models: ["Connection test successful"],
          };
        } catch (error) {
          return {
            success: false,
            error: `Connection test failed: ${(error as Error).message}`,
          };
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to create adapter: ${(error as Error).message}`,
      };
    }
  }

  /**
   * 获取支持的LLM类型列表
   * @returns 支持的LLM类型数组
   */
  public static getSupportedTypes(): Array<{
    type: string;
    name: string;
    description: string;
    available: boolean;
  }> {
    return [
      {
        type: "ollama",
        name: "Ollama",
        description: "Local LLM runtime with support for various models",
        available: true,
      },
      {
        type: "vllm",
        name: "vLLM",
        description: "High-performance LLM inference server with OpenAI-compatible API",
        available: true,
      },
      {
        type: "openai",
        name: "OpenAI",
        description: "Official OpenAI API (GPT-3.5, GPT-4, etc.)",
        available: true,
      },
      {
        type: "anthropic",
        name: "Anthropic Claude",
        description: "Anthropic Claude API (Claude-3 series)",
        available: true,
      },
      {
        type: "openai-compatible",
        name: "OpenAI-Compatible",
        description: "Any service with OpenAI-compatible API (Together AI, Groq, DeepSeek, etc.)",
        available: true,
      },
      {
        type: "gemini",
        name: "Google Gemini",
        description: "Google Gemini API (Gemini Pro, Gemini Pro Vision)",
        available: true,
      },
    ];
  }

  /**
   * 验证LLM配置是否有效
   * @param profile LLM配置文件
   * @returns 验证结果
   */
  public static validateProfile(profile: LLMProfile): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查必需字段
    if (!profile.name || !profile.name.trim()) {
      errors.push("Profile name is required");
    }

    if (!profile.type) {
      errors.push("Profile type is required");
    }

    if (!profile.endpoint || !profile.endpoint.trim()) {
      errors.push("Endpoint URL is required");
    }

    // 检查类型是否支持
    const supportedTypes = AdapterFactory.getSupportedTypes().map((t) => t.type);
    if (profile.type && !supportedTypes.includes(profile.type)) {
      errors.push(
        `Unsupported LLM type: ${profile.type}. Supported types: ${supportedTypes.join(", ")}`
      );
    }

    // 验证URL格式
    if (profile.endpoint) {
      try {
        new URL(profile.endpoint);
      } catch {
        errors.push("Invalid endpoint URL format");
      }
    }

    // 特定类型的验证
    switch (profile.type) {
      case "ollama":
        // Ollama 特定验证
        if (
          profile.endpoint &&
          !profile.endpoint.includes("11434") &&
          !profile.endpoint.includes("localhost")
        ) {
          // 这只是一个警告，不是错误
        }
        break;

      case "vllm":
        // vLLM 特定验证
        if (profile.endpoint && !profile.endpoint.includes("/v1")) {
          // 检查是否包含 v1 路径，如果没有可能需要提醒
        }
        break;

      case "openai":
        // OpenAI 特定验证
        if (!profile.apiKey || !profile.apiKey.trim()) {
          errors.push("OpenAI API key is required");
        }
        if (profile.apiKey && !profile.apiKey.startsWith("sk-")) {
          errors.push("OpenAI API key should start with 'sk-'");
        }
        break;

      case "anthropic":
        // Anthropic 特定验证
        if (!profile.apiKey || !profile.apiKey.trim()) {
          errors.push("Anthropic API key is required");
        }
        break;

      case "openai-compatible":
        // OpenAI 兼容服务验证
        if (!profile.model || !profile.model.trim()) {
          errors.push("Model name is required for OpenAI-compatible services");
        }
        break;

      case "gemini":
        // Gemini 特定验证
        if (!profile.apiKey || !profile.apiKey.trim()) {
          errors.push("Gemini API key is required");
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取默认配置建议
   * @param type LLM类型
   * @returns 默认配置建议
   */
  public static getDefaultConfig(
    type: "ollama" | "vllm" | "openai" | "anthropic" | "openai-compatible" | "gemini"
  ): Partial<LLMProfile> {
    switch (type) {
      case "ollama":
        return {
          type: "ollama",
          endpoint: "http://localhost:11434",
        };

      case "vllm":
        return {
          type: "vllm",
          endpoint: "http://localhost:8000",
        };

      case "openai":
        return {
          type: "openai",
          endpoint: "https://api.openai.com",
          model: "gpt-3.5-turbo",
        };

      case "anthropic":
        return {
          type: "anthropic",
          endpoint: "https://api.anthropic.com",
          model: "claude-3-sonnet-20240229",
        };

      case "openai-compatible":
        return {
          type: "openai-compatible",
          endpoint: "http://localhost:8000",
          model: "default",
          serviceName: "Custom Service",
        };

      case "gemini":
        return {
          type: "gemini",
          endpoint: "https://generativelanguage.googleapis.com",
          model: "gemini-pro",
        };

      default:
        return {};
    }
  }
}
