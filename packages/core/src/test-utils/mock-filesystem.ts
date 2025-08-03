/**
 * Mock filesystem utilities for testing
 */

import { vi } from 'vitest';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';

// Mock file system state
interface MockFileSystem {
  [path: string]: string | MockFileSystem;
}

class MockFileSystemManager {
  private files: MockFileSystem = {};

  // Set up mock files
  setFile(filePath: string, content: string): void {
    const normalizedPath = path.normalize(filePath);
    this.files[normalizedPath] = content;
  }

  setDirectory(dirPath: string, contents: MockFileSystem = {}): void {
    const normalizedPath = path.normalize(dirPath);
    this.files[normalizedPath] = contents;
  }

  getFile(filePath: string): string | undefined {
    const normalizedPath = path.normalize(filePath);
    const content = this.files[normalizedPath];
    return typeof content === 'string' ? content : undefined;
  }

  exists(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath);
    return normalizedPath in this.files;
  }

  isDirectory(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath);
    const content = this.files[normalizedPath];
    return typeof content === 'object' && content !== null;
  }

  isFile(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath);
    const content = this.files[normalizedPath];
    return typeof content === 'string';
  }

  clear(): void {
    this.files = {};
  }

  // Get all files in a directory
  readDirectory(dirPath: string): string[] {
    const normalizedPath = path.normalize(dirPath);
    const content = this.files[normalizedPath];
    
    if (typeof content === 'object' && content !== null) {
      return Object.keys(content);
    }
    
    // Return files that start with this path
    return Object.keys(this.files)
      .filter(filePath => filePath.startsWith(normalizedPath + path.sep))
      .map(filePath => path.relative(normalizedPath, filePath))
      .filter(relativePath => !relativePath.includes(path.sep));
  }
}

// Global mock filesystem instance
export const mockFs = new MockFileSystemManager();

// Mock fs.promises functions
export const mockFsPromises = () => {
  vi.mocked(fs.readFile).mockImplementation(async (filePath: any) => {
    const content = mockFs.getFile(filePath.toString());
    if (content === undefined) {
      throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    }
    return Buffer.from(content);
  });

  vi.mocked(fs.writeFile).mockImplementation(async (filePath: any, data: any) => {
    mockFs.setFile(filePath.toString(), data.toString());
  });

  vi.mocked(fs.access).mockImplementation(async (filePath: any) => {
    if (!mockFs.exists(filePath.toString())) {
      throw new Error(`ENOENT: no such file or directory, access '${filePath}'`);
    }
  });

  vi.mocked(fs.stat).mockImplementation(async (filePath: any) => {
    const pathStr = filePath.toString();
    if (!mockFs.exists(pathStr)) {
      throw new Error(`ENOENT: no such file or directory, stat '${filePath}'`);
    }

    const isDir = mockFs.isDirectory(pathStr);
    const content = mockFs.getFile(pathStr) || '';
    
    return {
      isFile: () => !isDir,
      isDirectory: () => isDir,
      size: content.length,
      mtime: new Date(),
      ctime: new Date(),
      atime: new Date(),
      birthtime: new Date(),
      mode: 0o644,
      uid: 1000,
      gid: 1000,
      dev: 1,
      ino: 1,
      nlink: 1,
      rdev: 0,
      blksize: 4096,
      blocks: Math.ceil(content.length / 512),
    } as any;
  });

  vi.mocked(fs.readdir).mockImplementation(async (dirPath: any) => {
    const pathStr = dirPath.toString();
    if (!mockFs.exists(pathStr) || !mockFs.isDirectory(pathStr)) {
      throw new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`);
    }
    return mockFs.readDirectory(pathStr) as any;
  });

  vi.mocked(fs.mkdir).mockImplementation(async (dirPath: any) => {
    mockFs.setDirectory(dirPath.toString());
  });

  vi.mocked(fs.rmdir).mockImplementation(async (dirPath: any) => {
    // Simple implementation - just remove from mock
    delete mockFs['files'][dirPath.toString()];
  });

  vi.mocked(fs.unlink).mockImplementation(async (filePath: any) => {
    delete mockFs['files'][filePath.toString()];
  });
};

// Mock synchronous fs functions
export const mockFsSync = () => {
  vi.mocked(fsSync.readFileSync).mockImplementation((filePath: any) => {
    const content = mockFs.getFile(filePath.toString());
    if (content === undefined) {
      throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    }
    return Buffer.from(content);
  });

  vi.mocked(fsSync.writeFileSync).mockImplementation((filePath: any, data: any) => {
    mockFs.setFile(filePath.toString(), data.toString());
  });

  vi.mocked(fsSync.existsSync).mockImplementation((filePath: any) => {
    return mockFs.exists(filePath.toString());
  });

  vi.mocked(fsSync.statSync).mockImplementation((filePath: any) => {
    const pathStr = filePath.toString();
    if (!mockFs.exists(pathStr)) {
      throw new Error(`ENOENT: no such file or directory, stat '${filePath}'`);
    }

    const isDir = mockFs.isDirectory(pathStr);
    const content = mockFs.getFile(pathStr) || '';
    
    return {
      isFile: () => !isDir,
      isDirectory: () => isDir,
      size: content.length,
      mtime: new Date(),
      ctime: new Date(),
    } as any;
  });
};

// Utility functions for common test scenarios
export const setupMockProject = () => {
  mockFs.clear();
  mockFs.setFile('/project/package.json', JSON.stringify({
    name: 'test-project',
    version: '1.0.0',
    dependencies: {}
  }, null, 2));
  
  mockFs.setFile('/project/src/index.ts', 'export const hello = "world";');
  mockFs.setFile('/project/README.md', '# Test Project\n\nThis is a test project.');
  mockFs.setDirectory('/project/src');
  mockFs.setDirectory('/project/dist');
};

export const setupMockConfig = () => {
  mockFs.setFile('/home/user/.llamacli/config.json', JSON.stringify({
    defaultModel: 'gpt-4',
    apiKeys: {
      openai: 'test-key'
    }
  }, null, 2));
};
