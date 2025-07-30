/**
 * Code Indexer Tool for LlamaCLI
 * Provides intelligent code indexing with caching and incremental updates
 */

import { BaseTool, ToolParams, ToolContext } from "../base.js";
import { MCPToolCallResult, MCPTextContent } from "../../types/mcp.js";
import { promises as fs } from "fs";
import { resolve, relative, join, dirname, basename, extname } from "path";
import { createHash } from "crypto";
import { ASTAnalyzerTool } from "./ast-analyzer.js";
import type { SymbolInfo, ImportExportInfo } from "./ast-analyzer.js";

/**
 * Indexed symbol information
 */
export interface IndexedSymbol extends SymbolInfo {
  filePath: string;
  fileHash: string;
  lastModified: number;
  dependencies: string[];
  usages: SymbolUsage[];
}

/**
 * Symbol usage information
 */
export interface SymbolUsage {
  filePath: string;
  line: number;
  column: number;
  context: string;
  type: "call" | "reference" | "assignment" | "declaration";
}

/**
 * Indexed file information
 */
export interface IndexedFile {
  filePath: string;
  hash: string;
  lastModified: number;
  lastIndexed: number;
  symbols: IndexedSymbol[];
  imports: ImportExportInfo[];
  exports: ImportExportInfo[];
  dependencies: string[];
  dependents: string[];
  language: "typescript" | "javascript";
  size: number;
  linesOfCode: number;
}

/**
 * Project index
 */
export interface ProjectIndex {
  projectRoot: string;
  version: string;
  created: number;
  lastUpdated: number;
  files: Map<string, IndexedFile>;
  symbols: Map<string, IndexedSymbol[]>;
  dependencies: Map<string, string[]>;
  statistics: {
    totalFiles: number;
    totalSymbols: number;
    totalLinesOfCode: number;
    indexSize: number;
  };
}

/**
 * Index update result
 */
export interface IndexUpdateResult {
  filesAdded: number;
  filesUpdated: number;
  filesRemoved: number;
  symbolsAdded: number;
  symbolsUpdated: number;
  symbolsRemoved: number;
  duration: number;
  errors: string[];
}

/**
 * Code indexer parameters
 */
export interface CodeIndexerParams extends ToolParams {
  projectPath: string;
  action: "create" | "update" | "query" | "stats" | "rebuild";
  query?: string;
  symbolType?: string;
  filePath?: string;
  includeNodeModules?: boolean;
  maxDepth?: number;
  forceRebuild?: boolean;
}

/**
 * Code Indexer Tool
 */
export class CodeIndexerTool extends BaseTool {
  name = "code_indexer";
  description =
    "Create and maintain intelligent code indexes for fast symbol lookup and project analysis";

  schema = {
    type: "object" as const,
    properties: {
      projectPath: {
        type: "string",
        description: "Path to the project root directory",
      },
      action: {
        type: "string",
        enum: ["create", "update", "query", "stats", "rebuild"],
        description: "Action to perform on the code index",
      },
      query: {
        type: "string",
        description: "Symbol name or pattern to search for (required for 'query' action)",
      },
      symbolType: {
        type: "string",
        description: "Type of symbol to filter by (function, class, variable, etc.)",
      },
      filePath: {
        type: "string",
        description: "Specific file path to index or query",
      },
      includeNodeModules: {
        type: "boolean",
        description: "Include node_modules in indexing",
        default: false,
      },
      maxDepth: {
        type: "number",
        description: "Maximum directory depth to index",
        default: 10,
      },
      forceRebuild: {
        type: "boolean",
        description: "Force complete rebuild of index",
        default: false,
      },
    },
    required: ["projectPath", "action"],
    additionalProperties: false,
  };

  private astAnalyzer = new ASTAnalyzerTool();
  private indexCache = new Map<string, ProjectIndex>();

  /**
   * Validate parameters
   */
  validate(params: CodeIndexerParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!params.projectPath || typeof params.projectPath !== "string") {
      errors.push("projectPath is required and must be a string");
    }

    if (params.action === "query" && !params.query) {
      errors.push("query is required when action is 'query'");
    }

