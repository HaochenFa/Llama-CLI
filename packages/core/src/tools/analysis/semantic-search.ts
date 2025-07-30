/**
 * Semantic Search Tool for LlamaCLI
 * Provides intelligent code search with semantic understanding
 */

import { BaseTool, ToolParams, ToolContext } from "../base.js";
import { MCPToolCallResult, MCPTextContent } from "../../types/mcp.js";
import { promises as fs } from "fs";
import { resolve, relative, extname, basename } from "path";
import { ASTAnalyzerTool } from "./ast-analyzer.js";
import type { SymbolInfo } from "./ast-analyzer.js";

/**
 * Semantic search result
 */
export interface SemanticSearchResult {
  filePath: string;
  symbol?: SymbolInfo;
  line: number;
  column: number;
  context: string;
  relevanceScore: number;
  matchType: "exact" | "semantic" | "fuzzy" | "contextual";
  explanation: string;
}

/**
 * Search context information
 */
export interface SearchContext {
  query: string;
  intent:
    | "find_function"
    | "find_class"
    | "find_variable"
    | "find_usage"
    | "find_definition"
    | "general";
  language?: "typescript" | "javascript";
  scope?: "file" | "project";
  filters?: {
    fileTypes?: string[];
    excludePaths?: string[];
    symbolTypes?: string[];
  };
}

/**
 * Semantic search parameters
 */
export interface SemanticSearchParams extends ToolParams {
  query: string;
  projectPath?: string;
  filePath?: string;
  intent?: SearchContext["intent"];
  maxResults?: number;
  minRelevanceScore?: number;
  includeContext?: boolean;
  fuzzySearch?: boolean;
  caseSensitive?: boolean;
}

/**
 * Semantic Search Tool
 */
export class SemanticSearchTool extends BaseTool {
  name = "semantic_search";
  description =
    "Perform intelligent semantic search across code with understanding of programming concepts and context";

