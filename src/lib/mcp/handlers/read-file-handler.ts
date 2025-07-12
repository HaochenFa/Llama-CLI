// src/lib/mcp/handlers/read-file-handler.ts
// Read file tool handler for the unified MCP architecture

import * as fs from "fs/promises";
import * as path from "path";
import { BaseToolHandler } from "../tool-handler.js";

export class ReadFileHandler extends BaseToolHandler {
  description =
    "Reads and returns the content of a specified text file from the local filesystem. The file path must be an absolute path.";

  schema = {
    type: "object",
    properties: {
      absolute_path: {
        type: "string",
        description:
          "The absolute path to the file to read (e.g., '/home/user/project/file.txt'). Relative paths are not supported.",
      },
      limit: {
        type: "number",
        description: "Optional: Maximum number of lines to read. Use with 'offset' to paginate.",
      },
      offset: {
        type: "number",
        description: "Optional: The 0-based line number to start reading from. Requires 'limit'.",
      },
    },
    required: ["absolute_path"],
  };

  protected async executeImpl(args: {
    absolute_path: string;
    limit?: number;
    offset?: number;
  }): Promise<string> {
    const { absolute_path, limit, offset } = args;

    // Validate that the path is absolute
    if (!path.isAbsolute(absolute_path)) {
      throw new Error("absolute_path must be an absolute path.");
    }

    try {
      // Check if file exists and is a file (not directory)
      const stats = await fs.stat(absolute_path);
      if (!stats.isFile()) {
        throw new Error(`Path ${absolute_path} is not a file.`);
      }

      // Check file size (limit to 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (stats.size > maxSize) {
        throw new Error(
          `File ${absolute_path} is too large (${Math.round(
            stats.size / 1024 / 1024
          )}MB). Maximum size is 10MB.`
        );
      }

      // Read the file
      const content = await fs.readFile(absolute_path, "utf-8");

      // Handle pagination if limit/offset are provided
      if (limit !== undefined) {
        const lines = content.split("\n");
        const startLine = offset || 0;
        const endLine = startLine + limit;

        if (startLine >= lines.length) {
          return ""; // No lines to return
        }

        const selectedLines = lines.slice(startLine, endLine);
        return selectedLines.join("\n");
      }

      return content;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        throw new Error(`File not found: ${absolute_path}`);
      } else if (error.code === "EACCES") {
        throw new Error(`Permission denied: ${absolute_path}`);
      } else if (error.code === "EISDIR") {
        throw new Error(`Path is a directory, not a file: ${absolute_path}`);
      } else {
        throw error;
      }
    }
  }

  protected validateArgs(args: any): void {
    super.validateArgs(args);

    if (!args.absolute_path || typeof args.absolute_path !== "string") {
      throw new Error("absolute_path is required and must be a string");
    }

    if (args.limit !== undefined && (typeof args.limit !== "number" || args.limit <= 0)) {
      throw new Error("limit must be a positive number");
    }

    if (args.offset !== undefined && (typeof args.offset !== "number" || args.offset < 0)) {
      throw new Error("offset must be a non-negative number");
    }

    if (args.offset !== undefined && args.limit === undefined) {
      throw new Error("offset requires limit to be specified");
    }
  }
}
