/**
 * Search Files Tool for LlamaCLI
 * Provides file content search capabilities with pattern matching
 */

import { BaseTool, ToolParams, ToolContext } from "../base.js";
import { MCPToolCallResult, MCPTextContent } from "../../types/mcp.js";
import { promises as fs } from "fs";
import { resolve, join, extname, basename } from "path";
import { FILESYSTEM_TOOLS_CONFIG } from "./index.js";

/**
 * Search result information
 */
interface SearchResult {
  filePath: string;
  lineNumber: number;
  line: string;
  match: string;
  context?: {
    before: string[];
    after: string[];
  };
}

/**
 * Search files parameters
 */
export interface SearchFilesParams extends ToolParams {
  pattern: string;
  directoryPath?: string;
  filePattern?: string;
  recursive?: boolean;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  useRegex?: boolean;
  maxResults?: number;
  contextLines?: number;
  excludePatterns?: string[];
}

/**
 * Search Files Tool implementation
 */
export class SearchFilesTool extends BaseTool {
  readonly name = "search_files";
  readonly description = "Search for text patterns within files in a directory";
  readonly schema = {
    type: "object" as const,
    properties: {
      pattern: {
        type: "string",
        description: "Text pattern to search for",
      },
      directoryPath: {
        type: "string",
        description: "Directory to search in (default: current directory)",
        default: ".",
      },
      filePattern: {
        type: "string",
        description: 'File name pattern to match (glob pattern, e.g., "*.js")',
        default: "*",
      },
      recursive: {
        type: "boolean",
        description: "Search subdirectories recursively",
        default: true,
      },
      caseSensitive: {
        type: "boolean",
        description: "Case-sensitive search",
        default: false,
      },
      wholeWord: {
        type: "boolean",
        description: "Match whole words only",
        default: false,
      },
      useRegex: {
        type: "boolean",
        description: "Treat pattern as regular expression",
        default: false,
      },
      maxResults: {
        type: "number",
        description: "Maximum number of results to return",
        default: 100,
        minimum: 1,
      },
      contextLines: {
        type: "number",
        description: "Number of context lines to include before and after matches",
        default: 2,
        minimum: 0,
      },
      excludePatterns: {
        type: "array",
        items: { type: "string" },
        description: "Patterns to exclude from search",
        default: FILESYSTEM_TOOLS_CONFIG.DEFAULT_EXCLUDES,
      },
    },
    required: ["pattern"],
    additionalProperties: false,
  };

  /**
   * Get tool tags
   */
  getTags(): string[] {
    return ["filesystem", "search", "grep"];
  }

  /**
   * Check if tool is available in context
   */
  isAvailable(context?: ToolContext): boolean {
    return true; // Always available
  }

  /**
   * Check if file matches pattern
   */
  private matchesFilePattern(fileName: string, pattern: string): boolean {
    if (pattern === "*") return true;

    // Convert glob pattern to regex
    const regexPattern = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".");

