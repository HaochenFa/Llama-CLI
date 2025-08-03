/**
 * Tests for ShellExecuteTool
 */

import { ShellExecuteTool } from "../execute.js";

describe("ShellExecuteTool", () => {
  let tool: ShellExecuteTool;

  beforeEach(() => {
    tool = new ShellExecuteTool();
  });

  describe("basic functionality", () => {
    it("should have correct name and description", () => {
      expect(tool.name).toBe("shell_execute");
      expect(tool.description).toBe("Execute shell commands with security restrictions");
    });

    it("should have valid schema", () => {
      expect(tool.schema).toBeDefined();
      expect(tool.schema.type).toBe("object");
      expect(tool.schema.properties.command).toBeDefined();
      expect(tool.schema.required).toContain("command");
    });

    it("should return correct tags", () => {
      const tags = tool.getTags();
      expect(tags).toContain("shell");
      expect(tags).toContain("execute");
      expect(tags).toContain("command");
    });

    it("should be available by default", () => {
      expect(tool.isAvailable()).toBe(true);
    });
  });

  describe("command execution", () => {
    it("should execute simple echo command", async () => {
      const result = await tool.execute({
        command: 'echo "Hello, World!"',
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("Hello, World!");
      expect(result.content[0].text).toContain("Exit Code: 0");
    });

    it("should execute command with custom working directory", async () => {
      const result = await tool.execute({
        command: "pwd",
        workingDirectory: "/tmp",
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("/tmp");
    });

    it("should handle command with input", async () => {
      const result = await tool.execute({
        command: "cat",
        input: "Hello from stdin",
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("Hello from stdin");
    });

    it("should handle command with environment variables", async () => {
      const result = await tool.execute({
        command: "echo $TEST_VAR",
        environment: { TEST_VAR: "test_value" },
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("test_value");
    });

    it("should handle command timeout", async () => {
      const result = await tool.execute({
        command: "sleep 2",
        timeout: 1000, // 1 second timeout
      });

      expect(result.content[0].text).toContain("TIMED OUT");
    }, 10000);
  });

  describe("error handling", () => {
    it("should handle non-existent command", async () => {
      const result = await tool.execute({
        command: "nonexistentcommand12345",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Exit Code:");
    });

    it("should handle command with non-zero exit code", async () => {
      const result = await tool.execute({
        command: "exit 1",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Exit Code: 1");
    });

    it("should validate required parameters", async () => {
      const result = await tool.execute({} as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid parameters");
    });
  });

  describe("security", () => {
    it("should block dangerous rm command", async () => {
      const result = await tool.execute({
        command: "rm -rf /",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Blocked command detected");
    });

    it("should block fork bomb pattern", async () => {
      const result = await tool.execute({
        command: ":(){ :|:& };:",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Blocked command detected");
    });

    it("should validate shell path", async () => {
      const result = await tool.execute({
        command: "echo test",
        shell: "/invalid/shell",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Shell not allowed");
    });

    it("should validate working directory", async () => {
      const result = await tool.execute({
        command: "echo test",
        workingDirectory: "/etc",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Working directory not allowed");
    });
  });

  describe("parameter validation", () => {
    it("should validate timeout parameter", async () => {
      const result = await tool.execute({
        command: "echo test",
        timeout: 500, // Below minimum
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid parameters");
    });

    it("should validate timeout maximum", async () => {
      const result = await tool.execute({
        command: "echo test",
        timeout: 400000, // Above maximum
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid parameters");
    });
  });

  describe("output handling", () => {
    it("should capture stdout", async () => {
      const result = await tool.execute({
        command: 'echo "stdout message"',
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("stdout message");
      expect(result.content[0].text).toContain("--- STDOUT ---");
    });

    it("should capture stderr", async () => {
      const result = await tool.execute({
        command: 'echo "stderr message" >&2',
      });

      expect(result.content[0].text).toContain("stderr message");
      expect(result.content[0].text).toContain("--- STDERR ---");
    });

    it("should include execution metadata", async () => {
      const result = await tool.execute({
        command: "echo test",
      });

      expect(result.content[0].text).toContain("Command: echo test");
      expect(result.content[0].text).toContain("Working Directory:");
      expect(result.content[0].text).toContain("Exit Code:");
      expect(result.content[0].text).toContain("Duration:");
    });
  });
});
