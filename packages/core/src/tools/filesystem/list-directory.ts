/**
 * List Directory Tool for LlamaCLI
 * Provides secure directory listing capabilities with filtering and sorting
 */

import { BaseTool, ToolParams, ToolContext } from "../base.js";
import { MCPToolCallResult, MCPTextContent } from "../../types/mcp.js";
import { promises as fs } from "fs";
import { resolve, join, extname, basename } from "path";
import { FILESYSTEM_TOOLS_CONFIG } from "./index.js";

/**
 * Directory entry information
 */
interface DirectoryEntry {
  name: string;
  path: string;
  type: "file" | "directory" | "symlink";
  size: number;
  modified: Date;
  permissions: string;
}

/**
 * List directory parameters
 */
export interface ListDirectoryParams extends ToolParams {
  directoryPath: string;
  recursive?: boolean;
  includeHidden?: boolean;
  sortBy?: "name" | "size" | "modified" | "type";
  sortOrder?: "asc" | "desc";
  maxEntries?: number;
  excludePatterns?: string[];
}

/**
 * List Directory Tool implementation
 */
export class ListDirectoryTool extends BaseTool {
  readonly name = "list_directory";
  readonly description = "List the contents of a directory with optional filtering and sorting";
  readonly schema = {
    type: "object" as const,
    properties: {
      directoryPath: {
        type: "string",
        description: "Path to the directory to list (relative to current working directory)",
      },
      recursive: {
        type: "boolean",
        description: "List subdirectories recursively",
        default: false,
      },
      includeHidden: {
        type: "boolean",
        description: "Include hidden files and directories (starting with .)",
        default: false,
      },
      sortBy: {
        type: "string",
        enum: ["name", "size", "modified", "type"],
        description: "Sort entries by specified field",
        default: "name",
      },
      sortOrder: {
        type: "string",
        enum: ["asc", "desc"],
        description: "Sort order (ascending or descending)",
        default: "asc",
      },
      maxEntries: {
        type: "number",
        description: "Maximum number of entries to return",
        default: FILESYSTEM_TOOLS_CONFIG.MAX_DIRECTORY_ENTRIES,
        minimum: 1,
      },
      excludePatterns: {
        type: "array",
        items: { type: "string" },
        description: "Patterns to exclude from listing (glob patterns)",
        default: FILESYSTEM_TOOLS_CONFIG.DEFAULT_EXCLUDES,
      },
    },
    required: ["directoryPath"],
    additionalProperties: false,
  };

  /**
   * Get tool tags
   */
  getTags(): string[] {
    return ["filesystem", "list", "directory"];
  }

  /**
   * Check if tool is available in context
   */
  isAvailable(context?: ToolContext): boolean {
    return true; // Always available
  }

