/**
 * Adapter factory for creating LLM adapters
 */

import {
  OllamaAdapter,
  OpenAIAdapter,
  ClaudeAdapter,
  GeminiAdapter,
  OpenAICompatibleAdapter,
} from "@llamacli/core";

export async function createAdapter(profile: any, config: any) {
  switch (profile.adapter) {
    case "ollama":
      return new OllamaAdapter({
        type: "ollama",
        baseUrl: profile.endpoint || "http://localhost:11434",
        model: profile.model,
        timeout: profile.timeout || 30000,
        retries: profile.retries || 3,
      });

    case "openai":
      return new OpenAIAdapter({
        type: "openai",
        baseUrl: profile.endpoint || "https://api.openai.com/v1",
        model: profile.model || "gpt-4",
        apiKey: profile.apiKey || process.env.OPENAI_API_KEY,
        timeout: profile.timeout || 30000,
        retries: profile.retries || 3,
      });

    case "claude":
      return new ClaudeAdapter({
        type: "claude",
        baseUrl: profile.endpoint || "https://api.anthropic.com/v1",
        model: profile.model || "claude-3-sonnet-20240229",
        apiKey: profile.apiKey || process.env.ANTHROPIC_API_KEY,
        timeout: profile.timeout || 30000,
        retries: profile.retries || 3,
      });

    case "gemini":
      return new GeminiAdapter({
        type: "gemini",
        baseUrl: profile.endpoint || "https://generativelanguage.googleapis.com/v1beta",
        model: profile.model || "gemini-1.5-pro",
        apiKey: profile.apiKey || process.env.GOOGLE_API_KEY,
        timeout: profile.timeout || 30000,
        retries: profile.retries || 3,
      });

    case "openai-compatible":
    case "lmstudio":
    case "oobabooga":
    case "vllm":
      return new OpenAICompatibleAdapter({
        type: "openai-compatible",
        baseUrl: profile.endpoint || "http://localhost:1234/v1",
        model: profile.model || "local-model",
        apiKey: profile.apiKey, // Optional for local services
        timeout: profile.timeout || 30000,
        retries: profile.retries || 3,
      });

    default:
      throw new Error(`Unsupported adapter type: ${profile.adapter}`);
  }
}