    const regex = new RegExp(`^${regexPattern}$`, "i");
    return regex.test(fileName);
  }

  /**
   * Check if path should be excluded
   */
  private shouldExclude(path: string, excludePatterns: string[]): boolean {
    const name = basename(path);

    for (const pattern of excludePatterns) {
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
   * Check if file is text file
   */
  private isTextFile(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase();
    const textExtensions = [".txt", ".md", ".json", ".js", ".ts", ".py", ".java", ".c", ".cpp"];
    const binaryExtensions = [".jpg", ".png", ".pdf", ".exe", ".zip", ".mp3", ".mp4"];
    return textExtensions.includes(ext) || !binaryExtensions.includes(ext);
  }

  /**
   * Create search regex
   */
  private createSearchRegex(
    pattern: string,
    caseSensitive: boolean,
    wholeWord: boolean,
    useRegex: boolean
  ): RegExp {
    let regexPattern = pattern;

    if (!useRegex) {
      // Escape special regex characters
      regexPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    if (wholeWord) {
      regexPattern = `\\b${regexPattern}\\b`;
    }

    const flags = caseSensitive ? "g" : "gi";
    return new RegExp(regexPattern, flags);
  }

  /**
   * Search within a file
   */
  private async searchInFile(
    filePath: string,
    regex: RegExp,
    contextLines: number
  ): Promise<SearchResult[]> {
    try {
      const content = await fs.readFile(filePath, "utf8");
      const lines = content.split("\n");
      const results: SearchResult[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const matches = Array.from(line.matchAll(regex));

        for (const match of matches) {
          const context =
            contextLines > 0
              ? {
                  before: lines.slice(Math.max(0, i - contextLines), i),
                  after: lines.slice(i + 1, Math.min(lines.length, i + 1 + contextLines)),
                }
              : undefined;

          results.push({
            filePath,
            lineNumber: i + 1,
            line,
            match: match[0],
            context,
          });
        }
      }

      return results;
    } catch (error) {
      // Skip files that can't be read
      return [];
    }
  }

  /**
   * Find files to search
   */
  private async findFiles(
    dirPath: string,
    filePattern: string,
    recursive: boolean,
    excludePatterns: string[]
  ): Promise<string[]> {
    const files: string[] = [];
    const queue: string[] = [dirPath];

    while (queue.length > 0) {
      const currentDir = queue.shift()!;

      try {
        const items = await fs.readdir(currentDir);

        for (const item of items) {
          const itemPath = join(currentDir, item);

          // Skip excluded patterns
          if (this.shouldExclude(itemPath, excludePatterns)) {
            continue;
          }

          try {
            const stats = await fs.lstat(itemPath);

            if (stats.isDirectory() && recursive) {
              queue.push(itemPath);
            } else if (stats.isFile()) {
              if (this.matchesFilePattern(item, filePattern) && this.isTextFile(itemPath)) {
                files.push(itemPath);
              }
            }
          } catch (error) {
            // Skip items that can't be accessed
            continue;
          }
        }
      } catch (error) {
        // Skip directories that can't be accessed
        continue;
      }
    }

    return files;
  }

  /**
   * Format search results
   */
  private formatResults(results: SearchResult[]): string {
    if (results.length === 0) {
      return "No matches found";
    }

    const lines: string[] = [`Found ${results.length} matches:`];

    let currentFile = "";
    for (const result of results) {
      if (result.filePath !== currentFile) {
        currentFile = result.filePath;
        lines.push(`\n${currentFile}:`);
      }

      lines.push(`  ${result.lineNumber}: ${result.line.trim()}`);

      if (result.context) {
        // Add context lines
        result.context.before.forEach((line, idx) => {
          const lineNum = result.lineNumber - result.context!.before.length + idx;
          lines.push(`    ${lineNum}: ${line.trim()}`);
        });

        result.context.after.forEach((line, idx) => {
          const lineNum = result.lineNumber + idx + 1;
          lines.push(`    ${lineNum}: ${line.trim()}`);
        });
      }
    }

    return lines.join("\n");
  }

  /**
   * Execute the tool
   */
  async execute(params: SearchFilesParams, context?: ToolContext): Promise<MCPToolCallResult> {
    try {
      // Validate parameters
      const validation = this.validate(params);
      if (!validation.valid) {
        return this.createErrorResult(`Invalid parameters: ${validation.errors.join(", ")}`);
      }

      const {
        pattern,
        directoryPath = ".",
        filePattern = "*",
        recursive = true,
        caseSensitive = false,
        wholeWord = false,
        useRegex = false,
        maxResults = 100,
        contextLines = 2,
        excludePatterns = ["node_modules", ".git", ".DS_Store"],
      } = params;

      const resolvedPath = resolve(directoryPath);

      // Check if directory exists
      try {
        const stats = await fs.stat(resolvedPath);
        if (!stats.isDirectory()) {
          return this.createErrorResult(`Path '${directoryPath}' is not a directory`);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return this.createErrorResult(`Directory not found: ${directoryPath}`);
        }
        throw error;
      }

      // Create search regex
      let searchRegex: RegExp;
      try {
        searchRegex = this.createSearchRegex(pattern, caseSensitive, wholeWord, useRegex);
      } catch (error) {
        return this.createErrorResult(`Invalid regex pattern: ${pattern}`);
      }

      // Find files to search
      const files = await this.findFiles(resolvedPath, filePattern, recursive, excludePatterns);

      if (files.length === 0) {
        return this.createSuccessResult([
          { type: "text", text: "No files found matching the criteria" },
        ]);
      }

      // Search in files
      const allResults: SearchResult[] = [];

      for (const file of files) {
        if (allResults.length >= maxResults) break;

        const fileResults = await this.searchInFile(file, searchRegex, contextLines);
        allResults.push(...fileResults.slice(0, maxResults - allResults.length));
      }

      // Format and return results
      const formattedOutput = this.formatResults(allResults);

      return this.createSuccessResult([{ type: "text", text: formattedOutput }]);
    } catch (error) {
      return this.createErrorResult(
        `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
