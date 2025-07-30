/**
 * Analysis Tools Index
 * Exports all advanced code analysis and search tools
 */

export { ASTAnalyzerTool } from "./ast-analyzer.js";
export { CrossReferenceAnalyzerTool } from "./cross-reference-analyzer.js";
export { SemanticSearchTool } from "./semantic-search.js";
export { CodeIndexerTool } from "./code-indexer.js";

// Export types
export type {
  SymbolInfo,
  ParameterInfo,
  ImportExportInfo,
  ComplexityMetrics,
  ASTAnalysisResult,
  ASTAnalyzerParams,
} from "./ast-analyzer.js";

export type {
  SymbolReference,
  ModuleDependency,
  DependencyNode,
  CrossReferenceResult,
  CrossReferenceParams,
} from "./cross-reference-analyzer.js";

export type {
  SemanticSearchResult,
  SearchContext,
  SemanticSearchParams,
} from "./semantic-search.js";

export type {
  IndexedSymbol,
  SymbolUsage,
  IndexedFile,
  ProjectIndex,
  IndexUpdateResult,
  CodeIndexerParams,
} from "./code-indexer.js";

/**
 * Register all analysis tools with the global registry
 */
import { globalToolRegistry } from "../base.js";

// Auto-register analysis tools
const analysisTools = [
  new ASTAnalyzerTool(),
  new CrossReferenceAnalyzerTool(),
  new SemanticSearchTool(),
  new CodeIndexerTool(),
];

// Register tools if registry is available
if (globalToolRegistry) {
  analysisTools.forEach((tool) => {
    globalToolRegistry.register(tool);
  });
}

export { analysisTools };

/**
 * Analysis tools configuration
 */
export const ANALYSIS_TOOLS_CONFIG = {
  // Default limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_PROJECT_FILES: 10000,
  MAX_SEARCH_RESULTS: 100,
  DEFAULT_CONTEXT_LINES: 3,

  // Cache settings
  INDEX_CACHE_TTL: 3600000, // 1 hour
  ANALYSIS_CACHE_TTL: 300000, // 5 minutes

  // Performance settings
  MAX_CONCURRENT_ANALYSIS: 5,
  BATCH_SIZE: 50,
};
