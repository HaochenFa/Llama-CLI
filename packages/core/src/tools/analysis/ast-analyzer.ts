/**
 * AST Code Analyzer Tool for LlamaCLI
 * Provides TypeScript/JavaScript AST parsing and code analysis capabilities
 */

import { BaseTool, ToolParams, ToolContext } from "../base.js";
import { MCPToolCallResult, MCPTextContent } from "../../types/mcp.js";
import { promises as fs } from "fs";
import { resolve, extname, basename } from "path";
import * as ts from "typescript";

/**
 * Symbol information extracted from AST
 */
export interface SymbolInfo {
  name: string;
  kind: ts.SyntaxKind;
  kindName: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  modifiers: string[];
  type?: string;
  documentation?: string;
  parameters?: ParameterInfo[];
  returnType?: string;
  accessibility?: "public" | "private" | "protected";
}

/**
 * Parameter information for functions/methods
 */
export interface ParameterInfo {
  name: string;
  type?: string;
  optional: boolean;
  defaultValue?: string;
}

/**
 * Import/Export information
 */
export interface ImportExportInfo {
  type: "import" | "export";
  source?: string;
  specifiers: Array<{
    name: string;
    alias?: string;
    isDefault?: boolean;
    isNamespace?: boolean;
  }>;
  line: number;
  isTypeOnly: boolean;
}

/**
 * Code complexity metrics
 */
export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  linesOfCode: number;
  maintainabilityIndex: number;
  halsteadMetrics: {
    vocabulary: number;
    length: number;
    difficulty: number;
    effort: number;
  };
}

/**
 * AST analysis result
 */
export interface ASTAnalysisResult {
  filePath: string;
  language: "typescript" | "javascript";
  symbols: SymbolInfo[];
  imports: ImportExportInfo[];
  exports: ImportExportInfo[];
  complexity: ComplexityMetrics;
  diagnostics: ts.Diagnostic[];
  dependencies: string[];
  codeStructure: {
    classes: number;
    interfaces: number;
    functions: number;
    variables: number;
    enums: number;
    types: number;
  };
}

/**
 * AST analyzer parameters
 */
export interface ASTAnalyzerParams extends ToolParams {
  filePath: string;
  includeComplexity?: boolean;
  includeDocumentation?: boolean;
  includeDiagnostics?: boolean;
  includeTypes?: boolean;
}

/**
 * AST Code Analyzer Tool
 */
export class ASTAnalyzerTool extends BaseTool {
  name = "ast_analyzer";
  description =
    "Analyze TypeScript/JavaScript code using AST parsing to extract symbols, complexity metrics, and code structure";

  schema = {
    type: "object" as const,
    properties: {
      filePath: {
        type: "string",
        description: "Path to the TypeScript/JavaScript file to analyze",
      },
      includeComplexity: {
        type: "boolean",
        description: "Include complexity metrics in the analysis",
        default: true,
      },
      includeDocumentation: {
        type: "boolean",
        description: "Extract JSDoc documentation from symbols",
        default: true,
      },
      includeDiagnostics: {
        type: "boolean",
        description: "Include TypeScript compiler diagnostics",
        default: false,
      },
      includeTypes: {
        type: "boolean",
        description: "Include detailed type information",
        default: true,
      },
    },
    required: ["filePath"],
    additionalProperties: false,
  };

  /**
   * Validate parameters
   */
  validate(params: ASTAnalyzerParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!params.filePath || typeof params.filePath !== "string") {
      errors.push("filePath is required and must be a string");
    }