  schema = {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "Search query (can be natural language or code patterns)",
      },
      projectPath: {
        type: "string",
        description: "Path to project root for project-wide search",
      },
      filePath: {
        type: "string",
        description: "Path to specific file for file-scoped search",
      },
      intent: {
        type: "string",
        enum: [
          "find_function",
          "find_class",
          "find_variable",
          "find_usage",
          "find_definition",
          "general",
        ],
        description: "Search intent to improve relevance",
        default: "general",
      },
      maxResults: {
        type: "number",
        description: "Maximum number of results to return",
        default: 20,
      },
      minRelevanceScore: {
        type: "number",
        description: "Minimum relevance score (0.0-1.0)",
        default: 0.3,
      },
      includeContext: {
        type: "boolean",
        description: "Include surrounding code context in results",
        default: true,
      },
      fuzzySearch: {
        type: "boolean",
        description: "Enable fuzzy string matching",
        default: true,
      },
      caseSensitive: {
        type: "boolean",
        description: "Case-sensitive search",
        default: false,
      },
    },
    required: ["query"],
    additionalProperties: false,
  };

  private astAnalyzer = new ASTAnalyzerTool();

  /**
   * Validate parameters
   */
  validate(params: SemanticSearchParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!params.query || typeof params.query !== "string" || params.query.trim().length === 0) {
      errors.push("query is required and must be a non-empty string");
    }

    if (params.maxResults !== undefined && (params.maxResults < 1 || params.maxResults > 1000)) {
      errors.push("maxResults must be between 1 and 1000");
    }

    if (
      params.minRelevanceScore !== undefined &&
      (params.minRelevanceScore < 0 || params.minRelevanceScore > 1)
    ) {
      errors.push("minRelevanceScore must be between 0.0 and 1.0");
    }

    if (!params.projectPath && !params.filePath) {
      errors.push("Either projectPath or filePath must be provided");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Execute semantic search
   */
  async execute(params: SemanticSearchParams, context?: ToolContext): Promise<MCPToolCallResult> {
    try {
      // Validate parameters
      const validation = this.validate(params);
      if (!validation.valid) {
        return this.createErrorResult(`Invalid parameters: ${validation.errors.join(", ")}`);
      }

      const {
        query,
        projectPath,
        filePath,
        intent = "general",
        maxResults = 20,
        minRelevanceScore = 0.3,
        includeContext = true,
        fuzzySearch = true,
        caseSensitive = false,
      } = params;

      // Determine search scope
      const searchFiles = await this.getSearchFiles(projectPath, filePath);

      if (searchFiles.length === 0) {
        return this.createErrorResult("No files found to search");
      }

      // Parse search query and determine intent
      const searchContext = this.parseSearchQuery(query, intent);

      // Perform semantic search
      const results = await this.performSemanticSearch(searchFiles, searchContext, {
        maxResults,
        minRelevanceScore,
        includeContext,
        fuzzySearch,
        caseSensitive,
      });

      // Format results
      const content: MCPTextContent[] = [
        {
          type: "text",
          text: this.formatSearchResults(results, searchContext, searchFiles.length),
        },
      ];

      return {
        isError: false,
        content,
      };
    } catch (error) {
      return this.createErrorResult(
        `Semantic search failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get files to search based on parameters
   */
  private async getSearchFiles(projectPath?: string, filePath?: string): Promise<string[]> {
    if (filePath) {
      const resolvedPath = resolve(filePath);
      try {
        await fs.access(resolvedPath);
        return [resolvedPath];
      } catch {
        throw new Error(`File not found: ${filePath}`);
      }
    }

    if (projectPath) {
      const resolvedPath = resolve(projectPath);
      try {
        const stat = await fs.stat(resolvedPath);
        if (!stat.isDirectory()) {
          throw new Error(`Project path is not a directory: ${projectPath}`);
        }
      } catch {
        throw new Error(`Project directory not found: ${projectPath}`);
      }

      return this.findCodeFiles(resolvedPath);
    }

    return [];
  }

  /**
   * Find code files in project directory
   */
  private async findCodeFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    const maxDepth = 10;

    const traverse = async (dirPath: string, depth: number) => {
      if (depth > maxDepth) return;

      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = resolve(dirPath, entry.name);
          const relativePath = relative(projectPath, fullPath);

          // Skip excluded directories
          if (
            relativePath.includes("node_modules") ||
            relativePath.includes(".git") ||
            relativePath.includes("dist") ||
            relativePath.includes("build")
          ) {
            continue;
          }

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
   * Parse search query and determine intent
   */
  private parseSearchQuery(query: string, intent: SearchContext["intent"]): SearchContext {
    const normalizedQuery = query.toLowerCase().trim();

    // Detect intent from query if not explicitly provided
    let detectedIntent = intent;
    if (intent === "general") {
      if (normalizedQuery.includes("function") || normalizedQuery.includes("method")) {
        detectedIntent = "find_function";
      } else if (normalizedQuery.includes("class")) {
        detectedIntent = "find_class";
      } else if (
        normalizedQuery.includes("variable") ||
        normalizedQuery.includes("const") ||
        normalizedQuery.includes("let")
      ) {
        detectedIntent = "find_variable";
      } else if (
        normalizedQuery.includes("usage") ||
        normalizedQuery.includes("used") ||
        normalizedQuery.includes("called")
      ) {
        detectedIntent = "find_usage";
      } else if (
        normalizedQuery.includes("definition") ||
        normalizedQuery.includes("defined") ||
        normalizedQuery.includes("declare")
      ) {
        detectedIntent = "find_definition";
      }
    }

    return {
      query: normalizedQuery,
      intent: detectedIntent,
      scope: "project",
    };
  }

  /**
   * Perform semantic search across files
   */
  private async performSemanticSearch(
    files: string[],
    searchContext: SearchContext,
    options: {
      maxResults: number;
      minRelevanceScore: number;
      includeContext: boolean;
      fuzzySearch: boolean;
      caseSensitive: boolean;
    }
  ): Promise<SemanticSearchResult[]> {
    const allResults: SemanticSearchResult[] = [];

    for (const filePath of files) {
      try {
        const fileResults = await this.searchInFile(filePath, searchContext, options);
        allResults.push(...fileResults);
      } catch (error) {
        // Continue with other files if one fails
        console.warn(`Failed to search in ${filePath}:`, error);
      }
    }

    // Sort by relevance score and limit results
    return allResults
      .filter((result) => result.relevanceScore >= options.minRelevanceScore)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, options.maxResults);
  }

  /**
   * Search within a single file
   */
  private async searchInFile(
    filePath: string,
    searchContext: SearchContext,
    options: {
      includeContext: boolean;
      fuzzySearch: boolean;
      caseSensitive: boolean;
    }
  ): Promise<SemanticSearchResult[]> {
    const results: SemanticSearchResult[] = [];

    // Read file content
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n");

    // Get AST analysis for structured search
    let astResult: any = null;
    try {
      const astAnalysis = await this.astAnalyzer.execute({
        filePath,
        includeComplexity: false,
        includeDocumentation: true,
        includeDiagnostics: false,
        includeTypes: true,
      });

      if (!astAnalysis.isError) {
        astResult = astAnalysis;
      }
    } catch {
      // Continue with text-based search if AST analysis fails
    }

    // Perform different types of searches based on intent
    switch (searchContext.intent) {
      case "find_function":
        results.push(...this.searchFunctions(filePath, lines, searchContext, options, astResult));
        break;
      case "find_class":
        results.push(...this.searchClasses(filePath, lines, searchContext, options, astResult));
        break;
      case "find_variable":
        results.push(...this.searchVariables(filePath, lines, searchContext, options, astResult));
        break;
      case "find_usage":
      case "find_definition":
        results.push(...this.searchUsageAndDefinitions(filePath, lines, searchContext, options));
        break;
      default:
        results.push(...this.searchGeneral(filePath, lines, searchContext, options));
    }

    return results;
  }

  /**
   * Search for functions
   */
  private searchFunctions(
    filePath: string,
    lines: string[],
    searchContext: SearchContext,
    options: any,
    astResult?: any
  ): SemanticSearchResult[] {
    const results: SemanticSearchResult[] = [];
    const query = searchContext.query;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Look for function declarations
      const functionPatterns = [
        /function\s+(\w+)/,
        /const\s+(\w+)\s*=\s*\(/,
        /(\w+)\s*:\s*\([^)]*\)\s*=>/,
        /(\w+)\s*\([^)]*\)\s*{/,
      ];

      for (const pattern of functionPatterns) {
        const match = line.match(pattern);
        if (match) {
          const functionName = match[1];
          const relevanceScore = this.calculateRelevanceScore(
            query,
            functionName,
            line,
            "function"
          );

          if (relevanceScore > 0) {
            results.push({
              filePath,
              line: lineNumber,
              column: match.index || 0,
              context: options.includeContext ? this.getContext(lines, i, 2) : line.trim(),
              relevanceScore,
              matchType: this.getMatchType(query, functionName),
              explanation: `Function "${functionName}" matches search query`,
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Search for classes
   */
  private searchClasses(
    filePath: string,
    lines: string[],
    searchContext: SearchContext,
    options: any,
    astResult?: any
  ): SemanticSearchResult[] {
    const results: SemanticSearchResult[] = [];
    const query = searchContext.query;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Look for class declarations
      const classPattern = /class\s+(\w+)/;
      const interfacePattern = /interface\s+(\w+)/;
      const typePattern = /type\s+(\w+)/;

      for (const pattern of [classPattern, interfacePattern, typePattern]) {
        const match = line.match(pattern);
        if (match) {
          const className = match[1];
          const relevanceScore = this.calculateRelevanceScore(query, className, line, "class");

          if (relevanceScore > 0) {
            results.push({
              filePath,
              line: lineNumber,
              column: match.index || 0,
              context: options.includeContext ? this.getContext(lines, i, 3) : line.trim(),
              relevanceScore,
              matchType: this.getMatchType(query, className),
              explanation: `Class/Type "${className}" matches search query`,
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Search for variables
   */
  private searchVariables(
    filePath: string,
    lines: string[],
    searchContext: SearchContext,
    options: any,
    astResult?: any
  ): SemanticSearchResult[] {
    const results: SemanticSearchResult[] = [];
    const query = searchContext.query;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Look for variable declarations
      const variablePatterns = [/const\s+(\w+)/, /let\s+(\w+)/, /var\s+(\w+)/];

      for (const pattern of variablePatterns) {
        const match = line.match(pattern);
        if (match) {
          const variableName = match[1];
          const relevanceScore = this.calculateRelevanceScore(
            query,
            variableName,
            line,
            "variable"
          );

          if (relevanceScore > 0) {
            results.push({
              filePath,
              line: lineNumber,
              column: match.index || 0,
              context: options.includeContext ? this.getContext(lines, i, 1) : line.trim(),
              relevanceScore,
              matchType: this.getMatchType(query, variableName),
              explanation: `Variable "${variableName}" matches search query`,
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Search for usage and definitions
   */
  private searchUsageAndDefinitions(
    filePath: string,
    lines: string[],
    searchContext: SearchContext,
    options: any
  ): SemanticSearchResult[] {
    const results: SemanticSearchResult[] = [];
    const query = searchContext.query;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Simple text search for now
      if (line.toLowerCase().includes(query)) {
        const relevanceScore = this.calculateRelevanceScore(query, "", line, "usage");

        results.push({
          filePath,
          line: lineNumber,
          column: line.toLowerCase().indexOf(query),
          context: options.includeContext ? this.getContext(lines, i, 2) : line.trim(),
          relevanceScore,
          matchType: "contextual",
          explanation: `Line contains search query in context`,
        });
      }
    }

    return results;
  }

  /**
   * General search
   */
  private searchGeneral(
    filePath: string,
    lines: string[],
    searchContext: SearchContext,
    options: any
  ): SemanticSearchResult[] {
    const results: SemanticSearchResult[] = [];
    const query = searchContext.query;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      if (line.toLowerCase().includes(query)) {
        const relevanceScore = this.calculateRelevanceScore(query, "", line, "general");

        results.push({
          filePath,
          line: lineNumber,
          column: line.toLowerCase().indexOf(query),
          context: options.includeContext ? this.getContext(lines, i, 2) : line.trim(),
          relevanceScore,
          matchType: "contextual",
          explanation: `Line contains search query`,
        });
      }
    }

    return results;
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevanceScore(
    query: string,
    symbolName: string,
    line: string,
    type: string
  ): number {
    let score = 0;

    // Exact match gets highest score
    if (symbolName.toLowerCase() === query) {
      score = 1.0;
    } else if (symbolName.toLowerCase().includes(query)) {
      score = 0.8;
    } else if (line.toLowerCase().includes(query)) {
      score = 0.6;
    }

    // Boost score based on symbol type relevance
    if (type === "function" && query.includes("function")) {
      score += 0.2;
    } else if (type === "class" && query.includes("class")) {
      score += 0.2;
    } else if (type === "variable" && query.includes("variable")) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Determine match type
   */
  private getMatchType(query: string, symbolName: string): SemanticSearchResult["matchType"] {
    if (symbolName.toLowerCase() === query) {
      return "exact";
    } else if (symbolName.toLowerCase().includes(query)) {
      return "semantic";
    } else {
      return "fuzzy";
    }
  }

  /**
   * Get surrounding context lines
   */
  private getContext(lines: string[], lineIndex: number, contextSize: number): string {
    const start = Math.max(0, lineIndex - contextSize);
    const end = Math.min(lines.length, lineIndex + contextSize + 1);

    return lines
      .slice(start, end)
      .map((line, i) => {
        const actualLineNumber = start + i + 1;
        const marker = actualLineNumber === lineIndex + 1 ? "→ " : "  ";
        return `${marker}${actualLineNumber}: ${line}`;
      })
      .join("\n");
  }

  /**
   * Format search results
   */
  private formatSearchResults(
    results: SemanticSearchResult[],
    searchContext: SearchContext,
    totalFiles: number
  ): string {
    const lines: string[] = [];

    lines.push(`# Semantic Search Results`);
    lines.push(`**Query:** "${searchContext.query}"`);
    lines.push(`**Intent:** ${searchContext.intent}`);
    lines.push(`**Files Searched:** ${totalFiles}`);
    lines.push(`**Results Found:** ${results.length}`);
    lines.push("");

    if (results.length === 0) {
      lines.push("No results found matching your search criteria.");
      lines.push("");
      lines.push("**Suggestions:**");
      lines.push("- Try a broader search query");
      lines.push("- Check spelling and case sensitivity");
      lines.push("- Use different search intent");
      lines.push("- Enable fuzzy search");
      return lines.join("\n");
    }

    // Group results by file
    const resultsByFile = results.reduce(
      (acc, result) => {
        if (!acc[result.filePath]) acc[result.filePath] = [];
        acc[result.filePath].push(result);
        return acc;
      },
      {} as Record<string, SemanticSearchResult[]>
    );

    for (const [filePath, fileResults] of Object.entries(resultsByFile)) {
      lines.push(`## ${basename(filePath)}`);
      lines.push(`*${filePath}*`);
      lines.push("");

      for (const result of fileResults) {
        lines.push(`### Line ${result.line} (Score: ${result.relevanceScore.toFixed(2)})`);
        lines.push(`**Match Type:** ${result.matchType}`);
        lines.push(`**Explanation:** ${result.explanation}`);
        lines.push("");
        lines.push("```typescript");
        lines.push(result.context);
        lines.push("```");
        lines.push("");
      }
    }

    return lines.join("\n");
  }
}
