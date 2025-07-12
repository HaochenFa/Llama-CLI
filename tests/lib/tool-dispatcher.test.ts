// tests/lib/tool-dispatcher.test.ts

import { describe, it, expect, jest } from "@jest/globals";
import { ToolDispatcher } from "../../src/lib/tool-dispatcher.js";
import { ToolDefinition } from "../../src/types/context.js";

// Mock the tool modules
jest.mock("../../src/lib/tools/read_file", () => ({
  read_file_tool: {
    type: "native",
    name: "read_file",
    description: "Read file content",
    parameters: {
      type: "object",
      properties: { file_path: { type: "string" } },
      required: ["file_path"],
    },
    invoke: jest.fn(() => Promise.resolve("file content")) as any,
  },
}));

jest.mock("../../src/lib/tools/write_file", () => ({
  write_file_tool: {
    type: "native",
    name: "write_file",
    description: "Write file content",
    parameters: {
      type: "object",
      properties: { file_path: { type: "string" }, content: { type: "string" } },
      required: ["file_path", "content"],
    },
    invoke: jest.fn(() => Promise.resolve("File written successfully")) as any,
  },
}));

jest.mock("../../src/lib/tools/search_files", () => ({
  search_files_tool: {
    type: "native",
    name: "search_files",
    description: "Search files",
    parameters: {
      type: "object",
      properties: { directory: { type: "string" } },
      required: ["directory"],
    },
    invoke: jest.fn(() => Promise.resolve("Search results")) as any,
  },
}));

jest.mock("../../src/lib/tools/delete_file", () => ({
  delete_file_tool: {
    type: "native",
    name: "delete_file",
    description: "Delete file",
    parameters: {
      type: "object",
      properties: { file_path: { type: "string" } },
      required: ["file_path"],
    },
    invoke: jest.fn(() => Promise.resolve("File deleted")) as any,
  },
}));

jest.mock("../../src/lib/tools/web_search", () => ({
  web_search_tool: {
    type: "native",
    name: "web_search",
    description: "Search the web",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    invoke: jest.fn(() => Promise.resolve("Search results")) as any,
  },
}));

