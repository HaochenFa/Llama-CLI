// src/lib/mcp/handlers/write-file-handler.ts
// Write file tool handler for the unified MCP architecture

import * as fs from "fs/promises";
import * as path from "path";
import { BaseToolHandler } from "../tool-handler.js";

export class WriteFileHandler extends BaseToolHandler {
  description =
    "Writes content to a specified file in the local filesystem. The file path must be an absolute path.";

  schema = {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description:
          "The absolute path to the file to write to (e.g., '/home/user/project/file.txt'). Relative paths are not supported.",
      },
      content: {
        type: "string",
        description: "The content to write to the file.",
      },
    },
    required: ["file_path", "content"],
  };

  protected async executeImpl(args: { file_path: string; content: string }): Promise<string> {
    const { file_path, content } = args;

    // Validate that the path is absolute
    if (!path.isAbsolute(file_path)) {
      throw new Error("file_path must be an absolute path.");
    }

    try {
      // Ensure the directory exists
      const dir = path.dirname(file_path);
      await fs.mkdir(dir, { recursive: true });

      // Check if file already exists and get its size for reporting
      let existingSize = 0;
      let fileExists = false;
      try {
        const stats = await fs.stat(file_path);
        if (stats.isFile()) {
          existingSize = stats.size;
          fileExists = true;
        } else {
          throw new Error(`Path ${file_path} exists but is not a file.`);
        }
      } catch (error: any) {
        if (error.code !== "ENOENT") {
          throw error;
        }
        // File doesn't exist, which is fine
      }

      // Write the content to the file
      await fs.writeFile(file_path, content, "utf-8");

      // Get the new file size
      const newStats = await fs.stat(file_path);
      const newSize = newStats.size;

      // Return success message with details
      if (fileExists) {
        return `File updated successfully. Path: ${file_path}, Size: ${newSize} bytes (was ${existingSize} bytes)`;
      } else {
        return `File created successfully. Path: ${file_path}, Size: ${newSize} bytes`;
      }
    } catch (error: any) {
      if (error.code === "EACCES") {
        throw new Error(`Permission denied: ${file_path}`);
      } else if (error.code === "ENOSPC") {
        throw new Error(`No space left on device: ${file_path}`);
      } else if (error.code === "EROFS") {
        throw new Error(`Read-only file system: ${file_path}`);
      } else {
        throw error;
      }
    }
  }

  protected validateArgs(args: any): void {
    super.validateArgs(args);

    if (!args.file_path || typeof args.file_path !== "string") {
      throw new Error("file_path is required and must be a string");
    }

    if (args.content === undefined || typeof args.content !== "string") {
      throw new Error("content is required and must be a string");
    }

    // Check content size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const contentSize = Buffer.byteLength(args.content, "utf-8");
    if (contentSize > maxSize) {
      throw new Error(
        `Content is too large (${Math.round(contentSize / 1024 / 1024)}MB). Maximum size is 10MB.`
      );
    }
  }
}