    if (params.maxDepth !== undefined && (params.maxDepth < 1 || params.maxDepth > 50)) {
      errors.push("maxDepth must be between 1 and 50");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Execute code indexing operation
   */
  async execute(params: CodeIndexerParams, context?: ToolContext): Promise<MCPToolCallResult> {
    try {
      // Validate parameters
      const validation = this.validate(params);
      if (!validation.valid) {
        return this.createErrorResult(`Invalid parameters: ${validation.errors.join(", ")}`);
      }

      const {
        projectPath,
        action,
        query,
        symbolType,
        filePath,
        includeNodeModules = false,
        maxDepth = 10,
        forceRebuild = false,
      } = params;

      // Resolve project path
      const resolvedProjectPath = resolve(projectPath);

      // Check if project directory exists
      try {
        const stat = await fs.stat(resolvedProjectPath);
        if (!stat.isDirectory()) {
          return this.createErrorResult(`Project path is not a directory: ${projectPath}`);
        }
      } catch {
        return this.createErrorResult(`Project directory not found: ${projectPath}`);
      }

      let result: string;

      switch (action) {
        case "create":
        case "rebuild":
          result = await this.createIndex(resolvedProjectPath, {
            includeNodeModules,
            maxDepth,
            forceRebuild: forceRebuild || action === "rebuild",
          });
          break;

        case "update":
          result = await this.updateIndex(resolvedProjectPath, {
            includeNodeModules,
            maxDepth,
            filePath,
          });
          break;

        case "query":
          result = await this.queryIndex(resolvedProjectPath, query!, symbolType);
          break;

        case "stats":
          result = await this.getIndexStats(resolvedProjectPath);
          break;

        default:
          return this.createErrorResult(`Unknown action: ${action}`);
      }

      const content: MCPTextContent[] = [
        {
          type: "text",
          text: result,
        },
      ];

      return {
        isError: false,
        content,
      };
    } catch (error) {
      return this.createErrorResult(
        `Code indexing failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Create or rebuild project index
   */
  private async createIndex(
    projectPath: string,
    options: {
      includeNodeModules: boolean;
      maxDepth: number;
      forceRebuild: boolean;
    }
  ): Promise<string> {
    const startTime = Date.now();

    // Check if index already exists and is valid
    const indexPath = this.getIndexPath(projectPath);
    if (!options.forceRebuild && (await this.indexExists(indexPath))) {
      const existingIndex = await this.loadIndex(indexPath);
      if (existingIndex) {
        return `Index already exists for project. Use 'update' action to refresh or set forceRebuild=true to rebuild completely.`;
      }
    }

    // Find all code files
    const files = await this.findCodeFiles(projectPath, options);

    // Create new index
    const index: ProjectIndex = {
      projectRoot: projectPath,
      version: "1.0.0",
      created: Date.now(),
      lastUpdated: Date.now(),
      files: new Map(),
      symbols: new Map(),
      dependencies: new Map(),
      statistics: {
        totalFiles: 0,
        totalSymbols: 0,
        totalLinesOfCode: 0,
        indexSize: 0,
      },
    };

    let processedFiles = 0;
    let totalSymbols = 0;
    const errors: string[] = [];

    // Index each file
    for (const filePath of files) {
      try {
        const indexedFile = await this.indexFile(filePath);
        if (indexedFile) {
          index.files.set(filePath, indexedFile);

          // Add symbols to global symbol map
          for (const symbol of indexedFile.symbols) {
            const symbolName = symbol.name;
            if (!index.symbols.has(symbolName)) {
              index.symbols.set(symbolName, []);
            }
            index.symbols.get(symbolName)!.push(symbol);
            totalSymbols++;
          }

          // Add dependencies
          if (indexedFile.dependencies.length > 0) {
            index.dependencies.set(filePath, indexedFile.dependencies);
          }

          processedFiles++;
        }
      } catch (error) {
        errors.push(
          `Failed to index ${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // Update statistics
    index.statistics = {
      totalFiles: processedFiles,
      totalSymbols,
      totalLinesOfCode: Array.from(index.files.values()).reduce(
        (sum, file) => sum + file.linesOfCode,
        0
      ),
      indexSize: this.calculateIndexSize(index),
    };

    // Save index
    await this.saveIndex(indexPath, index);

    // Cache index
    this.indexCache.set(projectPath, index);

    const duration = Date.now() - startTime;

    const lines: string[] = [];
    lines.push(`# Code Index Created`);
    lines.push(`**Project:** ${projectPath}`);
    lines.push(`**Duration:** ${duration}ms`);
    lines.push(`**Files Indexed:** ${processedFiles}`);
    lines.push(`**Total Symbols:** ${totalSymbols}`);
    lines.push(`**Lines of Code:** ${index.statistics.totalLinesOfCode}`);
    lines.push(`**Index Size:** ${(index.statistics.indexSize / 1024).toFixed(2)} KB`);

    if (errors.length > 0) {
      lines.push("");
      lines.push("## Errors");
      errors.slice(0, 10).forEach((error) => lines.push(`- ${error}`));
      if (errors.length > 10) {
        lines.push(`... and ${errors.length - 10} more errors`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Update existing index
   */
  private async updateIndex(
    projectPath: string,
    options: {
      includeNodeModules: boolean;
      maxDepth: number;
      filePath?: string;
    }
  ): Promise<string> {
    const startTime = Date.now();
    const indexPath = this.getIndexPath(projectPath);

    // Load existing index
    let index = await this.loadIndex(indexPath);
    if (!index) {
      return await this.createIndex(projectPath, {
        includeNodeModules: options.includeNodeModules,
        maxDepth: options.maxDepth,
        forceRebuild: false,
      });
    }

    const updateResult: IndexUpdateResult = {
      filesAdded: 0,
      filesUpdated: 0,
      filesRemoved: 0,
      symbolsAdded: 0,
      symbolsUpdated: 0,
      symbolsRemoved: 0,
      duration: 0,
      errors: [],
    };

    if (options.filePath) {
      // Update specific file
      const resolvedFilePath = resolve(options.filePath);
      try {
        const indexedFile = await this.indexFile(resolvedFilePath);
        if (indexedFile) {
          const existingFile = index.files.get(resolvedFilePath);
          if (existingFile) {
            updateResult.filesUpdated++;
            updateResult.symbolsUpdated += indexedFile.symbols.length;
          } else {
            updateResult.filesAdded++;
            updateResult.symbolsAdded += indexedFile.symbols.length;
          }

          index.files.set(resolvedFilePath, indexedFile);
          this.updateSymbolsMap(index, resolvedFilePath, indexedFile.symbols);
        }
      } catch (error) {
        updateResult.errors.push(
          `Failed to update ${resolvedFilePath}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    } else {
      // Update entire project
      const currentFiles = await this.findCodeFiles(projectPath, options);
      const existingFiles = new Set(index.files.keys());

      // Find new and modified files
      for (const filePath of currentFiles) {
        try {
          const stat = await fs.stat(filePath);
          const existingFile = index.files.get(filePath);

          if (!existingFile || existingFile.lastModified < stat.mtimeMs) {
            const indexedFile = await this.indexFile(filePath);
            if (indexedFile) {
              if (existingFile) {
                updateResult.filesUpdated++;
                updateResult.symbolsUpdated += indexedFile.symbols.length;
              } else {
                updateResult.filesAdded++;
                updateResult.symbolsAdded += indexedFile.symbols.length;
              }

              index.files.set(filePath, indexedFile);
              this.updateSymbolsMap(index, filePath, indexedFile.symbols);
            }
          }
          existingFiles.delete(filePath);
        } catch (error) {
          updateResult.errors.push(
            `Failed to update ${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      // Remove deleted files
      for (const deletedFile of existingFiles) {
        const file = index.files.get(deletedFile);
        if (file) {
          updateResult.filesRemoved++;
          updateResult.symbolsRemoved += file.symbols.length;
          index.files.delete(deletedFile);
          this.removeSymbolsFromMap(index, deletedFile);
        }
      }
    }

    // Update index metadata
    index.lastUpdated = Date.now();
    index.statistics = {
      totalFiles: index.files.size,
      totalSymbols: Array.from(index.symbols.values()).reduce(
        (sum, symbols) => sum + symbols.length,
        0
      ),
      totalLinesOfCode: Array.from(index.files.values()).reduce(
        (sum, file) => sum + file.linesOfCode,
        0
      ),
      indexSize: this.calculateIndexSize(index),
    };

    // Save updated index
    await this.saveIndex(indexPath, index);

    // Update cache
    this.indexCache.set(projectPath, index);

    updateResult.duration = Date.now() - startTime;

    const lines: string[] = [];
    lines.push(`# Index Updated`);
    lines.push(`**Project:** ${projectPath}`);
    lines.push(`**Duration:** ${updateResult.duration}ms`);
    lines.push(`**Files Added:** ${updateResult.filesAdded}`);
    lines.push(`**Files Updated:** ${updateResult.filesUpdated}`);
    lines.push(`**Files Removed:** ${updateResult.filesRemoved}`);
    lines.push(`**Symbols Added:** ${updateResult.symbolsAdded}`);
    lines.push(`**Symbols Updated:** ${updateResult.symbolsUpdated}`);
    lines.push(`**Symbols Removed:** ${updateResult.symbolsRemoved}`);

    if (updateResult.errors.length > 0) {
      lines.push("");
      lines.push("## Errors");
      updateResult.errors.slice(0, 10).forEach((error) => lines.push(`- ${error}`));
      if (updateResult.errors.length > 10) {
        lines.push(`... and ${updateResult.errors.length - 10} more errors`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Query the index for symbols
   */
  private async queryIndex(
    projectPath: string,
    query: string,
    symbolType?: string
  ): Promise<string> {
    const indexPath = this.getIndexPath(projectPath);
    const index = await this.loadIndex(indexPath);

    if (!index) {
      return `No index found for project. Run 'create' action first to build the index.`;
    }

    const results: IndexedSymbol[] = [];
    const queryLower = query.toLowerCase();

    // Search symbols
    for (const [symbolName, symbols] of index.symbols.entries()) {
      if (symbolName.toLowerCase().includes(queryLower)) {
        for (const symbol of symbols) {
          if (!symbolType || symbol.kindName.toLowerCase().includes(symbolType.toLowerCase())) {
            results.push(symbol);
          }
        }
      }
    }

    // Sort by relevance (exact matches first, then partial matches)
    results.sort((a, b) => {
      const aExact = a.name.toLowerCase() === queryLower ? 1 : 0;
      const bExact = b.name.toLowerCase() === queryLower ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;

      return a.name.localeCompare(b.name);
    });

    const lines: string[] = [];
    lines.push(`# Symbol Search Results`);
    lines.push(`**Query:** "${query}"`);
    if (symbolType) lines.push(`**Symbol Type:** ${symbolType}`);
    lines.push(`**Results Found:** ${results.length}`);
    lines.push("");

    if (results.length === 0) {
      lines.push("No symbols found matching your query.");
      return lines.join("\n");
    }

    // Group results by file
    const resultsByFile = results.reduce(
      (acc, symbol) => {
        if (!acc[symbol.filePath]) acc[symbol.filePath] = [];
        acc[symbol.filePath].push(symbol);
        return acc;
      },
      {} as Record<string, IndexedSymbol[]>
    );

    for (const [filePath, symbols] of Object.entries(resultsByFile)) {
      const relativePath = relative(projectPath, filePath);
      lines.push(`## ${basename(filePath)}`);
      lines.push(`*${relativePath}*`);
      lines.push("");

      for (const symbol of symbols) {
        lines.push(`### ${symbol.name} (${symbol.kindName})`);
        lines.push(`**Line:** ${symbol.line}`);
        if (symbol.type) lines.push(`**Type:** ${symbol.type}`);
        if (symbol.modifiers.length > 0)
          lines.push(`**Modifiers:** ${symbol.modifiers.join(", ")}`);
        if (symbol.documentation) lines.push(`**Documentation:** ${symbol.documentation}`);
        lines.push("");
      }
    }

    return lines.join("\n");
  }

  /**
   * Get index statistics
   */
  private async getIndexStats(projectPath: string): Promise<string> {
    const indexPath = this.getIndexPath(projectPath);
    const index = await this.loadIndex(indexPath);

    if (!index) {
      return `No index found for project. Run 'create' action first to build the index.`;
    }

    const lines: string[] = [];
    lines.push(`# Index Statistics`);
    lines.push(`**Project:** ${projectPath}`);
    lines.push(`**Created:** ${new Date(index.created).toLocaleString()}`);
    lines.push(`**Last Updated:** ${new Date(index.lastUpdated).toLocaleString()}`);
    lines.push(`**Version:** ${index.version}`);
    lines.push("");

    lines.push("## File Statistics");
    lines.push(`- Total Files: ${index.statistics.totalFiles}`);
    lines.push(`- Total Lines of Code: ${index.statistics.totalLinesOfCode}`);
    lines.push(
      `- Average Lines per File: ${Math.round(index.statistics.totalLinesOfCode / index.statistics.totalFiles)}`
    );
    lines.push("");

    lines.push("## Symbol Statistics");
    lines.push(`- Total Symbols: ${index.statistics.totalSymbols}`);
    lines.push(
      `- Average Symbols per File: ${Math.round(index.statistics.totalSymbols / index.statistics.totalFiles)}`
    );
    lines.push(`- Unique Symbol Names: ${index.symbols.size}`);
    lines.push("");

    lines.push("## Index Statistics");
    lines.push(`- Index Size: ${(index.statistics.indexSize / 1024).toFixed(2)} KB`);
    lines.push(`- Memory Usage: ${(this.calculateIndexSize(index) / 1024).toFixed(2)} KB`);

    return lines.join("\n");
  }

  /**
   * Index a single file
   */
  private async indexFile(filePath: string): Promise<IndexedFile | null> {
    try {
      const stat = await fs.stat(filePath);
      const content = await fs.readFile(filePath, "utf-8");
      const hash = createHash("md5").update(content).digest("hex");

      // Get AST analysis
      const astResult = await this.astAnalyzer.execute({
        filePath,
        includeComplexity: false,
        includeDocumentation: true,
        includeDiagnostics: false,
        includeTypes: true,
      });

      if (astResult.isError) {
        throw new Error("AST analysis failed");
      }

      // Parse AST result (simplified - in reality we'd need structured data)
      const symbols: IndexedSymbol[] = [];
      const imports: ImportExportInfo[] = [];
      const exports: ImportExportInfo[] = [];
      const dependencies: string[] = [];

      // This is simplified - we would parse the actual AST result
      const lines = content.split("\n");
      const ext = extname(filePath);
      const language: "typescript" | "javascript" = ext.includes("ts")
        ? "typescript"
        : "javascript";

      return {
        filePath,
        hash,
        lastModified: stat.mtimeMs,
        lastIndexed: Date.now(),
        symbols,
        imports,
        exports,
        dependencies,
        dependents: [],
        language,
        size: stat.size,
        linesOfCode: lines.length,
      };
    } catch (error) {
      console.warn(`Failed to index ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Find all code files in project
   */
  private async findCodeFiles(
    projectPath: string,
    options: { includeNodeModules: boolean; maxDepth: number }
  ): Promise<string[]> {
    const files: string[] = [];

    const traverse = async (dirPath: string, depth: number) => {
      if (depth > options.maxDepth) return;

      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(dirPath, entry.name);
          const relativePath = relative(projectPath, fullPath);

          // Skip excluded directories
          if (!options.includeNodeModules && relativePath.includes("node_modules")) continue;
          if (
            relativePath.includes(".git") ||
            relativePath.includes("dist") ||
            relativePath.includes("build")
          )
            continue;

          if (entry.isDirectory()) {
            await traverse(fullPath, depth + 1);
          } else if (entry.isFile()) {
            const ext = extname(fullPath);
            if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Ignore permission errors
      }
    };

    await traverse(projectPath, 0);
    return files;
  }

  /**
   * Get index file path
   */
  private getIndexPath(projectPath: string): string {
    return join(projectPath, ".llamacli", "code-index.json");
  }

  /**
   * Check if index exists
   */
  private async indexExists(indexPath: string): Promise<boolean> {
    try {
      await fs.access(indexPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load index from file
   */
  private async loadIndex(indexPath: string): Promise<ProjectIndex | null> {
    try {
      const content = await fs.readFile(indexPath, "utf-8");
      const data = JSON.parse(content);

      // Convert plain objects back to Maps
      const index: ProjectIndex = {
        ...data,
        files: new Map(data.files),
        symbols: new Map(data.symbols),
        dependencies: new Map(data.dependencies),
      };

      return index;
    } catch {
      return null;
    }
  }

  /**
   * Save index to file
   */
  private async saveIndex(indexPath: string, index: ProjectIndex): Promise<void> {
    // Ensure directory exists
    await fs.mkdir(dirname(indexPath), { recursive: true });

    // Convert Maps to plain objects for JSON serialization
    const data = {
      ...index,
      files: Array.from(index.files.entries()),
      symbols: Array.from(index.symbols.entries()),
      dependencies: Array.from(index.dependencies.entries()),
    };

    await fs.writeFile(indexPath, JSON.stringify(data, null, 2));
  }

  /**
   * Calculate index size in bytes
   */
  private calculateIndexSize(index: ProjectIndex): number {
    return JSON.stringify({
      ...index,
      files: Array.from(index.files.entries()),
      symbols: Array.from(index.symbols.entries()),
      dependencies: Array.from(index.dependencies.entries()),
    }).length;
  }

  /**
   * Update symbols map when file is updated
   */
  private updateSymbolsMap(index: ProjectIndex, filePath: string, symbols: IndexedSymbol[]): void {
    // Remove old symbols for this file
    this.removeSymbolsFromMap(index, filePath);

    // Add new symbols
    for (const symbol of symbols) {
      const symbolName = symbol.name;
      if (!index.symbols.has(symbolName)) {
        index.symbols.set(symbolName, []);
      }
      index.symbols.get(symbolName)!.push(symbol);
    }
  }

  /**
   * Remove symbols from map when file is deleted
   */
  private removeSymbolsFromMap(index: ProjectIndex, filePath: string): void {
    for (const [symbolName, symbols] of index.symbols.entries()) {
      const filtered = symbols.filter((symbol) => symbol.filePath !== filePath);
      if (filtered.length === 0) {
        index.symbols.delete(symbolName);
      } else {
        index.symbols.set(symbolName, filtered);
      }
    }
  }
}
