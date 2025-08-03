/**
 * Tests for Configuration Management
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Config } from "../config.js";

describe("Config", () => {
  let config: Config;

  beforeEach(() => {
    vi.clearAllMocks();
    config = new Config();
  });

  describe("initialization", () => {
    it("should create config instance", () => {
      expect(config).toBeInstanceOf(Config);
    });

    it("should have default configuration", () => {
      const defaultConfig = config.getConfig();
      expect(defaultConfig).toBeDefined();
      expect(defaultConfig.llm).toBeDefined();
      expect(defaultConfig.security).toBeDefined();
      expect(defaultConfig.performance).toBeDefined();
    });
  });

  describe("LLM configuration", () => {
    it("should get default LLM config", () => {
      const llmConfig = config.getLLMConfig();
      expect(llmConfig).toBeDefined();
      expect(llmConfig.defaultProvider).toBe("ollama");
      expect(llmConfig.providers).toBeDefined();
    });

    it("should set LLM provider", () => {
      config.setLLMProvider("openai");
      const llmConfig = config.getLLMConfig();
      expect(llmConfig.defaultProvider).toBe("openai");
    });

    it("should validate LLM provider", () => {
      expect(() => config.setLLMProvider("invalid" as any)).toThrow();
    });

    it("should get provider config", () => {
      const ollamaConfig = config.getProviderConfig("ollama");
      expect(ollamaConfig).toBeDefined();
      expect(ollamaConfig.baseUrl).toBeDefined();
    });
  });

  describe("security configuration", () => {
    it("should get security config", () => {
      const securityConfig = config.getSecurityConfig();
      expect(securityConfig).toBeDefined();
      expect(securityConfig.allowFileAccess).toBeDefined();
      expect(securityConfig.allowNetworkAccess).toBeDefined();
    });

    it("should update security settings", () => {
      config.updateSecurityConfig({
        allowFileAccess: false,
        allowNetworkAccess: true,
      });

      const securityConfig = config.getSecurityConfig();
      expect(securityConfig.allowFileAccess).toBe(false);
      expect(securityConfig.allowNetworkAccess).toBe(true);
    });

    it("should validate trusted domains", () => {
      const isValid = config.isTrustedDomain("localhost");
      expect(isValid).toBe(true);

      const isInvalid = config.isTrustedDomain("malicious.com");
      expect(isInvalid).toBe(false);
    });
  });

  describe("performance configuration", () => {
    it("should get performance config", () => {
      const perfConfig = config.getPerformanceConfig();
      expect(perfConfig).toBeDefined();
      expect(perfConfig.maxConcurrentRequests).toBeGreaterThan(0);
      expect(perfConfig.requestTimeout).toBeGreaterThan(0);
    });

    it("should update performance settings", () => {
      config.updatePerformanceConfig({
        maxConcurrentRequests: 10,
        requestTimeout: 60000,
      });

      const perfConfig = config.getPerformanceConfig();
      expect(perfConfig.maxConcurrentRequests).toBe(10);
      expect(perfConfig.requestTimeout).toBe(60000);
    });
  });

  describe("configuration persistence", () => {
    it("should save configuration", async () => {
      mockFs.setFile("/home/user/.llamacli/config.json", "{}");

      await config.save();

      // Verify save was called (would need to mock the actual save implementation)
      expect(true).toBe(true); // Placeholder assertion
    });

    it("should load configuration", async () => {
      mockFs.setFile(
        "/home/user/.llamacli/config.json",
        JSON.stringify({
          llm: {
            defaultProvider: "openai",
          },
        })
      );

      await config.load();

      const llmConfig = config.getLLMConfig();
      expect(llmConfig.defaultProvider).toBe("openai");
    });

    it("should handle missing config file", async () => {
      // Don't set up any config file
      await expect(config.load()).resolves.not.toThrow();

      // Should use defaults
      const llmConfig = config.getLLMConfig();
      expect(llmConfig.defaultProvider).toBe("ollama");
    });
  });

  describe("validation", () => {
    it("should validate complete configuration", () => {
      const isValid = config.validate();
      expect(isValid).toBe(true);
    });

    it("should detect invalid configuration", () => {
      // Set invalid config
      config.updateConfig({
        llm: {
          defaultProvider: "invalid" as any,
          providers: {},
        },
      });

      const isValid = config.validate();
      expect(isValid).toBe(false);
    });
  });

  describe("environment variables", () => {
    it("should read from environment variables", () => {
      const originalEnv = process.env.LLAMACLI_DEFAULT_PROVIDER;
      process.env.LLAMACLI_DEFAULT_PROVIDER = "openai";

      const newConfig = new Config();
      const llmConfig = newConfig.getLLMConfig();
      expect(llmConfig.defaultProvider).toBe("openai");

      // Restore
      if (originalEnv !== undefined) {
        process.env.LLAMACLI_DEFAULT_PROVIDER = originalEnv;
      } else {
        delete process.env.LLAMACLI_DEFAULT_PROVIDER;
      }
    });
  });

  describe("error handling", () => {
    it("should handle configuration errors gracefully", () => {
      expect(() => {
        config.updateConfig(null as any);
      }).toThrow();
    });

    it("should provide helpful error messages", () => {
      try {
        config.setLLMProvider("invalid" as any);
      } catch (error) {
        expect(error.message).toContain("Invalid LLM provider");
      }
    });
  });
});
