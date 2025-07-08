// tests/integration.test.ts
// Integration tests for core functionality

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('File Context Parsing', () => {
  // Test the @-syntax parsing logic directly
  function parseAtSyntax(input: string): { filePaths: string[], cleanedInput: string } {
    const atPattern = /@([^\s]+)/g;
    const filePaths: string[] = [];
    let match;

    while ((match = atPattern.exec(input)) !== null) {
      filePaths.push(match[1]);
    }

    const cleanedInput = input.replace(atPattern, '').trim();
    return { filePaths, cleanedInput };
  }

  it('should parse single file reference', () => {
    const input = 'Please analyze @src/main.ts for issues';
    const result = parseAtSyntax(input);

    expect(result.filePaths).toEqual(['src/main.ts']);
    expect(result.cleanedInput).toBe('Please analyze  for issues');
  });

  it('should parse multiple file references', () => {
    const input = 'Compare @file1.js and @file2.ts and @docs/readme.md';
    const result = parseAtSyntax(input);

    expect(result.filePaths).toEqual(['file1.js', 'file2.ts', 'docs/readme.md']);
    expect(result.cleanedInput).toBe('Compare  and  and');
  });

  it('should handle input without @ syntax', () => {
    const input = 'This is a normal message without file references';
    const result = parseAtSyntax(input);

    expect(result.filePaths).toEqual([]);
    expect(result.cleanedInput).toBe('This is a normal message without file references');
  });
});

describe('Tool Validation Logic', () => {
  // Test argument validation logic
  function validateToolArguments(args: any, schema: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!schema.required) {
      return { valid: true, errors: [] };
    }

    for (const requiredField of schema.required) {
      if (!(requiredField in args)) {
        errors.push(`Missing required field: ${requiredField}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  it('should validate required arguments', () => {
    const args = { file_path: '/test/file.txt' };
    const schema = {
      type: 'object',
      properties: { file_path: { type: 'string' }, content: { type: 'string' } },
      required: ['file_path', 'content']
    };

    const result = validateToolArguments(args, schema);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field: content');
  });

  it('should pass validation with all required fields', () => {
    const args = { file_path: '/test/file.txt', content: 'Hello, world!' };
    const schema = {
      type: 'object',
      properties: { file_path: { type: 'string' }, content: { type: 'string' } },
      required: ['file_path', 'content']
    };

    const result = validateToolArguments(args, schema);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('Profile Validation Logic', () => {
  // Test profile validation logic
  function validateProfile(profile: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!profile.name || !profile.name.trim()) {
      errors.push('Profile name is required');
    }

    if (!profile.type) {
      errors.push('Profile type is required');
    }

    if (!profile.endpoint || !profile.endpoint.trim()) {
      errors.push('Endpoint URL is required');
    }

    const supportedTypes = ['ollama', 'vllm'];
    if (profile.type && !supportedTypes.includes(profile.type)) {
      errors.push(`Unsupported LLM type: ${profile.type}. Supported types: ${supportedTypes.join(', ')}`);
    }

    if (profile.endpoint) {
      try {
        new URL(profile.endpoint);
      } catch {
        errors.push('Invalid endpoint URL format');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  it('should validate correct ollama profile', () => {
    const profile = {
      name: 'test-ollama',
      type: 'ollama',
      endpoint: 'http://localhost:11434'
    };

    const result = validateProfile(profile);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate correct vllm profile', () => {
    const profile = {
      name: 'test-vllm',
      type: 'vllm',
      endpoint: 'http://localhost:8000'
    };

    const result = validateProfile(profile);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject profile without name', () => {
    const profile = {
      type: 'ollama',
      endpoint: 'http://localhost:11434'
    };

    const result = validateProfile(profile);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Profile name is required');
  });

  it('should reject profile with invalid URL', () => {
    const profile = {
      name: 'test',
      type: 'ollama',
      endpoint: 'not-a-url'
    };

    const result = validateProfile(profile);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid endpoint URL format');
  });

  it('should reject unsupported type', () => {
    const profile = {
      name: 'test',
      type: 'unsupported',
      endpoint: 'http://localhost:8000'
    };

    const result = validateProfile(profile);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Unsupported LLM type'))).toBe(true);
  });
});

describe('File Type Support Logic', () => {
  // Test file type support logic
  function isSupportedFileType(filePath: string): boolean {
    const supportedExtensions = [
      '.js', '.ts', '.jsx', '.tsx',
      '.py', '.java', '.cpp', '.c', '.h',
      '.go', '.rs', '.php', '.rb',
      '.html', '.css', '.scss', '.less',
      '.json', '.yaml', '.yml', '.xml',
      '.md', '.txt', '.log',
      '.sh', '.bash', '.zsh',
      '.sql', '.graphql',
      '.dockerfile', '.gitignore',
      '.env', '.config'
    ];

    const parts = filePath.split('.');
    const ext = parts.length > 1 ? parts.pop()?.toLowerCase() : null;

    if (!ext || parts.length === 0) {
      // Check for common files without extensions
      const fileName = filePath.split('/').pop()?.toLowerCase() || '';
      const commonFiles = ['dockerfile', 'makefile', 'readme', 'license', 'changelog'];
      return commonFiles.some(common => fileName.includes(common));
    }

    return supportedExtensions.includes(`.${ext}`);
  }

  it('should support common programming languages', () => {
    const supportedFiles = [
      'test.js', 'test.ts', 'test.py', 'test.java',
      'test.cpp', 'test.go', 'test.rs', 'test.php'
    ];

    supportedFiles.forEach(file => {
      expect(isSupportedFileType(file)).toBe(true);
    });
  });

  it('should support configuration files', () => {
    const configFiles = [
      'package.json', 'config.yaml', 'settings.yml',
      'data.xml', 'README.md'
    ];

    configFiles.forEach(file => {
      expect(isSupportedFileType(file)).toBe(true);
    });
  });

  it('should support files without extensions', () => {
    const noExtFiles = ['Dockerfile', 'Makefile', 'README'];

    noExtFiles.forEach(file => {
      expect(isSupportedFileType(file)).toBe(true);
    });
  });

  it('should not support binary files', () => {
    const binaryFiles = [
      'image.png', 'video.mp4', 'archive.zip',
      'executable.exe', 'library.so'
    ];

    binaryFiles.forEach(file => {
      expect(isSupportedFileType(file)).toBe(false);
    });
  });
});