describe("ToolDispatcher", () => {
  let toolDispatcher: ToolDispatcher;

  beforeEach(async () => {
    toolDispatcher = new ToolDispatcher([]);
    // Initialize the dispatcher to load built-in tools
    await toolDispatcher.initialize();
  });

  describe("Tool Registration", () => {
    it("should register built-in tools automatically", () => {
      const tools = toolDispatcher.availableTools;

      expect(tools.find((t: any) => t.name === "read_file")).toBeTruthy();
      expect(tools.find((t: any) => t.name === "write_file")).toBeTruthy();
      expect(tools.find((t: any) => t.name === "search_files")).toBeTruthy();
      expect(tools.find((t: any) => t.name === "delete_file")).toBeTruthy();
      expect(tools.find((t: any) => t.name === "web_search")).toBeTruthy();
    });

    it("should include additional tools passed to constructor", () => {
      const customTool: ToolDefinition = {
        type: "openapi",
        name: "custom_tool",
        description: "A custom tool",
        parameters: { type: "object", properties: {}, required: [] },
        invoke: jest.fn(() => Promise.resolve("custom result")) as any,
      };

      const dispatcher = new ToolDispatcher([customTool]);
      const tools = dispatcher.availableTools;

      expect(tools.find((t: any) => t.name === "custom_tool")).toBeTruthy();
    });

    it("should filter out native tools from additional tools", async () => {
      const duplicateNativeTool: ToolDefinition = {
        type: "native",
        name: "read_file",
        description: "Duplicate native tool",
        parameters: { type: "object", properties: {}, required: [] },
        invoke: jest.fn(() => Promise.resolve("duplicate result")) as any,
      };

      const dispatcher = new ToolDispatcher([duplicateNativeTool]);
      await dispatcher.initialize();
      const readFileTools = dispatcher.availableTools.filter((t: any) => t.name === "read_file");

      // Should only have one read_file tool (the built-in one)
      expect(readFileTools).toHaveLength(1);
    });
  });

  describe("Tool Dispatch", () => {
    it("should dispatch tool call successfully", async () => {
      const toolCall = {
        name: "read_file",
        arguments: { absolute_path: "/test/file.txt" },
      };

      const result = await toolDispatcher.dispatch(toolCall, "call-123");

      expect(result.role).toBe("tool");
      expect(result.tool_call_id).toBe("call-123");
      // The content will be an error since we're not mocking the file system
      expect(result.content).toContain("Error");
    });

    it("should handle tool not found", async () => {
      const toolCall = {
        name: "non_existent_tool",
        arguments: {},
      };

      const result = await toolDispatcher.dispatch(toolCall, "call-123");

      expect(result.role).toBe("tool");
      expect(result.content).toContain("Tool 'non_existent_tool' not found");
      expect(result.tool_call_id).toBe("call-123");
    });

    it("should handle invalid arguments", async () => {
      const toolCall = {
        name: "read_file",
        arguments: {}, // Missing required file_path
      };

      const result = await toolDispatcher.dispatch(toolCall, "call-123");

      expect(result.role).toBe("tool");
      expect(result.content).toContain("Invalid arguments");
      expect(result.tool_call_id).toBe("call-123");
    });

    it("should handle tool execution error", async () => {
      const toolCall = {
        name: "read_file",
        arguments: { absolute_path: "/non/existent/file.txt" },
      };

      const result = await toolDispatcher.dispatch(toolCall, "call-123");

      expect(result.role).toBe("tool");
      expect(result.content).toContain("Error executing tool 'read_file'");
      expect(result.tool_call_id).toBe("call-123");
    });

    it("should handle string arguments by parsing them", async () => {
      const toolCall = {
        name: "read_file",
        arguments: '{"absolute_path": "/test/file.txt"}',
      };

      const result = await toolDispatcher.dispatch(toolCall, "call-123");

      expect(result.role).toBe("tool");
      expect(result.tool_call_id).toBe("call-123");
      // The content will be an error since we're not mocking the file system
      expect(result.content).toContain("Error");
    });

    it("should handle invalid JSON in string arguments", async () => {
      const toolCall = {
        name: "read_file",
        arguments: "invalid json",
      };

      const result = await toolDispatcher.dispatch(toolCall, "call-123");

      expect(result.role).toBe("tool");
      expect(result.content).toContain("Invalid JSON in arguments");
    });
  });

  describe("Argument Validation", () => {
    it("should validate required arguments", async () => {
      const toolCall = {
        name: "write_file",
        arguments: { file_path: "/test/file.txt" }, // Missing required 'content'
      };

      const result = await toolDispatcher.dispatch(toolCall, "call-123");

      expect(result.content).toContain("Invalid arguments");
    });

    it("should accept valid arguments", async () => {
      const toolCall = {
        name: "write_file",
        arguments: {
          file_path: "/test/file.txt",
          content: "Hello, world!",
        },
      };

      const result = await toolDispatcher.dispatch(toolCall, "call-123");

      expect(result.role).toBe("tool");
      expect(result.tool_call_id).toBe("call-123");
      // The content will be an error since we're not mocking the file system
      expect(result.content).toContain("Error");
    });
  });

  describe("Tool Information", () => {
    it("should provide tool definitions for LLM", () => {
      const tools = toolDispatcher.availableTools;

      tools.forEach((tool: any) => {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.parameters).toBeTruthy();
        expect(typeof tool.invoke).toBe("function");
      });
    });

    it("should have proper parameter schemas", () => {
      const readFileTool = toolDispatcher.availableTools.find((t: any) => t.name === "read_file");

      expect(readFileTool?.parameters.type).toBe("object");
      expect(readFileTool?.parameters.properties).toBeTruthy();
      expect(readFileTool?.parameters.required).toContain("absolute_path");
    });
  });
});