  /**
   * Check if path matches exclude patterns
   */
  private shouldExclude(path: string, excludePatterns: string[]): boolean {
    const name = basename(path);

    for (const pattern of excludePatterns) {
      // Simple glob pattern matching
      if (pattern.includes("*")) {
        const regex = new RegExp(pattern.replace(/\*/g, ".*"));
        if (regex.test(name)) {
          return true;
        }
      } else if (name === pattern) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get file permissions string
   */
  private getPermissionsString(mode: number): string {
    const permissions = [];

    // Owner permissions
    permissions.push(mode & 0o400 ? "r" : "-");
    permissions.push(mode & 0o200 ? "w" : "-");
    permissions.push(mode & 0o100 ? "x" : "-");

    // Group permissions
    permissions.push(mode & 0o040 ? "r" : "-");
    permissions.push(mode & 0o020 ? "w" : "-");
    permissions.push(mode & 0o010 ? "x" : "-");

    // Other permissions
    permissions.push(mode & 0o004 ? "r" : "-");
    permissions.push(mode & 0o002 ? "w" : "-");
    permissions.push(mode & 0o001 ? "x" : "-");

    return permissions.join("");
  }

  /**
   * Get directory entry information
   */
  private async getEntryInfo(entryPath: string): Promise<DirectoryEntry | null> {
    try {
      const stats = await fs.lstat(entryPath);
      const name = basename(entryPath);

      let type: "file" | "directory" | "symlink";
      if (stats.isSymbolicLink()) {
        type = "symlink";
      } else if (stats.isDirectory()) {
        type = "directory";
      } else {
        type = "file";
      }

      return {
        name,
        path: entryPath,
        type,
        size: stats.size,
        modified: stats.mtime,
        permissions: this.getPermissionsString(stats.mode),
      };
    } catch (error) {
      // Skip entries that can't be accessed
      return null;
    }
  }

  /**
   * List directory entries recursively
   */
  private async listEntriesRecursive(
    dirPath: string,
    includeHidden: boolean,
    excludePatterns: string[],
    maxEntries: number
  ): Promise<DirectoryEntry[]> {
    const entries: DirectoryEntry[] = [];
    const queue: string[] = [dirPath];

    while (queue.length > 0 && entries.length < maxEntries) {
      const currentDir = queue.shift()!;

      try {
        const items = await fs.readdir(currentDir);

        for (const item of items) {
          if (entries.length >= maxEntries) break;

          const itemPath = join(currentDir, item);

          // Skip hidden files if not included
          if (!includeHidden && item.startsWith(".")) {
            continue;
          }

          // Skip excluded patterns
          if (this.shouldExclude(itemPath, excludePatterns)) {
            continue;
          }

          const entryInfo = await this.getEntryInfo(itemPath);
          if (entryInfo) {
            entries.push(entryInfo);

            // Add subdirectories to queue for recursive listing
            if (entryInfo.type === "directory") {
              queue.push(itemPath);
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be accessed
        continue;
      }
    }

    return entries;
  }

  /**
   * Sort directory entries
   */
  private sortEntries(
    entries: DirectoryEntry[],
    sortBy: string,
    sortOrder: string
  ): DirectoryEntry[] {
    return entries.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "size":
          comparison = a.size - b.size;
          break;
        case "modified":
          comparison = a.modified.getTime() - b.modified.getTime();
          break;
        case "type":
          comparison = a.type.localeCompare(b.type);
          break;
      }

      return sortOrder === "desc" ? -comparison : comparison;
    });
  }

  /**
   * Format entries for display
   */
  private formatEntries(entries: DirectoryEntry[]): string {
    if (entries.length === 0) {
      return "Directory is empty";
    }

    const lines = ["Directory listing:"];

    for (const entry of entries) {
      const typeIndicator =
        entry.type === "directory" ? "[DIR]" : entry.type === "symlink" ? "[LINK]" : "";
      const sizeStr = entry.type === "file" ? ` (${entry.size} bytes)` : "";
      const modifiedStr = entry.modified.toISOString().split("T")[0];

      lines.push(
        `${entry.permissions} ${typeIndicator.padEnd(6)} ${entry.name}${sizeStr} - ${modifiedStr}`
      );
    }

    return lines.join("\n");
  }

  /**
   * Execute the tool
   */
  async execute(params: ListDirectoryParams, context?: ToolContext): Promise<MCPToolCallResult> {
    try {
      // Validate parameters
      const validation = this.validate(params);
      if (!validation.valid) {
        return this.createErrorResult(`Invalid parameters: ${validation.errors.join(", ")}`);
      }

      const {
        directoryPath,
        recursive = false,
        includeHidden = false,
        sortBy = "name",
        sortOrder = "asc",
        maxEntries = FILESYSTEM_TOOLS_CONFIG.MAX_DIRECTORY_ENTRIES,
        excludePatterns = ["node_modules", ".git", ".DS_Store"],
      } = params;

      const resolvedPath = resolve(directoryPath);

      // Check if directory exists and is accessible
      try {
        const stats = await fs.stat(resolvedPath);
        if (!stats.isDirectory()) {
          return this.createErrorResult(`Path '${directoryPath}' is not a directory`);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return this.createErrorResult(`Directory not found: ${directoryPath}`);
        }
        if ((error as NodeJS.ErrnoException).code === "EACCES") {
          return this.createErrorResult(`Permission denied: ${directoryPath}`);
        }
        throw error;
      }

      // List entries
      let entries: DirectoryEntry[];

      if (recursive) {
        entries = await this.listEntriesRecursive(
          resolvedPath,
          includeHidden,
          excludePatterns,
          maxEntries
        );
      } else {
        const items = await fs.readdir(resolvedPath);
        entries = [];

        for (const item of items) {
          if (entries.length >= maxEntries) break;

          const itemPath = join(resolvedPath, item);

          // Skip hidden files if not included
          if (!includeHidden && item.startsWith(".")) {
            continue;
          }

          // Skip excluded patterns
          if (this.shouldExclude(itemPath, excludePatterns)) {
            continue;
          }

          const entryInfo = await this.getEntryInfo(itemPath);
          if (entryInfo) {
            entries.push(entryInfo);
          }
        }
      }

      // Sort entries
      const sortedEntries = this.sortEntries(entries, sortBy, sortOrder);

      // Format output
      const formattedOutput = this.formatEntries(sortedEntries);

      return this.createSuccessResult([{ type: "text", text: formattedOutput }]);
    } catch (error) {
      return this.createErrorResult(
        `Failed to list directory: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
