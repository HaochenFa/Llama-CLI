// tests/lib/adapters/adapter-factory.test.ts

import { describe, it, expect, jest } from "@jest/globals";
import { AdapterFactory } from "../../../src/lib/adapters/adapter-factory";
import { OllamaAdapter } from "../../../src/lib/adapters/ollama.adapter";
import { vLLMAdapter } from "../../../src/lib/adapters/vllm.adapter";
import { LLMProfile } from "../../../src/lib/config-store";

// Mock the adapter modules
jest.mock("../../../src/lib/adapters/ollama.adapter");
jest.mock("../../../src/lib/adapters/vllm.adapter");

const MockOllamaAdapter = OllamaAdapter as jest.MockedClass<typeof OllamaAdapter>;
const MockvLLMAdapter = vLLMAdapter as jest.MockedClass<typeof vLLMAdapter>;

describe("AdapterFactory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createAdapter", () => {
    it("should create OllamaAdapter for ollama type", () => {
      const profile: LLMProfile = {
        name: "test-ollama",
        type: "ollama",
        endpoint: "http://localhost:11434",
      };

      AdapterFactory.createAdapter(profile, false);

      expect(MockOllamaAdapter).toHaveBeenCalledWith("http://localhost:11434", false);
    });

    it("should create vLLMAdapter for vllm type", () => {
      const profile: LLMProfile = {
        name: "test-vllm",
        type: "vllm",
        endpoint: "http://localhost:8000",
        model: "llama-2-7b",
      };

      AdapterFactory.createAdapter(profile, true);

      expect(MockvLLMAdapter).toHaveBeenCalledWith("http://localhost:8000", true, "llama-2-7b");
    });

    it("should use default model for vllm when not specified", () => {
      const profile: LLMProfile = {
        name: "test-vllm",
        type: "vllm",
        endpoint: "http://localhost:8000",
      };

      AdapterFactory.createAdapter(profile, false);

      expect(MockvLLMAdapter).toHaveBeenCalledWith("http://localhost:8000", false, "default");
    });

    it("should throw error for unsupported type", () => {
      const profile = {
        name: "test-unsupported",
        type: "unsupported",
        endpoint: "http://localhost:8000",
      } as any;

      expect(() => AdapterFactory.createAdapter(profile)).toThrow(
        "Unsupported LLM type: unsupported"
      );
    });
  });

  describe("getSupportedTypes", () => {
    it("should return list of supported types", () => {
      const types = AdapterFactory.getSupportedTypes();

      expect(types).toHaveLength(6);
      expect(types.find((t) => t.type === "ollama")).toBeTruthy();
      expect(types.find((t) => t.type === "vllm")).toBeTruthy();
      expect(types.find((t) => t.type === "openai")).toBeTruthy();
      expect(types.find((t) => t.type === "anthropic")).toBeTruthy();
      expect(types.find((t) => t.type === "openai-compatible")).toBeTruthy();
      expect(types.find((t) => t.type === "gemini")).toBeTruthy();
    });

    it("should mark all types as available", () => {
      const types = AdapterFactory.getSupportedTypes();

      types.forEach((type) => {
        expect(type.available).toBe(true);
      });
    });
  });

  describe("validateProfile", () => {
    it("should validate correct ollama profile", () => {
      const profile: LLMProfile = {
        name: "test-ollama",
        type: "ollama",
        endpoint: "http://localhost:11434",
      };

      const result = AdapterFactory.validateProfile(profile);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate correct vllm profile", () => {
      const profile: LLMProfile = {
        name: "test-vllm",
        type: "vllm",
        endpoint: "http://localhost:8000",
      };

      const result = AdapterFactory.validateProfile(profile);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject profile without name", () => {
      const profile = {
        type: "ollama",
        endpoint: "http://localhost:11434",
      } as any;

      const result = AdapterFactory.validateProfile(profile);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Profile name is required");
    });

    it("should reject profile without type", () => {
      const profile = {
        name: "test",
        endpoint: "http://localhost:11434",
      } as any;

      const result = AdapterFactory.validateProfile(profile);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Profile type is required");
    });

    it("should reject profile without endpoint", () => {
      const profile = {
        name: "test",
        type: "ollama",
      } as any;

      const result = AdapterFactory.validateProfile(profile);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Endpoint URL is required");
    });

    it("should reject profile with invalid URL", () => {
      const profile: LLMProfile = {
        name: "test",
        type: "ollama",
        endpoint: "not-a-url",
      };

      const result = AdapterFactory.validateProfile(profile);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid endpoint URL format");
    });

    it("should reject unsupported type", () => {
      const profile = {
        name: "test",
        type: "unsupported",
        endpoint: "http://localhost:8000",
      } as any;

      const result = AdapterFactory.validateProfile(profile);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Unsupported LLM type"))).toBe(true);
    });
  });

  describe("getDefaultConfig", () => {
    it("should return default ollama config", () => {
      const config = AdapterFactory.getDefaultConfig("ollama");

      expect(config).toEqual({
        type: "ollama",
        endpoint: "http://localhost:11434",
      });
    });

    it("should return default vllm config", () => {
      const config = AdapterFactory.getDefaultConfig("vllm");

      expect(config).toEqual({
        type: "vllm",
        endpoint: "http://localhost:8000",
      });
    });
  });

  describe("testConnection", () => {
    it("should test connection using adapter testConnection method", async () => {
      const profile: LLMProfile = {
        name: "test-ollama",
        type: "ollama",
        endpoint: "http://localhost:11434",
      };

      const mockTestConnection = jest.fn().mockResolvedValue({
        success: true,
        models: ["test-model"],
      });

      MockOllamaAdapter.mockImplementation(
        () =>
          ({
            testConnection: mockTestConnection,
          } as any)
      );

      const result = await AdapterFactory.testConnection(profile);

      expect(result.success).toBe(true);
      expect(result.models).toEqual(["test-model"]);
      expect(mockTestConnection).toHaveBeenCalled();
    });

    it("should handle adapter creation failure", async () => {
      const profile = {
        name: "test",
        type: "unsupported",
        endpoint: "http://localhost:8000",
      } as any;

      const result = await AdapterFactory.testConnection(profile);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to create adapter");
    });
  });
});
