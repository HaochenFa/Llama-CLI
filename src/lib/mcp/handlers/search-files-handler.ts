// src/lib/mcp/handlers/search-files-handler.ts
// Search files tool handler for the unified MCP architecture

import * as fs from "fs/promises";
import * as path from "path";
import { BaseToolHandler } from "../tool-handler.js";

export class SearchFilesHandler extends BaseToolHandler {
  description =
    "Searches for files in a directory tree based on filename patterns, file extensions, or content. Returns a list of matching file paths.";

  schema = {
    type: "object",
    properties: {
      directory: {
        type: "string",
        description:
          "The absolute path to the directory to search in (e.g., '/home/user/project'). Relative paths are not supported.",
      },
      pattern: {
        type: "string",
        description:
          "Optional: Filename pattern to match (supports wildcards like '*.js', '*.ts', 'test*', etc.). If not provided, all files are considered.",
      },
      content_search: {
        type: "string",
        description:
          "Optional: Search for files containing this text content. Case-insensitive search.",
      },
      max_depth: {
        type: "number",
        description:
          "Optional: Maximum directory depth to search (default: 5). Set to 1 for current directory only.",
        default: 5,
        minimum: 1,
        maximum: 10,
      },
      max_results: {
        type: "number",
        description: "Optional: Maximum number of results to return (default: 50).",
        default: 50,
        minimum: 1,
        maximum: 200,
      },
      include_hidden: {
        type: "boolean",
        description:
          "Optional: Include hidden files and directories (starting with '.') in search (default: false).",
        default: false,
      },
    },
    required: ["directory"],
  };

  protected async executeImpl(args: {
    directory: string;
    pattern?: string;
    content_search?: string;
    max_depth?: number;
    max_results?: number;
    include_hidden?: boolean;
  }): Promise<string> {
    const {
      directory,
      pattern,
      content_search,
      max_depth = 5,
      max_results = 50,
      include_hidden = false,
    } = args;

    // Validate that the path is absolute
    if (!path.isAbsolute(directory)) {
      throw new Error("directory must be an absolute path.");
    }

    try {
      // Check if directory exists
      const stats = await fs.stat(directory);
      if (!stats.isDirectory()) {
        throw new Error(`Path ${directory} is not a directory.`);
      }
    } catch (error: any) {
      if (error.code === "ENOENT") {
        throw new Error(`Directory not found: ${directory}`);
      } else if (error.code === "EACCES") {
        throw new Error(`Permission denied: ${directory}`);
      } else {
        throw error;
      }
    }

    const results: string[] = [];

    await this.searchDirectory(
      directory,
      pattern,
      content_search,
      max_depth,
      max_results,
      include_hidden,
      results,
      0
    );

    if (results.length === 0) {
      return "No files found matching the search criteria.";
    }

    const resultText = results.join("\n");
    const truncated = results.length >= max_results ? ` (truncated to ${max_results} results)` : "";

    return `Found ${results.length} file(s)${truncated}:\n${resultText}`;
  }

  private async searchDirectory(
    dir: string,
    pattern?: string,
    contentSearch?: string,
    maxDepth: number = 5,
    maxResults: number = 50,
    includeHidden: boolean = false,
    results: string[] = [],
    currentDepth: number = 0
  ): Promise<void> {
    if (currentDepth >= maxDepth || results.length >= maxResults) {
      return;
    }

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxResults) break;

        // Skip hidden files/directories if not included
        if (!includeHidden && entry.name.startsWith(".")) {
          continue;
        }

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Recursively search subdirectories
          await this.searchDirectory(
            fullPath,
            pattern,
            contentSearch,
            maxDepth,
            maxResults,
            includeHidden,
            results,
            currentDepth + 1
          );
        } else if (entry.isFile()) {
          // Check if file matches criteria
          if (await this.matchesFile(fullPath, entry.name, pattern, contentSearch)) {
            results.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read (permission issues, etc.)
      console.debug(`Skipping directory ${dir}: ${(error as Error).message}`);
    }
  }

  private async matchesFile(
    filePath: string,
    fileName: string,
    pattern?: string,
    contentSearch?: string
  ): Promise<boolean> {
    // Check filename pattern
    if (pattern && !this.matchesPattern(fileName, pattern)) {
      return false;
    }

    // Check content search
    if (contentSearch) {
      try {
        // Only search in text files (skip binary files)
        if (!this.isTextFile(fileName)) {
          return false;
        }

        const stats = await fs.stat(filePath);
        // Skip very large files for content search (> 1MB)
        if (stats.size > 1024 * 1024) {
          return false;
        }

        const content = await fs.readFile(filePath, "utf-8");
        if (!content.toLowerCase().includes(contentSearch.toLowerCase())) {
          return false;
        }
      } catch (error) {
        // Skip files we can't read
        return false;
      }
    }

    return true;
  }

  private matchesPattern(fileName: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".");

    const regex = new RegExp(`^${regexPattern}$`, "i");
    return regex.test(fileName);
  }

  private isTextFile(fileName: string): boolean {
    const textExtensions = [
      ".txt",
      ".md",
      ".js",
      ".ts",
      ".jsx",
      ".tsx",
      ".py",
      ".java",
      ".c",
      ".cpp",
      ".h",
      ".hpp",
      ".css",
      ".scss",
      ".sass",
      ".html",
      ".htm",
      ".xml",
      ".json",
      ".yaml",
      ".yml",
      ".toml",
      ".ini",
      ".cfg",
      ".conf",
      ".sh",
      ".bash",
      ".zsh",
      ".fish",
      ".ps1",
      ".bat",
      ".cmd",
      ".sql",
      ".php",
      ".rb",
      ".go",
      ".rs",
      ".swift",
      ".kt",
      ".scala",
      ".clj",
      ".hs",
      ".elm",
      ".vue",
      ".svelte",
      ".astro",
      ".dockerfile",
      ".gitignore",
      ".env",
    ];

    const ext = path.extname(fileName).toLowerCase();
    return textExtensions.includes(ext) || !path.extname(fileName); // Include files without extension
  }

  protected validateArgs(args: any): void {
    super.validateArgs(args);

    if (!args.directory || typeof args.directory !== "string") {
      throw new Error("directory is required and must be a string");
    }

    if (args.pattern !== undefined && typeof args.pattern !== "string") {
      throw new Error("pattern must be a string");
    }

    if (args.content_search !== undefined && typeof args.content_search !== "string") {
      throw new Error("content_search must be a string");
    }

    if (
      args.max_depth !== undefined &&
      (typeof args.max_depth !== "number" || args.max_depth < 1 || args.max_depth > 10)
    ) {
      throw new Error("max_depth must be a number between 1 and 10");
    }

    if (
      args.max_results !== undefined &&
      (typeof args.max_results !== "number" || args.max_results < 1 || args.max_results > 200)
    ) {
      throw new Error("max_results must be a number between 1 and 200");
    }

    if (args.include_hidden !== undefined && typeof args.include_hidden !== "boolean") {
      throw new Error("include_hidden must be a boolean");
    }
  }
}
