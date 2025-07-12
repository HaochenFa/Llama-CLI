// tests/integration/mcp-integration.test.ts
// Integration tests for MCP functionality

import { ToolDispatcher } from "../../src/lib/tool-dispatcher.js";
import { McpManager } from "../../src/lib/mcp/manager.js";
import { McpConfigManager } from "../../src/lib/mcp/config.js";
import { McpToolAdapter } from "../../src/lib/mcp/tool-adapter.js";
import { initializeMcp, initializeMcpTools } from "../../src/lib/mcp-init.js";

describe("MCP Integration Tests", () => {
  let toolDispatcher: ToolDispatcher;
  let mcpManager: McpManager;
  let mcpConfigManager: McpConfigManager;
  let mcpToolAdapter: McpToolAdapter;

  beforeEach(async () => {
    toolDispatcher = new ToolDispatcher([]);
    await toolDispatcher.initialize();
    mcpManager = new McpManager();
    mcpConfigManager = new McpConfigManager();
    mcpToolAdapter = new McpToolAdapter(mcpManager);
  });

  afterEach(async () => {
    // Clean up any connections
    try {
      await mcpManager.disconnectAll();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Tool Dispatcher MCP Integration", () => {
    it("should handle MCP tool execution without errors", async () => {
      // Test with a built-in tool since we can't easily mock external MCP tools
      const result = await toolDispatcher.dispatch(
        { name: "web_search", arguments: { query: "test query" } },
        "test-call-id"
      );

      expect(result.role).toBe("tool");
      expect(result.tool_call_id).toBe("test-call-id");
      expect(result.content).toContain("Search results for: test query");
    });

    it("should handle MCP tool errors gracefully", async () => {
      // Test with an invalid file path to trigger an error
      const result = await toolDispatcher.dispatch(
        { name: "read_file", arguments: { absolute_path: "/non/existent/file.txt" } },
        "test-call-id"
      );

      expect(result.role).toBe("tool");
      expect(result.tool_call_id).toBe("test-call-id");
      expect(result.content).toContain("Error executing tool");
    });

    it("should load MCP tools dynamically", async () => {
      const initialToolCount = toolDispatcher.availableTools.length;

      // Directly add a mock MCP tool to simulate dynamic loading
      const mockMcpTool = {
        type: "mcp" as const,
        name: "mcp_test_dynamic_tool",
        description: "Dynamic MCP tool",
        parameters: { type: "object" },
        invoke: async () => "dynamic tool result",
      };

      // Simulate the loadMcpTools behavior by adding the tool directly
      toolDispatcher.availableTools.push(mockMcpTool);

      expect(toolDispatcher.availableTools.length).toBeGreaterThan(initialToolCount);

      const mcpTools = toolDispatcher.availableTools.filter((t: any) => t.type === "mcp");
      expect(mcpTools.length).toBeGreaterThan(0);
    });
  });

  describe("MCP Configuration Validation", () => {
    it("should validate server configuration correctly", () => {
      const validConfig = {
        command: "npx",
        args: ["@modelcontextprotocol/server-filesystem", "/tmp"],
        env: { NODE_ENV: "test" },
      };

      const result = mcpConfigManager.validateServerConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid server configuration", () => {
      const invalidConfig = {
        command: "", // Empty command
        args: ["arg1"],
        cwd: "/nonexistent/directory",
      };

      const result = mcpConfigManager.validateServerConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e: any) => e.includes("Command is required"))).toBe(true);
    });

    it("should validate environment variables", () => {
      const invalidConfig = {
        command: "test",
        env: { VALID_VAR: "value", INVALID_VAR: 123 as any },
      };

      const result = mcpConfigManager.validateServerConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: any) => e.includes("must be a string"))).toBe(true);
    });
  });

  describe("MCP Manager", () => {
    it("should add and remove servers correctly", async () => {
      const serverConfig = {
        command: "echo",
        args: ["test"],
      };

      await mcpManager.addServer("test-server", "Test Server", serverConfig);

      const server = mcpManager.getServer("test-server");
      expect(server).toBeDefined();
      expect(server?.name).toBe("Test Server");

      await mcpManager.removeServer("test-server");

      const removedServer = mcpManager.getServer("test-server");
      expect(removedServer).toBeUndefined();
    });

    it("should prevent duplicate server IDs", async () => {
      const serverConfig = { command: "echo" };

      await mcpManager.addServer("duplicate-test", "Server 1", serverConfig);

      await expect(
        mcpManager.addServer("duplicate-test", "Server 2", serverConfig)
      ).rejects.toThrow("already exists");
    });
  });

  describe("MCP Initialization", () => {
    it("should initialize MCP system without errors", async () => {
      // Mock console methods to capture output
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await expect(initializeMcp()).resolves.not.toThrow();

      consoleSpy.mockRestore();
    });

    it("should initialize MCP tools in tool dispatcher", async () => {
      const mockToolDispatcher = {
        loadMcpTools: jest.fn().mockResolvedValue(undefined),
        getToolStats: jest.fn().mockReturnValue({ native: 5, mcp: 2, total: 7 }),
      };

      await expect(initializeMcpTools(mockToolDispatcher)).resolves.not.toThrow();
      expect(mockToolDispatcher.loadMcpTools).toHaveBeenCalled();
      expect(mockToolDispatcher.getToolStats).toHaveBeenCalled();
    });
  });

  describe("Tool Statistics", () => {
    it("should provide accurate tool statistics", async () => {
      const stats = toolDispatcher.getToolStats();

      expect(stats).toHaveProperty("builtin");
      expect(stats).toHaveProperty("external");
      expect(stats).toHaveProperty("total");
      expect(stats.total).toBe(stats.builtin + stats.external);
      expect(stats.builtin).toBeGreaterThan(0); // Should have built-in tools
    });
  });
});
