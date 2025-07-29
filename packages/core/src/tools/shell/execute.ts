/**
 * Shell Execute Tool for LlamaCLI
 * Provides secure shell command execution with safety checks
 */

import { BaseTool, ToolParams, ToolContext } from "../base.js";
import { MCPToolCallResult, MCPTextContent } from "../../types/mcp.js";
import { spawn, ChildProcess } from "child_process";
import { resolve } from "path";
import { SHELL_TOOLS_CONFIG } from "./index.js";

/**
 * Shell execution result
 */
export interface ShellExecuteResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  signal?: string;
  timedOut: boolean;
  command: string;
  workingDirectory: string;
  duration: number;
}

/**
 * Shell execute parameters
 */
export interface ShellExecuteParams extends ToolParams {
  command: string;
  workingDirectory?: string;
  timeout?: number;
  shell?: string;
  environment?: Record<string, string>;
  input?: string;
}

/**
 * Shell Execute Tool implementation
 */
export class ShellExecuteTool extends BaseTool {
  readonly name = "shell_execute";
  readonly description = "Execute shell commands with security restrictions";
  readonly schema = {
    type: "object" as const,
    properties: {
      command: {
        type: "string",
        description: "Shell command to execute",
      },
      workingDirectory: {
        type: "string",
        description: "Working directory for command execution (default: current directory)",
      },
      timeout: {
        type: "number",
        description: "Timeout in milliseconds (default: 30000)",
        default: SHELL_TOOLS_CONFIG.DEFAULT_TIMEOUT,
        minimum: 1000,
        maximum: SHELL_TOOLS_CONFIG.MAX_TIMEOUT,
      },
      shell: {
        type: "string",
        description: "Shell to use for execution (default: /bin/bash)",
        default: "/bin/bash",
      },
      environment: {
        type: "object",
        description: "Environment variables to set",
        additionalProperties: { type: "string" },
      },
      input: {
        type: "string",
        description: "Input to send to the command via stdin",
      },
    },
    required: ["command"],
    additionalProperties: false,
  };

  /**
   * Get tool tags
   */
  getTags(): string[] {
    return ["shell", "execute", "command"];
  }

  /**
   * Check if tool is available in context
   */
  isAvailable(context?: ToolContext): boolean {
    // Check if user has shell execution permissions
    return context?.permissions?.includes("shell:execute") ?? true;
  }

