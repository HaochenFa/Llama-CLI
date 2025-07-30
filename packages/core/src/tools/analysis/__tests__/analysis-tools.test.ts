/**
 * Tests for Analysis Tools
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ASTAnalyzerTool } from '../ast-analyzer.js';
import { SemanticSearchTool } from '../semantic-search.js';
import { CodeIndexerTool } from '../code-indexer.js';
import { CrossReferenceAnalyzerTool } from '../cross-reference-analyzer.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

describe('Analysis Tools', () => {
  let tempDir: string;
  let testFile: string;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = path.join(process.cwd(), 'temp-analysis-test');
    await fs.mkdir(tempDir, { recursive: true });

    // Create a test TypeScript file
    testFile = path.join(tempDir, 'test.ts');
    const testCode = `
/**
 * Test class for analysis
 */
export class TestClass {
  private value: number;

  constructor(value: number) {
    this.value = value;
  }

  /**
   * Get the current value
   */
  public getValue(): number {
    return this.value;
  }

  /**
   * Set a new value
   */
  public setValue(newValue: number): void {
    this.value = newValue;
  }
}

/**
 * Test function
 */
export function testFunction(input: string): string {
  return input.toUpperCase();
}

export const testConstant = 42;
`;

    await fs.writeFile(testFile, testCode);
  });

  afterEach(async () => {
    // Clean up temporary files
    if (existsSync(tempDir)) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('ASTAnalyzerTool', () => {
    let astAnalyzer: ASTAnalyzerTool;

    beforeEach(() => {
      astAnalyzer = new ASTAnalyzerTool();
    });

    it('should have correct tool metadata', () => {
      expect(astAnalyzer.name).toBe('ast_analyzer');
      expect(astAnalyzer.description).toContain('AST parsing');
      expect(astAnalyzer.schema).toBeDefined();
      expect(astAnalyzer.schema.type).toBe('object');
    });

    it('should validate parameters correctly', () => {
      // Valid parameters
      const validParams = {
        filePath: testFile,
        includeComplexity: true,
      };
      const validResult = astAnalyzer.validate(validParams);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid parameters
      const invalidParams = {
        filePath: '',
      };
      const invalidResult = astAnalyzer.validate(invalidParams);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    it('should analyze TypeScript file successfully', async () => {
      const result = await astAnalyzer.execute({
        filePath: testFile,
        includeComplexity: true,
        includeDocumentation: true,
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const content = (result.content[0] as any).text;
      expect(content).toContain('AST Analysis Results');
      expect(content).toContain('TestClass');
      expect(content).toContain('testFunction');
      expect(content).toContain('Code Structure');
      expect(content).toContain('Complexity Metrics');
    });

    it('should handle non-existent file gracefully', async () => {
      const result = await astAnalyzer.execute({
        filePath: '/non/existent/file.ts',
      });

      expect(result.isError).toBe(true);
      expect((result.content[0] as any).text).toContain('File not found');
    });

    it('should handle invalid file extension', async () => {
      const result = await astAnalyzer.execute({
        filePath: 'test.txt',
      });

      expect(result.isError).toBe(true);
      expect((result.content[0] as any).text).toContain('Invalid parameters');
    });
  });

  describe('SemanticSearchTool', () => {
    let semanticSearch: SemanticSearchTool;

    beforeEach(() => {
      semanticSearch = new SemanticSearchTool();
    });

    it('should have correct tool metadata', () => {
      expect(semanticSearch.name).toBe('semantic_search');
      expect(semanticSearch.description).toContain('semantic search');
      expect(semanticSearch.schema).toBeDefined();
    });

    it('should validate parameters correctly', () => {
      // Valid parameters
      const validParams = {
        query: 'test function',
        filePath: testFile,
      };
      const validResult = semanticSearch.validate(validParams);
      expect(validResult.valid).toBe(true);

      // Invalid parameters - empty query
      const invalidParams = {
        query: '',
        filePath: testFile,
      };
      const invalidResult = semanticSearch.validate(invalidParams);
      expect(invalidResult.valid).toBe(false);
    });

    it('should search in file successfully', async () => {
      const result = await semanticSearch.execute({
        query: 'TestClass',
        filePath: testFile,
        intent: 'find_class',
        maxResults: 10,
      });

      expect(result.isError).toBe(false);
      const content = (result.content[0] as any).text;
      expect(content).toContain('Semantic Search Results');
      expect(content).toContain('TestClass');
    });

    it('should handle project-wide search', async () => {
      const result = await semanticSearch.execute({
        query: 'function',
        projectPath: tempDir,
        intent: 'find_function',
        maxResults: 5,
      });

      expect(result.isError).toBe(false);
      const content = (result.content[0] as any).text;
      expect(content).toContain('Semantic Search Results');
    });

    it('should require either filePath or projectPath', async () => {
      const result = await semanticSearch.execute({
        query: 'test',
      });

      expect(result.isError).toBe(true);
      expect((result.content[0] as any).text).toContain('Either projectPath or filePath must be provided');
    });
  });

  describe('CodeIndexerTool', () => {
    let codeIndexer: CodeIndexerTool;

    beforeEach(() => {
      codeIndexer = new CodeIndexerTool();
    });

    it('should have correct tool metadata', () => {
      expect(codeIndexer.name).toBe('code_indexer');
      expect(codeIndexer.description).toContain('code indexes');
      expect(codeIndexer.schema).toBeDefined();
    });

    it('should validate parameters correctly', () => {
      // Valid parameters
      const validParams = {
        projectPath: tempDir,
        action: 'create' as const,
      };
      const validResult = codeIndexer.validate(validParams);
      expect(validResult.valid).toBe(true);

      // Invalid parameters - missing projectPath
      const invalidParams = {
        action: 'create' as const,
      };
      const invalidResult = codeIndexer.validate(invalidParams as any);
      expect(invalidResult.valid).toBe(false);
    });

    it('should create index successfully', async () => {
      const result = await codeIndexer.execute({
        projectPath: tempDir,
        action: 'create',
        includeNodeModules: false,
      });

      expect(result.isError).toBe(false);
      const content = (result.content[0] as any).text;
      expect(content).toContain('Code Index Created');
      expect(content).toContain('Files Indexed');
    });

    it('should get index stats', async () => {
      // First create an index
      await codeIndexer.execute({
        projectPath: tempDir,
        action: 'create',
      });

      // Then get stats
      const result = await codeIndexer.execute({
        projectPath: tempDir,
        action: 'stats',
      });

      expect(result.isError).toBe(false);
      const content = (result.content[0] as any).text;
      expect(content).toContain('Index Statistics');
      expect(content).toContain('Total Files');
    });

    it('should handle query action', async () => {
      // First create an index
      await codeIndexer.execute({
        projectPath: tempDir,
        action: 'create',
      });

      // Then query for symbols
      const result = await codeIndexer.execute({
        projectPath: tempDir,
        action: 'query',
        query: 'TestClass',
      });

      expect(result.isError).toBe(false);
      const content = (result.content[0] as any).text;
      expect(content).toContain('Symbol Search Results');
    });

    it('should require query parameter for query action', async () => {
      const result = await codeIndexer.execute({
        projectPath: tempDir,
        action: 'query',
      });

      expect(result.isError).toBe(true);
      expect((result.content[0] as any).text).toContain('query is required when action is \'query\'');
    });
  });

  describe('CrossReferenceAnalyzerTool', () => {
    let crossRefAnalyzer: CrossReferenceAnalyzerTool;

    beforeEach(() => {
      crossRefAnalyzer = new CrossReferenceAnalyzerTool();
    });

    it('should have correct tool metadata', () => {
      expect(crossRefAnalyzer.name).toBe('cross_reference_analyzer');
      expect(crossRefAnalyzer.description).toContain('cross-file references');
      expect(crossRefAnalyzer.schema).toBeDefined();
    });

    it('should validate parameters correctly', () => {
      // Valid parameters
      const validParams = {
        projectPath: tempDir,
      };
      const validResult = crossRefAnalyzer.validate(validParams);
      expect(validResult.valid).toBe(true);

      // Invalid parameters
      const invalidParams = {
        projectPath: '',
      };
      const invalidResult = crossRefAnalyzer.validate(invalidParams);
      expect(invalidResult.valid).toBe(false);
    });

    it('should analyze project successfully', async () => {
      const result = await crossRefAnalyzer.execute({
        projectPath: tempDir,
        findCircularDependencies: true,
        findUnusedExports: true,
      });

      expect(result.isError).toBe(false);
      const content = (result.content[0] as any).text;
      expect(content).toContain('Cross-Reference Analysis Results');
      expect(content).toContain('Dependency Statistics');
    });

    it('should handle non-existent project path', async () => {
      const result = await crossRefAnalyzer.execute({
        projectPath: '/non/existent/path',
      });

      expect(result.isError).toBe(true);
      expect((result.content[0] as any).text).toContain('Project directory not found');
    });
  });

  describe('Tool Integration', () => {
    it('should have consistent error handling across all tools', () => {
      const tools = [
        new ASTAnalyzerTool(),
        new SemanticSearchTool(),
        new CodeIndexerTool(),
        new CrossReferenceAnalyzerTool(),
      ];

      tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.schema).toBeDefined();
        expect(typeof tool.execute).toBe('function');
        expect(typeof tool.validate).toBe('function');
      });
    });

    it('should handle large files gracefully', async () => {
      // Create a large test file
      const largeFile = path.join(tempDir, 'large.ts');
      const largeContent = 'export const data = [\n' + 
        Array.from({ length: 1000 }, (_, i) => `  "item${i}",`).join('\n') + 
        '\n];';
      
      await fs.writeFile(largeFile, largeContent);

      const astAnalyzer = new ASTAnalyzerTool();
      const result = await astAnalyzer.execute({
        filePath: largeFile,
        includeComplexity: true,
      });

      // Should handle large files without crashing
      expect(result.isError).toBe(false);
    });

    it('should work together in a workflow', async () => {
      // 1. Create index
      const indexer = new CodeIndexerTool();
      const indexResult = await indexer.execute({
        projectPath: tempDir,
        action: 'create',
      });
      expect(indexResult.isError).toBe(false);

      // 2. Perform semantic search
      const searcher = new SemanticSearchTool();
      const searchResult = await searcher.execute({
        query: 'TestClass',
        projectPath: tempDir,
        intent: 'find_class',
      });
      expect(searchResult.isError).toBe(false);

      // 3. Analyze cross-references
      const crossRef = new CrossReferenceAnalyzerTool();
      const crossRefResult = await crossRef.execute({
        projectPath: tempDir,
      });
      expect(crossRefResult.isError).toBe(false);

      // All tools should work together without conflicts
      expect(indexResult.isError).toBe(false);
      expect(searchResult.isError).toBe(false);
      expect(crossRefResult.isError).toBe(false);
    });
  });
});
