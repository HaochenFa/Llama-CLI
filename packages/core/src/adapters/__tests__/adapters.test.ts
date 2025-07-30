/**
 * Tests for LLM Adapters
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { OpenAIAdapter } from "../openai.js";
import { ClaudeAdapter } from "../claude.js";
import { GeminiAdapter } from "../gemini.js";
import { OllamaAdapter } from "../ollama.js";
import { OpenAICompatibleAdapter } from "../openai-compatible.js";
import { AdapterConfig } from "../../types/adapters.js";

// Mock fetch globally
global.fetch = vi.fn();

describe("LLM Adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("OpenAI Adapter", () => {
    const config: AdapterConfig = {
      type: "openai",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4",
      apiKey: "test-api-key",
      timeout: 30000,
      retries: 3,
    };

    it("should create OpenAI adapter with valid config", () => {
      const adapter = new OpenAIAdapter(config);
      expect(adapter).toBeInstanceOf(OpenAIAdapter);
      expect(adapter.getConfig().type).toBe("openai");
    });

    it("should throw error without API key", () => {
      const invalidConfig = { ...config, apiKey: undefined };
      expect(() => new OpenAIAdapter(invalidConfig)).toThrow("OpenAI API key is required");
    });

    it("should validate config successfully", async () => {
      const adapter = new OpenAIAdapter(config);

      // Mock successful response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const isValid = await adapter.validateConfig();
      expect(isValid).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/models",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-key",
          }),
        })
      );
    });

    it("should return default models when API call fails", async () => {
      const adapter = new OpenAIAdapter(config);

      // Mock failed response
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      const models = await adapter.getModels();
      expect(models).toHaveLength(3);
      expect(models[0].name).toBe("gpt-4");
      expect(models[1].name).toBe("gpt-4-turbo");
      expect(models[2].name).toBe("gpt-3.5-turbo");
    });
  });

  describe("Claude Adapter", () => {
    const config: AdapterConfig = {
      type: "claude",
      baseUrl: "https://api.anthropic.com/v1",
      model: "claude-3-sonnet-20240229",
      apiKey: "test-api-key",
      timeout: 30000,
      retries: 3,
    };

    it("should create Claude adapter with valid config", () => {
      const adapter = new ClaudeAdapter(config);
      expect(adapter).toBeInstanceOf(ClaudeAdapter);
      expect(adapter.getConfig().type).toBe("claude");
    });

    it("should throw error without API key", () => {
      const invalidConfig = { ...config, apiKey: undefined };
      expect(() => new ClaudeAdapter(invalidConfig)).toThrow("Anthropic API key is required");
    });

    it("should return default models", async () => {
      const adapter = new ClaudeAdapter(config);
      const models = await adapter.getModels();

      expect(models).toHaveLength(3);
      expect(models[0].name).toBe("claude-3-opus-20240229");
      expect(models[1].name).toBe("claude-3-sonnet-20240229");
      expect(models[2].name).toBe("claude-3-haiku-20240307");
    });
  });

  describe("Gemini Adapter", () => {
    const config: AdapterConfig = {
      type: "gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      model: "gemini-1.5-pro",
      apiKey: "test-api-key",
      timeout: 30000,
      retries: 3,
    };

    it("should create Gemini adapter with valid config", () => {
      const adapter = new GeminiAdapter(config);
      expect(adapter).toBeInstanceOf(GeminiAdapter);
      expect(adapter.getConfig().type).toBe("gemini");
    });

    it("should throw error without API key", () => {
      const invalidConfig = { ...config, apiKey: undefined };
      expect(() => new GeminiAdapter(invalidConfig)).toThrow("Google API key is required");
    });

    it("should validate config successfully", async () => {
      const adapter = new GeminiAdapter(config);

      // Mock successful response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      });

      const isValid = await adapter.validateConfig();
      expect(isValid).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://generativelanguage.googleapis.com/v1beta/models?key=test-api-key",
        expect.objectContaining({
          headers: expect.any(Object),
        })
      );
    });

    it("should return default models when API call fails", async () => {
      const adapter = new GeminiAdapter(config);

      // Mock failed response
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      const models = await adapter.getModels();
      expect(models).toHaveLength(3);
      expect(models[0].name).toBe("gemini-1.5-pro");
      expect(models[1].name).toBe("gemini-1.5-flash");
      expect(models[2].name).toBe("gemini-1.0-pro");
    });
  });

  describe("Ollama Adapter", () => {
    const config: AdapterConfig = {
      type: "ollama",
      baseUrl: "http://localhost:11434",
      model: "llama3.2",
      timeout: 30000,
      retries: 3,
    };

    it("should create Ollama adapter with valid config", () => {
      const adapter = new OllamaAdapter(config);
      expect(adapter).toBeInstanceOf(OllamaAdapter);
      expect(adapter.getConfig().type).toBe("ollama");
    });

    it("should validate config successfully", async () => {
      const adapter = new OllamaAdapter(config);

      // Mock successful response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      const isValid = await adapter.validateConfig();
      expect(isValid).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith("http://localhost:11434/api/tags");
    });

    it("should return default models", async () => {
      const adapter = new OllamaAdapter(config);
      const models = await adapter.getModels();

      expect(models).toHaveLength(1);
      expect(models[0].name).toBe("llama3.2");
    });
  });

  describe("OpenAI Compatible Adapter", () => {
    const config: AdapterConfig = {
      type: "openai-compatible",
      baseUrl: "http://localhost:1234/v1",
      model: "local-model",
      timeout: 30000,
      retries: 3,
    };

    it("should create OpenAI Compatible adapter with valid config", () => {
      const adapter = new OpenAICompatibleAdapter(config);
      expect(adapter).toBeInstanceOf(OpenAICompatibleAdapter);
      expect(adapter.getConfig().type).toBe("openai-compatible");
    });

    it("should work without API key for local services", () => {
      const adapter = new OpenAICompatibleAdapter(config);
      expect(adapter).toBeInstanceOf(OpenAICompatibleAdapter);
    });

    it("should validate config successfully", async () => {
      const adapter = new OpenAICompatibleAdapter(config);

      // Mock successful response
      (global.fetch as any).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ data: [] }),
      });

      const isValid = await adapter.validateConfig();
      expect(isValid).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:1234/v1/models",
        expect.objectContaining({
          headers: expect.any(Object),
        })
      );
    });

    it("should accept 404 status as valid (for services without /models endpoint)", async () => {
      const adapter = new OpenAICompatibleAdapter(config);

      // Mock 404 response (some services don't implement /models)
      (global.fetch as any).mockResolvedValueOnce({
        status: 404,
        ok: false,
      });

      const isValid = await adapter.validateConfig();
      expect(isValid).toBe(true);
    });

    it("should return default models when API call fails", async () => {
      const adapter = new OpenAICompatibleAdapter(config);

      // Mock failed response
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      const models = await adapter.getModels();
      expect(models).toHaveLength(1);
      expect(models[0].name).toBe("local-model");
      expect(models[0].pricing.currency).toBe("FREE");
    });
  });

  describe("Adapter Creation", () => {
    it("should create adapters directly", () => {
      // Test OpenAI
      const openaiConfig: AdapterConfig = {
        type: "openai",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4",
        apiKey: "test-key",
        timeout: 30000,
        retries: 3,
      };
      const openaiAdapter = new OpenAIAdapter(openaiConfig);
      expect(openaiAdapter).toBeInstanceOf(OpenAIAdapter);

      // Test Claude
      const claudeConfig: AdapterConfig = {
        type: "claude",
        baseUrl: "https://api.anthropic.com/v1",
        model: "claude-3-sonnet-20240229",
        apiKey: "test-key",
        timeout: 30000,
        retries: 3,
      };
      const claudeAdapter = new ClaudeAdapter(claudeConfig);
      expect(claudeAdapter).toBeInstanceOf(ClaudeAdapter);

      // Test Gemini
      const geminiConfig: AdapterConfig = {
        type: "gemini",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        model: "gemini-1.5-pro",
        apiKey: "test-key",
        timeout: 30000,
        retries: 3,
      };
      const geminiAdapter = new GeminiAdapter(geminiConfig);
      expect(geminiAdapter).toBeInstanceOf(GeminiAdapter);

      // Test OpenAI Compatible
      const compatibleConfig: AdapterConfig = {
        type: "openai-compatible",
        baseUrl: "http://localhost:1234/v1",
        model: "local-model",
        timeout: 30000,
        retries: 3,
      };
      const compatibleAdapter = new OpenAICompatibleAdapter(compatibleConfig);
      expect(compatibleAdapter).toBeInstanceOf(OpenAICompatibleAdapter);
    });

    it("should have correct adapter types", () => {
      const configs = [
        { type: "openai", adapter: OpenAIAdapter },
        { type: "claude", adapter: ClaudeAdapter },
        { type: "gemini", adapter: GeminiAdapter },
        { type: "ollama", adapter: OllamaAdapter },
        { type: "openai-compatible", adapter: OpenAICompatibleAdapter },
      ];

      configs.forEach(({ type, adapter: AdapterClass }) => {
        const config: AdapterConfig = {
          type,
          baseUrl: "http://test.com",
          model: "test-model",
          apiKey: "test-key",
          timeout: 30000,
          retries: 3,
        };

        if (type === "ollama" || type === "openai-compatible") {
          // Ollama and OpenAI Compatible don't require API key
          delete config.apiKey;
        }

        const adapter = new AdapterClass(config);
        expect(adapter.getConfig().type).toBe(type);
      });
    });
  });
});
