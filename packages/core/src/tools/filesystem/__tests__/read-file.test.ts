/**
 * Tests for ReadFileTool
 */

import { ReadFileTool } from '../read-file.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ReadFileTool', () => {
  let tool: ReadFileTool;
  let tempDir: string;
  let testFile: string;

  beforeEach(async () => {
    tool = new ReadFileTool();
    tempDir = await fs.mkdtemp(join(tmpdir(), 'llamacli-test-'));
    testFile = join(tempDir, 'test.txt');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('basic functionality', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('read_file');
      expect(tool.description).toBe('Read the contents of a file from the filesystem');
    });

    it('should have valid schema', () => {
      expect(tool.schema).toBeDefined();
      expect(tool.schema.type).toBe('object');
      expect(tool.schema.properties.filePath).toBeDefined();
      expect(tool.schema.required).toContain('filePath');
    });

    it('should return correct tags', () => {
      const tags = tool.getTags();
      expect(tags).toContain('filesystem');
      expect(tags).toContain('read');
      expect(tags).toContain('file');
    });

    it('should be available by default', () => {
      expect(tool.isAvailable()).toBe(true);
    });
  });

  describe('file reading', () => {
    it('should read a simple text file', async () => {
      const content = 'Hello, World!';
      await fs.writeFile(testFile, content, 'utf8');

      const result = await tool.execute({ filePath: testFile });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe(content);
    });

    it('should read file with different encoding', async () => {
      const content = 'Hello, World!';
      await fs.writeFile(testFile, content, 'utf8');

      const result = await tool.execute({ 
        filePath: testFile,
        encoding: 'ascii'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe(content);
    });

    it('should read file with line range', async () => {
      const content = 'Line 1\nLine 2\nLine 3\nLine 4';
      await fs.writeFile(testFile, content, 'utf8');

      const result = await tool.execute({ 
        filePath: testFile,
        startLine: 2,
        endLine: 3
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe('Line 2\nLine 3');
    });

    it('should handle empty files', async () => {
      await fs.writeFile(testFile, '', 'utf8');

      const result = await tool.execute({ filePath: testFile });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe('');
    });
  });

  describe('error handling', () => {
    it('should return error for non-existent file', async () => {
      const result = await tool.execute({ filePath: '/non/existent/file.txt' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File not found');
    });

    it('should return error for directory path', async () => {
      const result = await tool.execute({ filePath: tempDir });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('is not a file');
    });

    it('should validate required parameters', async () => {
      const result = await tool.execute({} as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid parameters');
    });

    it('should handle invalid line ranges', async () => {
      const content = 'Line 1\nLine 2';
      await fs.writeFile(testFile, content, 'utf8');

      const result = await tool.execute({ 
        filePath: testFile,
        startLine: 5,
        endLine: 10
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe('');
    });
  });

  describe('security', () => {
    it('should block access to system files', async () => {
      const result = await tool.execute({ filePath: '/etc/passwd' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
    });

    it('should block executable files', async () => {
      const exeFile = join(tempDir, 'test.exe');
      await fs.writeFile(exeFile, 'fake exe', 'utf8');

      const result = await tool.execute({ filePath: exeFile });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
    });

    it('should warn about binary files', async () => {
      const binFile = join(tempDir, 'test.jpg');
      await fs.writeFile(binFile, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));

      const result = await tool.execute({ filePath: binFile });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('appears to be binary');
    });
  });

  describe('file size limits', () => {
    it('should handle large files within limit', async () => {
      const content = 'x'.repeat(1000); // 1KB file
      await fs.writeFile(testFile, content, 'utf8');

      const result = await tool.execute({ filePath: testFile });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe(content);
    });

    it('should reject files exceeding size limit', async () => {
      const content = 'x'.repeat(1000);
      await fs.writeFile(testFile, content, 'utf8');

      const result = await tool.execute({ 
        filePath: testFile,
        maxSize: 500 // Set limit to 500 bytes
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File too large');
    });
  });

  describe('parameter validation', () => {
    it('should validate encoding parameter', async () => {
      await fs.writeFile(testFile, 'test', 'utf8');

      const result = await tool.execute({ 
        filePath: testFile,
        encoding: 'invalid' as any
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid parameters');
    });

    it('should validate line number parameters', async () => {
      await fs.writeFile(testFile, 'test', 'utf8');

      const result = await tool.execute({ 
        filePath: testFile,
        startLine: 0 // Should be >= 1
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid parameters');
    });
  });
});
