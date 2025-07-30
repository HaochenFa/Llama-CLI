/**
 * Cross-Reference Analyzer Tool for LlamaCLI
 * Provides cross-file reference analysis and dependency tracking
 */

import { BaseTool, ToolParams, ToolContext } from "../base.js";
import { MCPToolCallResult, MCPTextContent } from "../../types/mcp.js";
import { promises as fs } from "fs";
import { resolve, dirname, join, relative, extname } from "path";
import { ASTAnalyzerTool, ImportExportInfo, SymbolInfo } from "./ast-analyzer.js";

/**
 * Symbol reference information
 */
export interface SymbolReference {
  symbol: string;
  filePath: string;
  line: number;
  column: number;
  type: "definition" | "usage" | "import" | "export";
  context?: string;
}

/**
 * Module dependency information
 */
export interface ModuleDependency {
  from: string;
  to: string;
  type: "import" | "export" | "dynamic";
  specifiers: string[];
  isExternal: boolean;
  line: number;
}

/**
 * Dependency graph node
 */
export interface DependencyNode {
  filePath: string;
  dependencies: string[];
  dependents: string[];
  isExternal: boolean;
  symbols: {
    exported: string[];
    imported: string[];
  };
}

/**
 * Cross-reference analysis result
 */
export interface CrossReferenceResult {
  projectRoot: string;
  analyzedFiles: string[];
  symbols: Map<string, SymbolReference[]>;
  dependencies: ModuleDependency[];
  dependencyGraph: Map<string, DependencyNode>;
  circularDependencies: string[][];
  unusedExports: Array<{
    filePath: string;
    symbol: string;
    line: number;
  }>;
  missingImports: Array<{
    filePath: string;
    symbol: string;
    line: number;
  }>;
}

/**
 * Cross-reference analyzer parameters
 */
export interface CrossReferenceParams extends ToolParams {
  projectPath: string;
  includeNodeModules?: boolean;
  maxDepth?: number;
  filePatterns?: string[];
  excludePatterns?: string[];
  findCircularDependencies?: boolean;
  findUnusedExports?: boolean;
  findMissingImports?: boolean;
}

/**
 * Cross-Reference Analyzer Tool
 */
export class CrossReferenceAnalyzerTool extends BaseTool {
  name = "cross_reference_analyzer";
  description =
    "Analyze cross-file references, dependencies, and symbol usage across a TypeScript/JavaScript project";

  schema = {
    type: "object" as const,
    properties: {
      projectPath: {
        type: "string",
        description: "Path to the project root directory",
      },
      includeNodeModules: {
        type: "boolean",
        description: "Include node_modules in analysis",
        default: false,
      },
      maxDepth: {
        type: "number",
        description: "Maximum directory depth to analyze",
        default: 10,
      },
      filePatterns: {
        type: "array",
        items: { type: "string" },
        description: "File patterns to include (e.g., ['*.ts', '*.tsx'])",
        default: ["*.ts", "*.tsx", "*.js", "*.jsx"],
      },
      excludePatterns: {
        type: "array",
        items: { type: "string" },
        description: "Patterns to exclude from analysis",
        default: ["node_modules", ".git", "dist", "build", "*.test.*", "*.spec.*"],
      },
      findCircularDependencies: {
        type: "boolean",
        description: "Find circular dependencies in the project",
        default: true,
      },
      findUnusedExports: {
        type: "boolean",
        description: "Find unused exported symbols",
        default: true,
      },
      findMissingImports: {
        type: "boolean",
        description: "Find missing import declarations",
        default: false,
      },
    },
    required: ["projectPath"],
    additionalProperties: false,
  };

  private astAnalyzer = new ASTAnalyzerTool();

