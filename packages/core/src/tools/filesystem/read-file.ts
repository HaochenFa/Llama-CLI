/**
 * Read File Tool for LlamaCLI
 * Provides secure file reading capabilities with validation and safety checks
 */

import { BaseTool, ToolParams, ToolContext } from "../base.js";
import { MCPToolCallResult, MCPTextContent } from "../../types/mcp.js";
import { promises as fs } from "fs";
import { resolve, extname, basename } from "path";
// Configuration constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const BLOCKED_PATHS = ["/etc/passwd", "/etc/shadow", "/etc/hosts", "/proc", "/sys", "/dev"];
const BLOCKED_EXTENSIONS = [".exe", ".bat", ".cmd", ".scr", ".pif", ".com"];
const BINARY_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".ico",
  ".svg",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".zip",
  ".tar",
  ".gz",
  ".bz2",
  ".7z",
  ".rar",
  ".mp3",
  ".mp4",
  ".avi",
  ".mov",
  ".wmv",
  ".flv",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".app",
];

/**
 * Read file parameters
 */
export interface ReadFileParams extends ToolParams {
  filePath: string;
  encoding?: "utf8" | "ascii" | "base64" | "hex";
  startLine?: number;
  endLine?: number;
  maxSize?: number;
}

/**
 * Read File Tool implementation
 */
export class ReadFileTool extends BaseTool {
  readonly name = "read_file";
  readonly description = "Read the contents of a file from the filesystem";
  readonly schema = {
    type: "object" as const,
    properties: {
      filePath: {
        type: "string",
        description: "Path to the file to read (relative to current working directory)",
      },
      encoding: {
        type: "string",
        enum: ["utf8", "ascii", "base64", "hex"],
        description: "File encoding (default: utf8)",
        default: "utf8",
      },
      startLine: {
        type: "number",
        description: "Starting line number (1-based, optional)",
        minimum: 1,
      },
      endLine: {
        type: "number",
        description: "Ending line number (1-based, optional)",
        minimum: 1,
      },
      maxSize: {
        type: "number",
        description: "Maximum file size to read in bytes",
        default: MAX_FILE_SIZE,
      },
    },
    required: ["filePath"],
    additionalProperties: false,
  };

  /**
   * Get tool tags
   */
  getTags(): string[] {
    return ["filesystem", "read", "file"];
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
   * Check if file is likely binary
   */
  private isBinaryFile(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase();
    return BINARY_EXTENSIONS.includes(ext);
  }

  /**
   * Read file with line range support
   */
  private async readFileWithRange(
    filePath: string,
    encoding: BufferEncoding,
    startLine?: number,
    endLine?: number
  ): Promise<string> {
    const content = await fs.readFile(filePath, encoding);

    if (!startLine && !endLine) {
      return content;
    }

    const lines = content.split("\n");
    const start = Math.max(0, (startLine || 1) - 1);
    const end = endLine ? Math.min(lines.length, endLine) : lines.length;

    return lines.slice(start, end).join("\n");
  }

  /**
   * Execute the tool
   */
  async execute(params: ReadFileParams, context?: ToolContext): Promise<MCPToolCallResult> {
    try {
      // Validate parameters
      const validation = this.validate(params);
      if (!validation.valid) {
        return this.createErrorResult(`Invalid parameters: ${validation.errors.join(", ")}`);
      }

      const { filePath, encoding = "utf8", startLine, endLine, maxSize = MAX_FILE_SIZE } = params;

      // Validate file path
      const pathValidation = this.validateFilePath(filePath);
      if (!pathValidation.valid) {
        return this.createErrorResult(pathValidation.error!);
      }

      const resolvedPath = resolve(filePath);

      // Check if file exists
      try {
        const stats = await fs.stat(resolvedPath);

        if (!stats.isFile()) {
          return this.createErrorResult(`Path '${filePath}' is not a file`);
        }

        // Check file size
        if (stats.size > maxSize) {
          return this.createErrorResult(
            `File too large: ${stats.size} bytes (max: ${maxSize} bytes)`
          );
        }

        // Warn about binary files
        if (this.isBinaryFile(filePath) && encoding === "utf8") {
          return this.createErrorResult(
            `File '${filePath}' appears to be binary. Use base64 encoding to read binary files.`
          );
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return this.createErrorResult(`File not found: ${filePath}`);
        }
        if ((error as NodeJS.ErrnoException).code === "EACCES") {
          return this.createErrorResult(`Permission denied: ${filePath}`);
        }
        throw error;
      }

      // Read file content
      const content = await this.readFileWithRange(
        resolvedPath,
        encoding as BufferEncoding,
        startLine,
        endLine
      );

      return this.createSuccessResult([
        {
          type: "text",
          text: content,
        },
      ]);
    } catch (error) {
      return this.createErrorResult(
        `Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