    if (params.filePath) {
      const ext = extname(params.filePath).toLowerCase();
      if (![".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
        errors.push("filePath must be a TypeScript or JavaScript file (.ts, .tsx, .js, .jsx)");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Execute the AST analysis
   */
  async execute(params: ASTAnalyzerParams, context?: ToolContext): Promise<MCPToolCallResult> {
    try {
      // Validate parameters
      const validation = this.validate(params);
      if (!validation.valid) {
        return this.createErrorResult(`Invalid parameters: ${validation.errors.join(", ")}`);
      }

      const {
        filePath,
        includeComplexity = true,
        includeDocumentation = true,
        includeDiagnostics = false,
        includeTypes = true,
      } = params;

      // Resolve and validate file path
      const resolvedPath = resolve(filePath);

      // Check if file exists
      try {
        await fs.access(resolvedPath);
      } catch {
        return this.createErrorResult(`File not found: ${filePath}`);
      }

      // Read file content
      const sourceCode = await fs.readFile(resolvedPath, "utf-8");

      // Determine language
      const ext = extname(resolvedPath).toLowerCase();
      const language: "typescript" | "javascript" = ext.includes("ts")
        ? "typescript"
        : "javascript";

      // Create TypeScript program
      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Node10,
        allowJs: true,
        checkJs: false,
        declaration: false,
        strict: false,
        skipLibCheck: true,
      };

      // Create source file
      const sourceFile = ts.createSourceFile(
        resolvedPath,
        sourceCode,
        ts.ScriptTarget.ES2020,
        true
      );

      // Analyze the AST
      const analysis = await this.analyzeSourceFile(sourceFile, resolvedPath, language, {
        includeComplexity,
        includeDocumentation,
        includeDiagnostics,
        includeTypes,
      });

      // Format results
      const content: MCPTextContent[] = [
        {
          type: "text",
          text: this.formatAnalysisResults(analysis),
        },
      ];

      return {
        isError: false,
        content,
      };
    } catch (error) {
      return this.createErrorResult(
        `AST analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Analyze TypeScript source file
   */
  private async analyzeSourceFile(
    sourceFile: ts.SourceFile,
    filePath: string,
    language: "typescript" | "javascript",
    options: {
      includeComplexity: boolean;
      includeDocumentation: boolean;
      includeDiagnostics: boolean;
      includeTypes: boolean;
    }
  ): Promise<ASTAnalysisResult> {
    const symbols: SymbolInfo[] = [];
    const imports: ImportExportInfo[] = [];
    const exports: ImportExportInfo[] = [];
    const dependencies: string[] = [];

    let codeStructure = {
      classes: 0,
      interfaces: 0,
      functions: 0,
      variables: 0,
      enums: 0,
      types: 0,
    };

    // Traverse AST and extract information
    const visit = (node: ts.Node) => {
      // Extract symbols
      if (this.isSymbolNode(node)) {
        const symbol = this.extractSymbolInfo(node, sourceFile, options);
        if (symbol) {
          symbols.push(symbol);
          this.updateCodeStructure(symbol.kind, codeStructure);
        }
      }

      // Extract imports/exports
      if (ts.isImportDeclaration(node)) {
        const importInfo = this.extractImportInfo(node, sourceFile);
        if (importInfo) {
          imports.push(importInfo);
          if (importInfo.source) {
            dependencies.push(importInfo.source);
          }
        }
      }

      if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
        const exportInfo = this.extractExportInfo(node, sourceFile);
        if (exportInfo) {
          exports.push(exportInfo);
        }
      }

      // Continue traversal
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // Calculate complexity metrics
    const complexity = options.includeComplexity
      ? this.calculateComplexity(sourceFile)
      : this.getDefaultComplexity();

    // Get diagnostics if requested
    const diagnostics = options.includeDiagnostics ? this.getDiagnostics(sourceFile) : [];

    return {
      filePath,
      language,
      symbols,
      imports,
      exports,
      complexity,
      diagnostics,
      dependencies: [...new Set(dependencies)],
      codeStructure,
    };
  }

  /**
   * Check if node represents a symbol we want to extract
   */
  private isSymbolNode(node: ts.Node): boolean {
    return (
      ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isVariableDeclaration(node) ||
      ts.isEnumDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isPropertyDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)
    );
  }

  /**
   * Extract symbol information from AST node
   */
  private extractSymbolInfo(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    options: { includeDocumentation: boolean; includeTypes: boolean }
  ): SymbolInfo | null {
    const name = this.getNodeName(node);
    if (!name) return null;

    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    const symbol: SymbolInfo = {
      name,
      kind: node.kind,
      kindName: ts.SyntaxKind[node.kind],
      line: start.line + 1,
      column: start.character + 1,
      endLine: end.line + 1,
      endColumn: end.character + 1,
      modifiers: this.getModifiers(node),
    };

    // Add type information if requested
    if (options.includeTypes) {
      symbol.type = this.getNodeType(node);
      if (ts.isFunctionLike(node as ts.Node)) {
        symbol.parameters = this.getParameters(node as ts.FunctionLikeDeclaration);
        symbol.returnType = this.getReturnType(node as ts.FunctionLikeDeclaration);
      }
    }

    // Add documentation if requested
    if (options.includeDocumentation) {
      symbol.documentation = this.getDocumentation(node, sourceFile);
    }

    // Add accessibility for class members
    if (ts.isClassElement(node)) {
      symbol.accessibility = this.getAccessibility(node);
    }

    return symbol;
  }

  /**
   * Get node name
   */
  private getNodeName(node: ts.Node): string | null {
    if ("name" in node && node.name && ts.isIdentifier(node.name as ts.Node)) {
      return (node.name as ts.Identifier).text;
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      return node.name.text;
    }
    return null;
  }

  /**
   * Get node modifiers
   */
  private getModifiers(node: ts.Node): string[] {
    const modifiers: string[] = [];
    if ("modifiers" in node && node.modifiers) {
      for (const modifier of node.modifiers as ts.NodeArray<ts.Modifier>) {
        modifiers.push(ts.SyntaxKind[modifier.kind].toLowerCase());
      }
    }
    return modifiers;
  }

  /**
   * Get node type information
   */
  private getNodeType(node: ts.Node): string | undefined {
    if ("type" in node && node.type) {
      return (node.type as ts.TypeNode).getText();
    }
    return undefined;
  }

  /**
   * Get function parameters
   */
  private getParameters(node: ts.FunctionLikeDeclaration): ParameterInfo[] {
    return node.parameters.map((param) => ({
      name: param.name.getText(),
      type: param.type?.getText(),
      optional: !!param.questionToken,
      defaultValue: param.initializer?.getText(),
    }));
  }

  /**
   * Get function return type
   */
  private getReturnType(node: ts.FunctionLikeDeclaration): string | undefined {
    return node.type?.getText();
  }

  /**
   * Get JSDoc documentation
   */
  private getDocumentation(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
    const jsDoc = (node as any).jsDoc;
    if (jsDoc && jsDoc.length > 0) {
      return jsDoc[0].comment || jsDoc[0].getText(sourceFile);
    }
    return undefined;
  }

  /**
   * Get accessibility modifier
   */
  private getAccessibility(node: ts.ClassElement): "public" | "private" | "protected" | undefined {
    const modifiers = (node as any).modifiers;
    if (modifiers) {
      for (const modifier of modifiers) {
        switch (modifier.kind) {
          case ts.SyntaxKind.PublicKeyword:
            return "public";
          case ts.SyntaxKind.PrivateKeyword:
            return "private";
          case ts.SyntaxKind.ProtectedKeyword:
            return "protected";
        }
      }
    }
    return "public"; // Default accessibility
  }

  /**
   * Extract import information
   */
  private extractImportInfo(
    node: ts.ImportDeclaration,
    sourceFile: ts.SourceFile
  ): ImportExportInfo | null {
    if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) {
      return null;
    }

    const source = node.moduleSpecifier.text;
    const specifiers: ImportExportInfo["specifiers"] = [];
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

    if (node.importClause) {
      // Default import
      if (node.importClause.name) {
        specifiers.push({
          name: node.importClause.name.text,
          isDefault: true,
        });
      }

      // Named imports
      if (node.importClause.namedBindings) {
        if (ts.isNamespaceImport(node.importClause.namedBindings)) {
          specifiers.push({
            name: node.importClause.namedBindings.name.text,
            isNamespace: true,
          });
        } else if (ts.isNamedImports(node.importClause.namedBindings)) {
          for (const element of node.importClause.namedBindings.elements) {
            specifiers.push({
              name: element.name.text,
              alias: element.propertyName?.text,
            });
          }
        }
      }
    }

    return {
      type: "import",
      source,
      specifiers,
      line,
      isTypeOnly: !!node.importClause?.isTypeOnly,
    };
  }

  /**
   * Extract export information
   */
  private extractExportInfo(
    node: ts.ExportDeclaration | ts.ExportAssignment,
    sourceFile: ts.SourceFile
  ): ImportExportInfo | null {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    const specifiers: ImportExportInfo["specifiers"] = [];

    if (ts.isExportDeclaration(node)) {
      const source =
        node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
          ? node.moduleSpecifier.text
          : undefined;

      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          specifiers.push({
            name: element.name.text,
            alias: element.propertyName?.text,
          });
        }
      }

      return {
        type: "export",
        source,
        specifiers,
        line,
        isTypeOnly: !!node.isTypeOnly,
      };
    }

    if (ts.isExportAssignment(node)) {
      specifiers.push({
        name: node.expression.getText(sourceFile),
        isDefault: !node.isExportEquals,
      });

      return {
        type: "export",
        specifiers,
        line,
        isTypeOnly: false,
      };
    }

    return null;
  }

  /**
   * Update code structure counters
   */
  private updateCodeStructure(
    kind: ts.SyntaxKind,
    structure: ASTAnalysisResult["codeStructure"]
  ): void {
    switch (kind) {
      case ts.SyntaxKind.ClassDeclaration:
        structure.classes++;
        break;
      case ts.SyntaxKind.InterfaceDeclaration:
        structure.interfaces++;
        break;
      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.MethodDeclaration:
        structure.functions++;
        break;
      case ts.SyntaxKind.VariableDeclaration:
        structure.variables++;
        break;
      case ts.SyntaxKind.EnumDeclaration:
        structure.enums++;
        break;
      case ts.SyntaxKind.TypeAliasDeclaration:
        structure.types++;
        break;
    }
  }

  /**
   * Calculate complexity metrics
   */
  private calculateComplexity(sourceFile: ts.SourceFile): ComplexityMetrics {
    let cyclomaticComplexity = 1; // Base complexity
    let cognitiveComplexity = 0;
    const linesOfCode = sourceFile.getLineStarts().length;

    // Simple complexity calculation
    const visit = (node: ts.Node) => {
      // Cyclomatic complexity
      if (
        ts.isIfStatement(node) ||
        ts.isWhileStatement(node) ||
        ts.isForStatement(node) ||
        ts.isForInStatement(node) ||
        ts.isForOfStatement(node) ||
        ts.isSwitchStatement(node) ||
        ts.isConditionalExpression(node) ||
        ts.isCatchClause(node)
      ) {
        cyclomaticComplexity++;
      }

      // Cognitive complexity (simplified)
      if (ts.isIfStatement(node) || ts.isWhileStatement(node) || ts.isForStatement(node)) {
        cognitiveComplexity++;
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // Simplified Halstead metrics
    const halsteadMetrics = {
      vocabulary: 50, // Simplified
      length: linesOfCode,
      difficulty: 10, // Simplified
      effort: linesOfCode * 10, // Simplified
    };

    // Simplified maintainability index
    const maintainabilityIndex = Math.max(
      0,
      171 -
        5.2 * Math.log(halsteadMetrics.effort) -
        0.23 * cyclomaticComplexity -
        16.2 * Math.log(linesOfCode)
    );

    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      linesOfCode,
      maintainabilityIndex,
      halsteadMetrics,
    };
  }

  /**
   * Get default complexity metrics
   */
  private getDefaultComplexity(): ComplexityMetrics {
    return {
      cyclomaticComplexity: 0,
      cognitiveComplexity: 0,
      linesOfCode: 0,
      maintainabilityIndex: 0,
      halsteadMetrics: {
        vocabulary: 0,
        length: 0,
        difficulty: 0,
        effort: 0,
      },
    };
  }

  /**
   * Get TypeScript diagnostics
   */
  private getDiagnostics(sourceFile: ts.SourceFile): ts.Diagnostic[] {
    // For now, return empty array
    // In a full implementation, we would create a program and get diagnostics
    return [];
  }

  /**
   * Format analysis results for display
   */
  private formatAnalysisResults(analysis: ASTAnalysisResult): string {
    const lines: string[] = [];

    lines.push(`# AST Analysis Results for ${basename(analysis.filePath)}`);
    lines.push(`**Language:** ${analysis.language}`);
    lines.push(`**Dependencies:** ${analysis.dependencies.length}`);
    lines.push("");

    // Code structure summary
    lines.push("## Code Structure");
    lines.push(`- Classes: ${analysis.codeStructure.classes}`);
    lines.push(`- Interfaces: ${analysis.codeStructure.interfaces}`);
    lines.push(`- Functions: ${analysis.codeStructure.functions}`);
    lines.push(`- Variables: ${analysis.codeStructure.variables}`);
    lines.push(`- Enums: ${analysis.codeStructure.enums}`);
    lines.push(`- Types: ${analysis.codeStructure.types}`);
    lines.push("");

    // Complexity metrics
    lines.push("## Complexity Metrics");
    lines.push(`- Cyclomatic Complexity: ${analysis.complexity.cyclomaticComplexity}`);
    lines.push(`- Cognitive Complexity: ${analysis.complexity.cognitiveComplexity}`);
    lines.push(`- Lines of Code: ${analysis.complexity.linesOfCode}`);
    lines.push(`- Maintainability Index: ${analysis.complexity.maintainabilityIndex.toFixed(2)}`);
    lines.push("");

    // Imports
    if (analysis.imports.length > 0) {
      lines.push("## Imports");
      for (const imp of analysis.imports) {
        const specifierNames = imp.specifiers.map((s) => s.alias || s.name).join(", ");
        lines.push(`- Line ${imp.line}: ${specifierNames} from "${imp.source}"`);
      }
      lines.push("");
    }

    // Exports
    if (analysis.exports.length > 0) {
      lines.push("## Exports");
      for (const exp of analysis.exports) {
        const specifierNames = exp.specifiers.map((s) => s.alias || s.name).join(", ");
        const source = exp.source ? ` from "${exp.source}"` : "";
        lines.push(`- Line ${exp.line}: ${specifierNames}${source}`);
      }
      lines.push("");
    }

    // Symbols
    if (analysis.symbols.length > 0) {
      lines.push("## Symbols");
      const symbolsByKind = analysis.symbols.reduce(
        (acc, symbol) => {
          if (!acc[symbol.kindName]) acc[symbol.kindName] = [];
          acc[symbol.kindName].push(symbol);
          return acc;
        },
        {} as Record<string, SymbolInfo[]>
      );

      for (const [kind, symbols] of Object.entries(symbolsByKind)) {
        lines.push(`### ${kind}`);
        for (const symbol of symbols) {
          let line = `- **${symbol.name}** (Line ${symbol.line})`;
          if (symbol.type) line += `: ${symbol.type}`;
          if (symbol.modifiers.length > 0) line += ` [${symbol.modifiers.join(", ")}]`;
          lines.push(line);

          if (symbol.documentation) {
            lines.push(`  *${symbol.documentation}*`);
          }
        }
        lines.push("");
      }
    }

    // Dependencies
    if (analysis.dependencies.length > 0) {
      lines.push("## Dependencies");
      for (const dep of analysis.dependencies) {
        lines.push(`- ${dep}`);
      }
    }

    return lines.join("\n");
  }
}
