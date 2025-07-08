// tests/lib/file-context-manager.test.ts

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { FileContextManager } from '../../src/lib/file-context-manager';
import { FileContext } from '../../src/types/context';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('FileContextManager', () => {
  let fileManager: FileContextManager;
  const testWorkingDir = '/test/workspace';

  beforeEach(() => {
    jest.clearAllMocks();
    fileManager = new FileContextManager(testWorkingDir);
  });

  describe('parseAtSyntax', () => {
    it('should parse single file reference', () => {
      const input = 'Please analyze @src/main.ts for issues';
      const result = fileManager.parseAtSyntax(input);

      expect(result.filePaths).toEqual(['src/main.ts']);
      expect(result.cleanedInput).toBe('Please analyze  for issues');
    });

    it('should parse multiple file references', () => {
      const input = 'Compare @file1.js and @file2.ts and @docs/readme.md';
      const result = fileManager.parseAtSyntax(input);

      expect(result.filePaths).toEqual(['file1.js', 'file2.ts', 'docs/readme.md']);
      expect(result.cleanedInput).toBe('Compare  and  and');
    });

    it('should handle input without @ syntax', () => {
      const input = 'This is a normal message without file references';
      const result = fileManager.parseAtSyntax(input);

      expect(result.filePaths).toEqual([]);
      expect(result.cleanedInput).toBe('This is a normal message without file references');
    });

    it('should handle empty input', () => {
      const input = '';
      const result = fileManager.parseAtSyntax(input);

      expect(result.filePaths).toEqual([]);
      expect(result.cleanedInput).toBe('');
    });

    it('should handle @ at end of word', () => {
      const input = 'Check @src/utils.ts@backup for comparison';
      const result = fileManager.parseAtSyntax(input);

      expect(result.filePaths).toEqual(['src/utils.ts@backup']);
    });
  });

  describe('loadFile', () => {
    it('should load existing file successfully', async () => {
      const filePath = 'test.txt';
      const fileContent = 'Hello, world!';
      const absolutePath = path.resolve(testWorkingDir, filePath);

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        isFile: () => true,
        size: fileContent.length
      } as any);
      mockFs.readFileSync.mockReturnValue(fileContent);

      const result = await fileManager.loadFile(filePath);

      expect(result).toEqual({
        path: absolutePath,
        content: fileContent
      });
    });

    it('should handle non-existent file', async () => {
      const filePath = 'nonexistent.txt';

      mockFs.existsSync.mockReturnValue(false);

      const result = await fileManager.loadFile(filePath);

      expect(result).toBeNull();
    });

    it('should handle directory instead of file', async () => {
      const filePath = 'directory';

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        isFile: () => false
      } as any);

      const result = await fileManager.loadFile(filePath);

      expect(result).toBeNull();
    });

    it('should handle file too large', async () => {
      const filePath = 'large.txt';
      const largeSize = 2 * 1024 * 1024; // 2MB

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        isFile: () => true,
        size: largeSize
      } as any);

      const result = await fileManager.loadFile(filePath);

      expect(result).toBeNull();
    });

    it('should handle read error', async () => {
      const filePath = 'error.txt';

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        isFile: () => true,
        size: 100
      } as any);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await fileManager.loadFile(filePath);

      expect(result).toBeNull();
    });

    it('should handle absolute paths', async () => {
      const absolutePath = '/absolute/path/test.txt';
      const fileContent = 'Content';

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        isFile: () => true,
        size: fileContent.length
      } as any);
      mockFs.readFileSync.mockReturnValue(fileContent);

      const result = await fileManager.loadFile(absolutePath);

      expect(result?.path).toBe(absolutePath);
    });
  });

  describe('loadFiles', () => {
    it('should load multiple files successfully', async () => {
      const filePaths = ['file1.txt', 'file2.txt'];
      const fileContents = ['Content 1', 'Content 2'];

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        isFile: () => true,
        size: 100
      } as any);
      mockFs.readFileSync
        .mockReturnValueOnce(fileContents[0])
        .mockReturnValueOnce(fileContents[1]);

      const results = await fileManager.loadFiles(filePaths);

      expect(results).toHaveLength(2);
      expect(results[0].content).toBe(fileContents[0]);
      expect(results[1].content).toBe(fileContents[1]);
    });

    it('should skip failed files and return successful ones', async () => {
      const filePaths = ['good.txt', 'bad.txt'];

      mockFs.existsSync
        .mockReturnValueOnce(true)  // good.txt exists
        .mockReturnValueOnce(false); // bad.txt doesn't exist
      mockFs.statSync.mockReturnValue({
        isFile: () => true,
        size: 100
      } as any);
      mockFs.readFileSync.mockReturnValue('Good content');

      const results = await fileManager.loadFiles(filePaths);

      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('Good content');
    });
  });

  describe('getFileCompletions', () => {
    it('should return matching files and directories', () => {
      const partial = 'src/';
      const basePath = path.resolve(testWorkingDir, 'src');

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'main.ts', isDirectory: () => false },
        { name: 'utils', isDirectory: () => true },
        { name: 'test.js', isDirectory: () => false }
      ] as any);

      const completions = fileManager.getFileCompletions(partial);

      expect(completions).toContain('src/main.ts');
      expect(completions).toContain('src/utils/');
      expect(completions).toContain('src/test.js');
    });

    it('should filter by partial filename', () => {
      const partial = 'src/ma';
      const basePath = path.resolve(testWorkingDir, 'src');

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'main.ts', isDirectory: () => false },
        { name: 'utils.ts', isDirectory: () => false },
        { name: 'manager.js', isDirectory: () => false }
      ] as any);

      const completions = fileManager.getFileCompletions(partial);

      expect(completions).toContain('src/main.ts');
      expect(completions).toContain('src/manager.js');
      expect(completions).not.toContain('src/utils.ts');
    });

    it('should skip hidden files', () => {
      const partial = 'src/';

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        { name: 'main.ts', isDirectory: () => false },
        { name: '.hidden', isDirectory: () => false },
        { name: '.git', isDirectory: () => true }
      ] as any);

      const completions = fileManager.getFileCompletions(partial);

      expect(completions).toContain('src/main.ts');
      expect(completions).not.toContain('src/.hidden');
      expect(completions).not.toContain('src/.git/');
    });

    it('should handle non-existent directory', () => {
      const partial = 'nonexistent/';

      mockFs.existsSync.mockReturnValue(false);

      const completions = fileManager.getFileCompletions(partial);

      expect(completions).toEqual([]);
    });
  });

  describe('isFileInContext', () => {
    it('should detect file in context', () => {
      const filePath = 'test.txt';
      const absolutePath = path.resolve(testWorkingDir, filePath);
      const context: FileContext[] = [
        { path: absolutePath, content: 'content' }
      ];

      const result = fileManager.isFileInContext(filePath, context);

      expect(result).toBe(true);
    });

    it('should detect file not in context', () => {
      const filePath = 'test.txt';
      const context: FileContext[] = [
        { path: '/other/path/file.txt', content: 'content' }
      ];

      const result = fileManager.isFileInContext(filePath, context);

      expect(result).toBe(false);
    });
  });

  describe('isSupportedFileType', () => {
    it('should support common programming languages', () => {
      const supportedFiles = [
        'test.js', 'test.ts', 'test.py', 'test.java',
        'test.cpp', 'test.go', 'test.rs', 'test.php'
      ];

      supportedFiles.forEach(file => {
        expect(fileManager.isSupportedFileType(file)).toBe(true);
      });
    });

    it('should support configuration files', () => {
      const configFiles = [
        'package.json', 'config.yaml', 'settings.yml',
        'data.xml', 'README.md'
      ];

      configFiles.forEach(file => {
        expect(fileManager.isSupportedFileType(file)).toBe(true);
      });
    });

    it('should support files without extensions', () => {
      const noExtFiles = ['Dockerfile', 'Makefile', 'README'];

      noExtFiles.forEach(file => {
        expect(fileManager.isSupportedFileType(file)).toBe(true);
      });
    });

    it('should not support binary files', () => {
      const binaryFiles = [
        'image.png', 'video.mp4', 'archive.zip',
        'executable.exe', 'library.so'
      ];

      binaryFiles.forEach(file => {
        expect(fileManager.isSupportedFileType(file)).toBe(false);
      });
    });
  });
});
