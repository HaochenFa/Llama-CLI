/**
 * Write File Tool for LlamaCLI
 * Provides secure file writing capabilities with validation and safety checks
 */

import { BaseTool, ToolParams, ToolContext } from "../base.js";
import { MCPToolCallResult, MCPTextContent } from "../../types/mcp.js";
import { promises as fs } from "fs";
import { resolve, dirname, extname } from "path";
// Configuration constants
const BLOCKED_PATHS = ["/etc/passwd", "/etc/shadow", "/etc/hosts", "/proc", "/sys", "/dev"];
const BLOCKED_EXTENSIONS = [".exe", ".bat", ".cmd", ".scr", ".pif", ".com"];

/**
 * Write file parameters
 */
export interface WriteFileParams extends ToolParams {
  filePath: string;
  content: string;
  encoding?: "utf8" | "ascii" | "base64" | "hex";
  createDirectories?: boolean;
  backup?: boolean;
  mode?: number;
}

/**
 * Write File Tool implementation
 */
export class WriteFileTool extends BaseTool {
  readonly name = "write_file";
  readonly description = "Write content to a file on the filesystem";
  readonly schema = {
    type: "object" as const,
    properties: {
      filePath: {
        type: "string",
        description: "Path to the file to write (relative to current working directory)",
      },
      content: {
        type: "string",
        description: "Content to write to the file",
      },
      encoding: {
        type: "string",
        enum: ["utf8", "ascii", "base64", "hex"],
        description: "File encoding (default: utf8)",
        default: "utf8",
      },
      createDirectories: {
        type: "boolean",
        description: "Create parent directories if they do not exist",
        default: true,
      },
      backup: {
        type: "boolean",
        description: "Create a backup of existing file before overwriting",
        default: false,
      },
      mode: {
        type: "number",
        description: "File permissions (octal, e.g., 0o644)",
        default: 0o644,
      },
    },
    required: ["filePath", "content"],
    additionalProperties: false,
  };

  /**
   * Get tool tags
   */
  getTags(): string[] {
    return ["filesystem", "write", "file"];
  }

  /**
   * Check if tool is available in context
   */
  isAvailable(context?: ToolContext): boolean {
    return true; // Always available
  }

  /**
   * Validate file path for security
   */
  private validateFilePath(filePath: string): { valid: boolean; error?: string } {
    const resolvedPath = resolve(filePath);

    // Check for blocked paths
    for (const blockedPath of BLOCKED_PATHS) {
      if (resolvedPath.startsWith(blockedPath)) {
        return {
          valid: false,
          error: `Access denied: Path '${filePath}' is in a restricted directory`,
        };
      }
    }

    // Check for blocked extensions
    const ext = extname(filePath).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return {
        valid: false,
        error: `Access denied: File extension '${ext}' is not allowed`,
      };
    }

    return { valid: true };
  }

  /**
   * Create backup of existing file
   */
  private async createBackup(filePath: string): Promise<string | null> {
    try {
      const stats = await fs.stat(filePath);
      if (stats.isFile()) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupPath = `${filePath}.backup.${timestamp}`;
        await fs.copyFile(filePath, backupPath);
        return backupPath;
      }
    } catch (error) {
      // File doesn't exist, no backup needed
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
    return null;
  }

  /**
   * Execute the tool
   */
  async execute(params: WriteFileParams, context?: ToolContext): Promise<MCPToolCallResult> {
    try {
      // Validate parameters
      const validation = this.validate(params);
      if (!validation.valid) {
        return this.createErrorResult(`Invalid parameters: ${validation.errors.join(", ")}`);
      }

      const {
        filePath,
        content,
        encoding = "utf8",
        createDirectories = true,
        backup = false,
        mode = 0o644,
      } = params;

      // Validate file path
      const pathValidation = this.validateFilePath(filePath);
      if (!pathValidation.valid) {
        return this.createErrorResult(pathValidation.error!);
      }

      const resolvedPath = resolve(filePath);
      const dirPath = dirname(resolvedPath);

      // Create directories if needed
      if (createDirectories) {
        try {
          await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
          return this.createErrorResult(
            `Failed to create directories: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      // Create backup if requested
      let backupPath: string | null = null;
      if (backup) {
        try {
          backupPath = await this.createBackup(resolvedPath);
        } catch (error) {
          return this.createErrorResult(
            `Failed to create backup: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      // Check if file exists to determine if it's a new file
      let isNewFile = false;
      try {
        await fs.stat(resolvedPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          isNewFile = true;
        } else {
          throw error;
        }
      }

      // Write file content
      await fs.writeFile(resolvedPath, content, {
        encoding: encoding as BufferEncoding,
        mode,
      });

      const action = isNewFile ? "created" : "updated";
      const message = `Successfully ${action} file: ${filePath}`;

      return this.createSuccessResult([{ type: "text", text: message }]);
    } catch (error) {
      return this.createErrorResult(
        `Failed to write file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