  /**
   * Validate parameters
   */
  validate(params: CrossReferenceParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!params.projectPath || typeof params.projectPath !== "string") {
      errors.push("projectPath is required and must be a string");
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
   * Execute cross-reference analysis
   */
  async execute(params: CrossReferenceParams, context?: ToolContext): Promise<MCPToolCallResult> {
    try {
      // Validate parameters
      const validation = this.validate(params);
      if (!validation.valid) {
        return this.createErrorResult(`Invalid parameters: ${validation.errors.join(", ")}`);
      }

      const {
        projectPath,
        includeNodeModules = false,
        maxDepth = 10,
        filePatterns = ["*.ts", "*.tsx", "*.js", "*.jsx"],
        excludePatterns = ["node_modules", ".git", "dist", "build", "*.test.*", "*.spec.*"],
        findCircularDependencies = true,
        findUnusedExports = true,
        findMissingImports = false,
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

      // Find all relevant files
      const files = await this.findProjectFiles(
        resolvedProjectPath,
        filePatterns,
        excludePatterns,
        includeNodeModules,
        maxDepth
      );

      if (files.length === 0) {
        return this.createErrorResult("No TypeScript/JavaScript files found in the project");
      }

      // Analyze each file
      const analysisResults = new Map<string, any>();
      for (const filePath of files) {
        try {
          const result = await this.astAnalyzer.execute({
            filePath,
            includeComplexity: false,
            includeDocumentation: false,
            includeDiagnostics: false,
            includeTypes: false,
          });

          if (!result.isError && (result.content[0] as any)?.text) {
            // Parse the analysis result (this is simplified - in reality we'd need structured data)
            analysisResults.set(filePath, result);
          }
        } catch (error) {
          console.warn(`Failed to analyze ${filePath}:`, error);
        }
      }

      // Perform cross-reference analysis
      const crossRefResult = await this.performCrossReferenceAnalysis(
        resolvedProjectPath,
        files,
        analysisResults,
        {
          findCircularDependencies,
          findUnusedExports,
          findMissingImports,
        }
      );

      // Format results
      const content: MCPTextContent[] = [
        {
          type: "text",
          text: this.formatCrossReferenceResults(crossRefResult),
        },
      ];

      return {
        isError: false,
        content,
      };
    } catch (error) {
      return this.createErrorResult(
        `Cross-reference analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Find all project files matching patterns
   */
  private async findProjectFiles(
    projectPath: string,
    filePatterns: string[],
    excludePatterns: string[],
    includeNodeModules: boolean,
    maxDepth: number
  ): Promise<string[]> {
    const files: string[] = [];

    const isExcluded = (filePath: string): boolean => {
      const relativePath = relative(projectPath, filePath);

      if (!includeNodeModules && relativePath.includes("node_modules")) {
        return true;
      }

      return excludePatterns.some((pattern) => {
        if (pattern.includes("*")) {
          const regex = new RegExp(pattern.replace(/\*/g, ".*"));
          return regex.test(relativePath);
        }
        return relativePath.includes(pattern);
      });
    };

    const isIncluded = (filePath: string): boolean => {
      const ext = extname(filePath);
      return [".ts", ".tsx", ".js", ".jsx"].includes(ext);
    };

    const traverse = async (dirPath: string, depth: number) => {
      if (depth > maxDepth) return;

      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(dirPath, entry.name);

          if (isExcluded(fullPath)) continue;

          if (entry.isDirectory()) {
            await traverse(fullPath, depth + 1);
          } else if (entry.isFile() && isIncluded(fullPath)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Ignore permission errors and continue
      }
    };

    await traverse(projectPath, 0);
    return files;
  }

  /**
   * Perform cross-reference analysis
   */
  private async performCrossReferenceAnalysis(
    projectRoot: string,
    files: string[],
    analysisResults: Map<string, any>,
    options: {
      findCircularDependencies: boolean;
      findUnusedExports: boolean;
      findMissingImports: boolean;
    }
  ): Promise<CrossReferenceResult> {
    const symbols = new Map<string, SymbolReference[]>();
    const dependencies: ModuleDependency[] = [];
    const dependencyGraph = new Map<string, DependencyNode>();

    // Initialize dependency graph nodes
    for (const filePath of files) {
      dependencyGraph.set(filePath, {
        filePath,
        dependencies: [],
        dependents: [],
        isExternal: false,
        symbols: {
          exported: [],
          imported: [],
        },
      });
    }

    // Analyze dependencies (simplified implementation)
    for (const filePath of files) {
      const node = dependencyGraph.get(filePath)!;

      // This is a simplified implementation
      // In reality, we would parse the AST analysis results
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const importMatches = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g) || [];

        for (const match of importMatches) {
          const moduleMatch = match.match(/from\s+['"]([^'"]+)['"]/);
          if (moduleMatch) {
            const modulePath = moduleMatch[1];
            const isExternal = !modulePath.startsWith(".") && !modulePath.startsWith("/");

            dependencies.push({
              from: filePath,
              to: modulePath,
              type: "import",
              specifiers: [],
              isExternal,
              line: 1, // Simplified
            });

            if (!isExternal) {
              const resolvedPath = this.resolveModulePath(modulePath, filePath);
              if (resolvedPath) {
                node.dependencies.push(resolvedPath);
                const targetNode = dependencyGraph.get(resolvedPath);
                if (targetNode) {
                  targetNode.dependents.push(filePath);
                }
              }
            }
          }
        }
      } catch (error) {
        // Ignore file read errors
      }
    }

    // Find circular dependencies
    const circularDependencies = options.findCircularDependencies
      ? this.findCircularDependencies(dependencyGraph)
      : [];

    // Find unused exports (simplified)
    const unusedExports = options.findUnusedExports
      ? this.findUnusedExports(dependencyGraph, files)
      : [];

    // Find missing imports (simplified)
    const missingImports = options.findMissingImports ? this.findMissingImports(files) : [];

    return {
      projectRoot,
      analyzedFiles: files,
      symbols,
      dependencies,
      dependencyGraph,
      circularDependencies,
      unusedExports,
      missingImports,
    };
  }

  /**
   * Resolve module path relative to importing file
   */
  private resolveModulePath(modulePath: string, fromFile: string): string | null {
    if (modulePath.startsWith(".")) {
      const dir = dirname(fromFile);
      let resolved = resolve(dir, modulePath);

      // Try different extensions
      const extensions = [".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.js"];
      for (const ext of extensions) {
        const candidate = resolved + ext;
        try {
          require.resolve(candidate);
          return candidate;
        } catch {
          // Continue trying
        }
      }
    }
    return null;
  }

  /**
   * Find circular dependencies using DFS
   */
  private findCircularDependencies(dependencyGraph: Map<string, DependencyNode>): string[][] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (filePath: string, path: string[]): void => {
      if (recursionStack.has(filePath)) {
        // Found a cycle
        const cycleStart = path.indexOf(filePath);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart).concat(filePath));
        }
        return;
      }

      if (visited.has(filePath)) return;

      visited.add(filePath);
      recursionStack.add(filePath);

      const node = dependencyGraph.get(filePath);
      if (node) {
        for (const dependency of node.dependencies) {
          dfs(dependency, [...path, filePath]);
        }
      }

      recursionStack.delete(filePath);
    };

    for (const filePath of dependencyGraph.keys()) {
      if (!visited.has(filePath)) {
        dfs(filePath, []);
      }
    }

    return cycles;
  }

  /**
   * Find unused exports (simplified implementation)
   */
  private findUnusedExports(
    dependencyGraph: Map<string, DependencyNode>,
    files: string[]
  ): Array<{ filePath: string; symbol: string; line: number }> {
    const unusedExports: Array<{ filePath: string; symbol: string; line: number }> = [];

    // This is a simplified implementation
    // In reality, we would track actual symbol usage
    for (const filePath of files) {
      const node = dependencyGraph.get(filePath);
      if (node && node.dependents.length === 0 && node.symbols.exported.length > 0) {
        for (const symbol of node.symbols.exported) {
          unusedExports.push({
            filePath,
            symbol,
            line: 1, // Simplified
          });
        }
      }
    }

    return unusedExports;
  }

  /**
   * Find missing imports (simplified implementation)
   */
  private findMissingImports(
    files: string[]
  ): Array<{ filePath: string; symbol: string; line: number }> {
    const missingImports: Array<{ filePath: string; symbol: string; line: number }> = [];

    // This would require more sophisticated analysis
    // For now, return empty array
    return missingImports;
  }

  /**
   * Format cross-reference analysis results
   */
  private formatCrossReferenceResults(result: CrossReferenceResult): string {
    const lines: string[] = [];

    lines.push(`# Cross-Reference Analysis Results`);
    lines.push(`**Project Root:** ${result.projectRoot}`);
    lines.push(`**Analyzed Files:** ${result.analyzedFiles.length}`);
    lines.push("");

    // Dependency statistics
    lines.push("## Dependency Statistics");
    const externalDeps = result.dependencies.filter((d) => d.isExternal).length;
    const internalDeps = result.dependencies.filter((d) => !d.isExternal).length;
    lines.push(`- Total Dependencies: ${result.dependencies.length}`);
    lines.push(`- External Dependencies: ${externalDeps}`);
    lines.push(`- Internal Dependencies: ${internalDeps}`);
    lines.push("");

    // Circular dependencies
    if (result.circularDependencies.length > 0) {
      lines.push("## ⚠️ Circular Dependencies");
      for (let i = 0; i < result.circularDependencies.length; i++) {
        const cycle = result.circularDependencies[i];
        lines.push(`### Cycle ${i + 1}`);
        for (let j = 0; j < cycle.length; j++) {
          const file = relative(result.projectRoot, cycle[j]);
          const arrow = j < cycle.length - 1 ? " → " : " → (cycle)";
          lines.push(`${j + 1}. ${file}${arrow}`);
        }
        lines.push("");
      }
    } else {
      lines.push("## ✅ No Circular Dependencies Found");
      lines.push("");
    }

    // Unused exports
    if (result.unusedExports.length > 0) {
      lines.push("## 🧹 Unused Exports");
      for (const unused of result.unusedExports.slice(0, 20)) {
        // Limit to first 20
        const file = relative(result.projectRoot, unused.filePath);
        lines.push(`- **${unused.symbol}** in ${file} (Line ${unused.line})`);
      }
      if (result.unusedExports.length > 20) {
        lines.push(`... and ${result.unusedExports.length - 20} more`);
      }
      lines.push("");
    }

    // Missing imports
    if (result.missingImports.length > 0) {
      lines.push("## ❌ Missing Imports");
      for (const missing of result.missingImports.slice(0, 20)) {
        // Limit to first 20
        const file = relative(result.projectRoot, missing.filePath);
        lines.push(`- **${missing.symbol}** in ${file} (Line ${missing.line})`);
      }
      if (result.missingImports.length > 20) {
        lines.push(`... and ${result.missingImports.length - 20} more`);
      }
      lines.push("");
    }

    // Dependency graph summary
    lines.push("## Dependency Graph Summary");
    const nodeStats = Array.from(result.dependencyGraph.values()).map((node) => ({
      file: relative(result.projectRoot, node.filePath),
      deps: node.dependencies.length,
      dependents: node.dependents.length,
    }));

    // Most dependent files
    const mostDependent = nodeStats.sort((a, b) => b.dependents - a.dependents).slice(0, 10);

    lines.push("### Most Depended Upon Files");
    for (const node of mostDependent) {
      if (node.dependents > 0) {
        lines.push(`- **${node.file}** (${node.dependents} dependents)`);
      }
    }
    lines.push("");

    // Files with most dependencies
    const mostDependencies = nodeStats.sort((a, b) => b.deps - a.deps).slice(0, 10);

    lines.push("### Files with Most Dependencies");
    for (const node of mostDependencies) {
      if (node.deps > 0) {
        lines.push(`- **${node.file}** (${node.deps} dependencies)`);
      }
    }

    return lines.join("\n");
  }
}
