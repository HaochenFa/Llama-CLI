// tests/lib/adapters/new-adapters.test.ts

import { AdapterFactory } from "../../../src/lib/adapters/adapter-factory.js";
import { OpenAIAdapter } from "../../../src/lib/adapters/openai.adapter.js";
import { AnthropicAdapter } from "../../../src/lib/adapters/anthropic.adapter.js";
import { OpenAICompatibleAdapter } from "../../../src/lib/adapters/openai-compatible.adapter.js";
import { GeminiAdapter } from "../../../src/lib/adapters/gemini.adapter.js";
import { LLMProfile } from "../../../src/lib/config-store.js";

describe("New LLM Adapters", () => {
  describe("OpenAI Adapter", () => {
    it("should create OpenAI adapter with valid config", () => {
      const profile: LLMProfile = {
        type: "openai",
        name: "OpenAI GPT-4",
        endpoint: "https://api.openai.com",
        model: "gpt-4",
        apiKey: "sk-test-key",
      };

      const adapter = AdapterFactory.createAdapter(profile);
      expect(adapter).toBeInstanceOf(OpenAIAdapter);
      expect(adapter.getModel()).toBe("gpt-4");
    });

    it("should throw error when API key is missing", () => {
      const profile: LLMProfile = {
        type: "openai",
        name: "OpenAI GPT-4",
        endpoint: "https://api.openai.com",
        model: "gpt-4",
        // apiKey is missing
      };

      expect(() => AdapterFactory.createAdapter(profile)).toThrow("OpenAI API key is required");
    });

    it("should use default model when not specified", () => {
      const profile: LLMProfile = {
        type: "openai",
        name: "OpenAI Default",
        endpoint: "https://api.openai.com",
        apiKey: "sk-test-key",
        // model is not specified
      };

      const adapter = AdapterFactory.createAdapter(profile);
      expect(adapter).toBeInstanceOf(OpenAIAdapter);
      expect(adapter.getModel()).toBe("gpt-3.5-turbo");
    });
  });

  describe("Anthropic Adapter", () => {
    it("should create Anthropic adapter with valid config", () => {
      const profile: LLMProfile = {
        type: "anthropic",
        name: "Claude-3 Sonnet",
        endpoint: "https://api.anthropic.com",
        model: "claude-3-sonnet-20240229",
        apiKey: "sk-ant-test-key",
      };

      const adapter = AdapterFactory.createAdapter(profile);
      expect(adapter).toBeInstanceOf(AnthropicAdapter);
      expect(adapter.getModel()).toBe("claude-3-sonnet-20240229");
    });

    it("should throw error when API key is missing", () => {
      const profile: LLMProfile = {
        type: "anthropic",
        name: "Claude-3 Sonnet",
        endpoint: "https://api.anthropic.com",
        model: "claude-3-sonnet-20240229",
        // apiKey is missing
      };

      expect(() => AdapterFactory.createAdapter(profile)).toThrow("Anthropic API key is required");
    });

    it("should use default model when not specified", () => {
      const profile: LLMProfile = {
        type: "anthropic",
        name: "Claude Default",
        endpoint: "https://api.anthropic.com",
        apiKey: "sk-ant-test-key",
        // model is not specified
      };

      const adapter = AdapterFactory.createAdapter(profile);
      expect(adapter).toBeInstanceOf(AnthropicAdapter);
      expect(adapter.getModel()).toBe("claude-3-sonnet-20240229");
    });
  });

  describe("Gemini Adapter", () => {
    it("should create Gemini adapter with valid config", () => {
      const profile: LLMProfile = {
        type: "gemini",
        name: "Gemini Pro",
        endpoint: "https://generativelanguage.googleapis.com",
        model: "gemini-pro",
        apiKey: "test-api-key",
      };

      const adapter = AdapterFactory.createAdapter(profile);
      expect(adapter).toBeInstanceOf(GeminiAdapter);
      expect(adapter.getModel()).toBe("gemini-pro");
    });

    it("should throw error when API key is missing", () => {
      const profile: LLMProfile = {
        type: "gemini",
        name: "Gemini Pro",
        endpoint: "https://generativelanguage.googleapis.com",
        model: "gemini-pro",
        // apiKey is missing
      };

      expect(() => AdapterFactory.createAdapter(profile)).toThrow("Gemini API key is required");
    });

    it("should use default model when not specified", () => {
      const profile: LLMProfile = {
        type: "gemini",
        name: "Gemini Default",
        endpoint: "https://generativelanguage.googleapis.com",
        apiKey: "test-api-key",
        // model is not specified
      };

      const adapter = AdapterFactory.createAdapter(profile);
      expect(adapter).toBeInstanceOf(GeminiAdapter);
      expect(adapter.getModel()).toBe("gemini-pro");
    });
  });

  describe("OpenAI Compatible Adapter", () => {
    it("should create OpenAI compatible adapter with valid config", () => {
      const profile: LLMProfile = {
        type: "openai-compatible",
        name: "Together AI",
        endpoint: "https://api.together.xyz",
        model: "meta-llama/Llama-2-70b-chat-hf",
        apiKey: "test-key",
        serviceName: "Together AI",
      };

      const adapter = AdapterFactory.createAdapter(profile);
      expect(adapter).toBeInstanceOf(OpenAICompatibleAdapter);
      expect(adapter.getModel()).toBe("meta-llama/Llama-2-70b-chat-hf");
      expect(adapter.getServiceName()).toBe("Together AI");
    });

    it("should work without API key for local services", () => {
      const profile: LLMProfile = {
        type: "openai-compatible",
        name: "Local Service",
        endpoint: "http://localhost:8000",
        model: "local-model",
        serviceName: "Local Service",
      };

      const adapter = AdapterFactory.createAdapter(profile);
      expect(adapter).toBeInstanceOf(OpenAICompatibleAdapter);
      expect(adapter.getModel()).toBe("local-model");
    });

    it("should use default values when not specified", () => {
      const profile: LLMProfile = {
        type: "openai-compatible",
        name: "Minimal Config",
        endpoint: "http://localhost:8000",
        // model and serviceName not specified
      };

      const adapter = AdapterFactory.createAdapter(profile);
      expect(adapter).toBeInstanceOf(OpenAICompatibleAdapter);
      expect(adapter.getModel()).toBe("default");
      expect(adapter.getServiceName()).toBe("OpenAI-Compatible");
    });
  });

  describe("Profile Validation", () => {
    it("should validate OpenAI profile correctly", () => {
      const validProfile: LLMProfile = {
        type: "openai",
        name: "OpenAI GPT-4",
        endpoint: "https://api.openai.com",
        model: "gpt-4",
        apiKey: "sk-test-key",
      };

      const result = AdapterFactory.validateProfile(validProfile);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject OpenAI profile without API key", () => {
      const invalidProfile: LLMProfile = {
        type: "openai",
        name: "OpenAI GPT-4",
        endpoint: "https://api.openai.com",
        model: "gpt-4",
        // apiKey is missing
      };

      const result = AdapterFactory.validateProfile(invalidProfile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OpenAI API key is required");
    });

    it("should reject OpenAI profile with invalid API key format", () => {
      const invalidProfile: LLMProfile = {
        type: "openai",
        name: "OpenAI GPT-4",
        endpoint: "https://api.openai.com",
        model: "gpt-4",
        apiKey: "invalid-key-format",
      };

      const result = AdapterFactory.validateProfile(invalidProfile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OpenAI API key should start with 'sk-'");
    });

    it("should validate Anthropic profile correctly", () => {
      const validProfile: LLMProfile = {
        type: "anthropic",
        name: "Claude-3 Sonnet",
        endpoint: "https://api.anthropic.com",
        model: "claude-3-sonnet-20240229",
        apiKey: "sk-ant-test-key",
      };

      const result = AdapterFactory.validateProfile(validProfile);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate Gemini profile correctly", () => {
      const validProfile: LLMProfile = {
        type: "gemini",
        name: "Gemini Pro",
        endpoint: "https://generativelanguage.googleapis.com",
        model: "gemini-pro",
        apiKey: "test-api-key",
      };

      const result = AdapterFactory.validateProfile(validProfile);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject Gemini profile without API key", () => {
      const invalidProfile: LLMProfile = {
        type: "gemini",
        name: "Gemini Pro",
        endpoint: "https://generativelanguage.googleapis.com",
        model: "gemini-pro",
        // apiKey is missing
      };

      const result = AdapterFactory.validateProfile(invalidProfile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Gemini API key is required");
    });

    it("should validate OpenAI compatible profile correctly", () => {
      const validProfile: LLMProfile = {
        type: "openai-compatible",
        name: "Together AI",
        endpoint: "https://api.together.xyz",
        model: "meta-llama/Llama-2-70b-chat-hf",
        apiKey: "test-key",
        serviceName: "Together AI",
      };

      const result = AdapterFactory.validateProfile(validProfile);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject OpenAI compatible profile without model", () => {
      const invalidProfile: LLMProfile = {
        type: "openai-compatible",
        name: "Together AI",
        endpoint: "https://api.together.xyz",
        apiKey: "test-key",
        serviceName: "Together AI",
        // model is missing
      };

      const result = AdapterFactory.validateProfile(invalidProfile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Model name is required for OpenAI-compatible services");
    });
  });

  describe("Default Configurations", () => {
    it("should provide correct default config for OpenAI", () => {
      const defaultConfig = AdapterFactory.getDefaultConfig("openai");

      expect(defaultConfig.type).toBe("openai");
      expect(defaultConfig.endpoint).toBe("https://api.openai.com");
      expect(defaultConfig.model).toBe("gpt-3.5-turbo");
    });

    it("should provide correct default config for Anthropic", () => {
      const defaultConfig = AdapterFactory.getDefaultConfig("anthropic");

      expect(defaultConfig.type).toBe("anthropic");
      expect(defaultConfig.endpoint).toBe("https://api.anthropic.com");
      expect(defaultConfig.model).toBe("claude-3-sonnet-20240229");
    });

    it("should provide correct default config for OpenAI compatible", () => {
      const defaultConfig = AdapterFactory.getDefaultConfig("openai-compatible");

      expect(defaultConfig.type).toBe("openai-compatible");
      expect(defaultConfig.endpoint).toBe("http://localhost:8000");
      expect(defaultConfig.model).toBe("default");
      expect(defaultConfig.serviceName).toBe("Custom Service");
    });

    it("should provide correct default config for Gemini", () => {
      const defaultConfig = AdapterFactory.getDefaultConfig("gemini");

      expect(defaultConfig.type).toBe("gemini");
      expect(defaultConfig.endpoint).toBe("https://generativelanguage.googleapis.com");
      expect(defaultConfig.model).toBe("gemini-pro");
    });
  });
});