  /**
   * Validate command for security
   */
  private validateCommand(command: string): { valid: boolean; error?: string } {
    // Check blocked commands
    for (const blockedCommand of SHELL_TOOLS_CONFIG.BLOCKED_COMMANDS) {
      if (command.includes(blockedCommand)) {
        return {
          valid: false,
          error: `Blocked command detected: ${blockedCommand}`,
        };
      }
    }

    // Check blocked patterns
    for (const pattern of SHELL_TOOLS_CONFIG.BLOCKED_PATTERNS) {
      if (pattern.test(command)) {
        return {
          valid: false,
          error: `Command matches blocked pattern: ${pattern}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate working directory
   */
  private validateWorkingDirectory(workingDir: string): { valid: boolean; error?: string } {
    const resolvedDir = resolve(workingDir);

    // Check if directory is in allowed list
    const isAllowed = SHELL_TOOLS_CONFIG.ALLOWED_DIRECTORIES.some((allowedDir) =>
      resolvedDir.startsWith(resolve(allowedDir))
    );

    if (!isAllowed) {
      return {
        valid: false,
        error: `Working directory not allowed: ${workingDir}`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate shell
   */
  private validateShell(shell: string): { valid: boolean; error?: string } {
    if (!SHELL_TOOLS_CONFIG.ALLOWED_SHELLS.includes(shell as any)) {
      return {
        valid: false,
        error: `Shell not allowed: ${shell}`,
      };
    }

    return { valid: true };
  }

  /**
   * Execute shell command
   */
  private async executeCommand(
    command: string,
    workingDirectory: string,
    timeout: number,
    shell: string,
    environment: Record<string, string>,
    input?: string
  ): Promise<ShellExecuteResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let timedOut = false;

      // Prepare environment
      const env = {
        ...SHELL_TOOLS_CONFIG.SAFE_ENVIRONMENT,
        ...environment,
      };

      // Spawn process
      const child: ChildProcess = spawn(shell, ["-c", command], {
        cwd: workingDirectory,
        env,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");

        // Force kill after 5 seconds
        setTimeout(() => {
          if (!child.killed) {
            child.kill("SIGKILL");
          }
        }, 5000);
      }, timeout);

      // Handle stdout
      child.stdout?.on("data", (data: Buffer) => {
        stdout += data.toString();

        // Prevent excessive output
        if (stdout.length > SHELL_TOOLS_CONFIG.MAX_OUTPUT_SIZE) {
          child.kill("SIGTERM");
        }
      });

      // Handle stderr
      child.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();

        // Prevent excessive output
        if (stderr.length > SHELL_TOOLS_CONFIG.MAX_OUTPUT_SIZE) {
          child.kill("SIGTERM");
        }
      });

      // Handle process exit
      child.on("close", (code, signal) => {
        clearTimeout(timeoutHandle);

        const duration = Date.now() - startTime;

        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code ?? -1,
          signal: signal ?? undefined,
          timedOut,
          command,
          workingDirectory,
          duration,
        });
      });

      // Handle process error
      child.on("error", (error) => {
        clearTimeout(timeoutHandle);
        reject(error);
      });

      // Send input if provided
      if (input && child.stdin) {
        child.stdin.write(input);
        child.stdin.end();
      }
    });
  }

  /**
   * Format execution result
   */
  private formatResult(result: ShellExecuteResult): string {
    const lines: string[] = [];

    lines.push(`Command: ${result.command}`);
    lines.push(`Working Directory: ${result.workingDirectory}`);
    lines.push(`Exit Code: ${result.exitCode}`);
    lines.push(`Duration: ${result.duration}ms`);

    if (result.signal) {
      lines.push(`Signal: ${result.signal}`);
    }

    if (result.timedOut) {
      lines.push("Status: TIMED OUT");
    }

    if (result.stdout) {
      lines.push("\n--- STDOUT ---");
      lines.push(result.stdout);
    }

    if (result.stderr) {
      lines.push("\n--- STDERR ---");
      lines.push(result.stderr);
    }

    return lines.join("\n");
  }

  /**
   * Execute the tool
   */
  async execute(params: ShellExecuteParams, context?: ToolContext): Promise<MCPToolCallResult> {
    try {
      // Validate parameters
      const validation = this.validate(params);
      if (!validation.valid) {
        return this.createErrorResult(`Invalid parameters: ${validation.errors.join(", ")}`);
      }

      const {
        command,
        workingDirectory = process.cwd(),
        timeout = SHELL_TOOLS_CONFIG.DEFAULT_TIMEOUT,
        shell = "/bin/bash",
        environment = {},
        input,
      } = params;

      // Security validations
      const commandValidation = this.validateCommand(command);
      if (!commandValidation.valid) {
        return this.createErrorResult(commandValidation.error!);
      }

      const dirValidation = this.validateWorkingDirectory(workingDirectory);
      if (!dirValidation.valid) {
        return this.createErrorResult(dirValidation.error!);
      }

      const shellValidation = this.validateShell(shell);
      if (!shellValidation.valid) {
        return this.createErrorResult(shellValidation.error!);
      }

      // Execute command
      const result = await this.executeCommand(
        command,
        resolve(workingDirectory),
        timeout,
        shell,
        environment,
        input
      );

      // Format output
      const formattedOutput = this.formatResult(result);

      // Determine if this should be treated as an error
      const isError = result.exitCode !== 0 && !result.timedOut;

      return isError
        ? this.createErrorResult(formattedOutput)
        : this.createSuccessResult([{ type: "text", text: formattedOutput }]);
    } catch (error) {
      return this.createErrorResult(
        `Shell execution failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
