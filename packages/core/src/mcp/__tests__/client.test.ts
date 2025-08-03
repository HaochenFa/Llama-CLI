/**
 * Tests for MCP Client
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMCPClient, MCPClient } from "../client.js";

describe("MCPClient", () => {
  let client: MCPClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createMCPClient({
      serverUrl: "http://localhost:3000",
      timeout: 5000,
    });
  });

  describe("initialization", () => {
    it("should create MCP client instance", () => {
      expect(client).toBeDefined();
      expect(typeof client.connect).toBe("function");
      expect(typeof client.disconnect).toBe("function");
    });

    it("should create client with default config", () => {
      const defaultClient = createMCPClient();
      expect(defaultClient).toBeDefined();
    });
  });

  describe("connection management", () => {
    it("should connect to MCP server", async () => {
      await expect(client.connect()).resolves.not.toThrow();
      expect(client.isConnected()).toBe(true);
    });

    it("should disconnect from MCP server", async () => {
      await client.connect();
      await client.disconnect();
      expect(client.isConnected()).toBe(false);
    });

    it("should handle connection errors", async () => {
      const invalidClient = createMCPClient({
        serverUrl: "http://invalid-url:9999",
        timeout: 1000,
      });

      await expect(invalidClient.connect()).rejects.toThrow();
    });

    it("should auto-reconnect on connection loss", async () => {
      const reconnectClient = createMCPClient({
        serverUrl: "http://localhost:3000",
        autoReconnect: true,
        reconnectInterval: 100,
      });

      await reconnectClient.connect();

      // Simulate connection loss
      await reconnectClient.disconnect();

      // Wait for auto-reconnect
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(reconnectClient.isConnected()).toBe(true);
    });
  });

  describe("tool discovery", () => {
    it("should list available tools", async () => {
      await client.connect();
      const tools = await client.listTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      tools.forEach((tool) => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
      });
    });

    it("should get tool details", async () => {
      await client.connect();
      const tools = await client.listTools();

      if (tools.length > 0) {
        const toolDetails = await client.getTool(tools[0].name);
        expect(toolDetails).toBeDefined();
        expect(toolDetails.name).toBe(tools[0].name);
      }
    });

    it("should handle non-existent tool requests", async () => {
      await client.connect();

      await expect(client.getTool("non-existent-tool")).rejects.toThrow();
    });
  });

  describe("tool execution", () => {
    it("should execute tools successfully", async () => {
      await client.connect();

      const result = await client.callTool("echo", {
        message: "Hello, World!",
      });

      expect(result).toBeDefined();
      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();
    });

    it("should handle tool execution errors", async () => {
      await client.connect();

      const result = await client.callTool("error-tool", {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("error");
    });

    it("should validate tool parameters", async () => {
      await client.connect();

      await expect(
        client.callTool("echo", {
          invalidParam: "value",
        })
      ).rejects.toThrow();
    });

    it("should handle tool timeouts", async () => {
      const timeoutClient = createMCPClient({
        serverUrl: "http://localhost:3000",
        timeout: 100,
      });

      await timeoutClient.connect();

      await expect(timeoutClient.callTool("slow-tool", {})).rejects.toThrow("timeout");
    });
  });

  describe("resource management", () => {
    it("should list available resources", async () => {
      await client.connect();
      const resources = await client.listResources();

      expect(Array.isArray(resources)).toBe(true);
    });

    it("should read resource content", async () => {
      await client.connect();
      const resources = await client.listResources();

      if (resources.length > 0) {
        const content = await client.readResource(resources[0].uri);
        expect(content).toBeDefined();
      }
    });
  });

  describe("prompt management", () => {
    it("should list available prompts", async () => {
      await client.connect();
      const prompts = await client.listPrompts();

      expect(Array.isArray(prompts)).toBe(true);
    });

    it("should get prompt content", async () => {
      await client.connect();
      const prompts = await client.listPrompts();

      if (prompts.length > 0) {
        const prompt = await client.getPrompt(prompts[0].name, {});
        expect(prompt).toBeDefined();
        expect(prompt.messages).toBeDefined();
      }
    });
  });

  describe("event handling", () => {
    it("should emit connection events", async () => {
      const connectHandler = vi.fn();
      const disconnectHandler = vi.fn();

      client.on("connected", connectHandler);
      client.on("disconnected", disconnectHandler);

      await client.connect();
      expect(connectHandler).toHaveBeenCalled();

      await client.disconnect();
      expect(disconnectHandler).toHaveBeenCalled();
    });

    it("should emit error events", async () => {
      const errorHandler = vi.fn();
      client.on("error", errorHandler);

      // Trigger an error
      try {
        await client.callTool("non-existent-tool", {});
      } catch (error) {
        // Expected
      }

      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe("configuration", () => {
    it("should update client configuration", () => {
      client.updateConfig({
        timeout: 10000,
        retries: 5,
      });

      const config = client.getConfig();
      expect(config.timeout).toBe(10000);
      expect(config.retries).toBe(5);
    });

    it("should validate configuration", () => {
      expect(() => {
        client.updateConfig({
          timeout: -1000,
        });
      }).toThrow();
    });
  });

  describe("cleanup", () => {
    it("should clean up resources on disconnect", async () => {
      await client.connect();

      const cleanupSpy = vi.spyOn(client as any, "cleanup");

      await client.disconnect();

      expect(cleanupSpy).toHaveBeenCalled();
    });

    it("should handle multiple disconnect calls", async () => {
      await client.connect();

      await client.disconnect();
      await expect(client.disconnect()).resolves.not.toThrow();
    });
  });
});
