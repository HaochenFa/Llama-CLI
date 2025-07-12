// tests/lib/mcp/manager.test.ts
// Tests for MCP Manager

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

describe("MCP Manager", () => {
  let McpManager: any;
  let McpConfigManager: any;
  let manager: any;
  let configManager: any;

  beforeEach(async () => {
    // Mock child_process
    jest.doMock("child_process", () => ({
      spawn: jest.fn().mockReturnValue({
        on: jest.fn(),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        stdin: { write: jest.fn() },
        kill: jest.fn(),
      }),
    }));

    // Mock fs
    jest.doMock("fs", () => ({
      existsSync: jest.fn().mockReturnValue(false),
      readFileSync: jest.fn().mockReturnValue("{}"),
      writeFileSync: jest.fn(),
      mkdirSync: jest.fn(),
    }));

    // Mock os
    jest.doMock("os", () => ({
      homedir: jest.fn().mockReturnValue("/tmp"),
      tmpdir: jest.fn().mockReturnValue("/tmp"),
    }));

    // Dynamically import after mocking
    const mcpModule = await import("../../../src/lib/mcp/manager.js");
    const configModule = await import("../../../src/lib/mcp/config.js");

    McpManager = mcpModule.McpManager;
    McpConfigManager = configModule.McpConfigManager;

    manager = new McpManager();
    configManager = new McpConfigManager();
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe("Basic functionality", () => {
    it("should initialize successfully", async () => {
      await manager.initialize();
      expect(manager).toBeDefined();
    });

    it("should add a server", async () => {
      const serverConfig = {
        command: "test-command",
        args: ["arg1", "arg2"],
      };

      await manager.addServer("test-server", "Test Server", serverConfig);

      const server = manager.getServer("test-server");
      expect(server).toBeDefined();
      expect(server.name).toBe("Test Server");
      expect(server.config).toEqual(serverConfig);
    });

    it("should remove a server", async () => {
      const serverConfig = {
        command: "test-command",
        args: ["arg1", "arg2"],
      };

      await manager.addServer("test-server", "Test Server", serverConfig);
      expect(manager.getServer("test-server")).toBeDefined();

      await manager.removeServer("test-server");
      expect(manager.getServer("test-server")).toBeUndefined();
    });

    it("should list servers", async () => {
      const serverConfig1 = { command: "cmd1" };
      const serverConfig2 = { command: "cmd2" };

      await manager.addServer("server1", "Server 1", serverConfig1);
      await manager.addServer("server2", "Server 2", serverConfig2);

      const servers = manager.getServers();
      expect(servers).toHaveLength(2);
      expect(servers.map((s: any) => s.id)).toContain("server1");
      expect(servers.map((s: any) => s.id)).toContain("server2");
    });

    it("should get connection summary", () => {
      const summary = manager.getConnectionSummary();
      expect(summary).toHaveProperty("total");
      expect(summary).toHaveProperty("connected");
      expect(summary).toHaveProperty("connecting");
      expect(summary).toHaveProperty("disconnected");
      expect(summary).toHaveProperty("error");
    });
  });

  describe("Error handling", () => {
    it("should throw error when adding duplicate server", async () => {
      const serverConfig = { command: "test-command" };

      await manager.addServer("test-server", "Test Server", serverConfig);

      await expect(
        manager.addServer("test-server", "Another Server", serverConfig)
      ).rejects.toThrow("already exists");
    });

    it("should throw error when removing non-existent server", async () => {
      await expect(manager.removeServer("non-existent")).rejects.toThrow("not found");
    });

    it("should throw error when connecting to non-existent server", async () => {
      await expect(manager.connectServer("non-existent")).rejects.toThrow("not found");
    });
  });
});

describe("MCP Config Manager", () => {
  let McpConfigManager: any;
  let configManager: any;

  beforeEach(async () => {
    // Mock fs
    jest.doMock("fs", () => ({
      existsSync: jest.fn().mockReturnValue(false),
      readFileSync: jest.fn().mockReturnValue("{}"),
      writeFileSync: jest.fn(),
      mkdirSync: jest.fn(),
    }));

    // Mock os
    jest.doMock("os", () => ({
      homedir: jest.fn().mockReturnValue("/tmp"),
      tmpdir: jest.fn().mockReturnValue("/tmp"),
    }));

    const configModule = await import("../../../src/lib/mcp/config.js");
    McpConfigManager = configModule.McpConfigManager;
    configManager = new McpConfigManager();
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe("Server configuration", () => {
    it("should add server configuration", () => {
      const serverId = configManager.addServer({
        name: "Test Server",
        description: "A test server",
        config: { command: "test-cmd" },
        enabled: true,
        autoConnect: false,
      });

      expect(serverId).toBeDefined();

      const server = configManager.getServer(serverId);
      expect(server).toBeDefined();
      expect(server.name).toBe("Test Server");
    });

    it("should update server configuration", () => {
      const serverId = configManager.addServer({
        name: "Test Server",
        config: { command: "test-cmd" },
        enabled: true,
        autoConnect: false,
      });

      configManager.updateServer(serverId, {
        name: "Updated Server",
        enabled: false,
      });

      const server = configManager.getServer(serverId);
      expect(server.name).toBe("Updated Server");
      expect(server.enabled).toBe(false);
    });

    it("should remove server configuration", () => {
      const serverId = configManager.addServer({
        name: "Test Server",
        config: { command: "test-cmd" },
        enabled: true,
        autoConnect: false,
      });

      expect(configManager.getServer(serverId)).toBeDefined();

      configManager.removeServer(serverId);
      expect(configManager.getServer(serverId)).toBeUndefined();
    });

    it("should get enabled servers", () => {
      const id1 = configManager.addServer({
        name: "Enabled Server",
        config: { command: "cmd1" },
        enabled: true,
        autoConnect: false,
      });

      const id2 = configManager.addServer({
        name: "Disabled Server",
        config: { command: "cmd2" },
        enabled: false,
        autoConnect: false,
      });

      const enabledServers = configManager.getEnabledServers();
      expect(enabledServers).toHaveLength(1);
      expect(enabledServers[0].id).toBe(id1);
    });
  });

  describe("Configuration validation", () => {
    it("should validate server config", () => {
      const validConfig = { command: "test-command" };
      const result = configManager.validateServerConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid server config", () => {
      const invalidConfig = { command: "" };
      const result = configManager.validateServerConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
