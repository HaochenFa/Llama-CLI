/**
 * File Reference Parser for LlamaCLI
 * Handles parsing and processing of @path/to/file syntax
 */

import * as path from 'path';
import * as fs from 'fs/promises';

export interface FileReference {
  originalText: string;
  filePath: string;
  resolvedPath: string;
  startIndex: number;
  endIndex: number;
}

export interface FileContent {
  path: string;
  content: string;
  size: number;
  lastModified: number;
  error?: string;
}

export interface ProcessedInput {
  originalInput: string;
  processedInput: string;
  fileReferences: FileReference[];
  fileContents: FileContent[];
  hasFileReferences: boolean;
}

/**
 * Parse file references from user input
 * Supports patterns like:
 * - @file.txt
 * - @path/to/file.js
 * - @./relative/path.md
 * - @../parent/file.json
 * - @/absolute/path.txt
 */
export function parseFileReferences(input: string, workingDirectory: string): FileReference[] {
  const fileReferences: FileReference[] = [];
  
  // Regex to match @path patterns
  // Matches @followed by non-whitespace characters that look like file paths
  const fileRefRegex = /@([^\s@]+)/g;
  
  let match;
  while ((match = fileRefRegex.exec(input)) !== null) {
    const originalText = match[0];
    const filePath = match[1];
    
    // Resolve the path relative to working directory
    let resolvedPath: string;
    if (path.isAbsolute(filePath)) {
      resolvedPath = filePath;
    } else {
      resolvedPath = path.resolve(workingDirectory, filePath);
    }
    
    fileReferences.push({
      originalText,
      filePath,
      resolvedPath,
      startIndex: match.index,
      endIndex: match.index + originalText.length
    });
  }
  
  return fileReferences;
}

/**
 * Read file contents for file references
 */
export async function readFileContents(fileReferences: FileReference[]): Promise<FileContent[]> {
  const fileContents: FileContent[] = [];
  
  for (const ref of fileReferences) {
    try {
      const stats = await fs.stat(ref.resolvedPath);
      
      if (!stats.isFile()) {
        fileContents.push({
          path: ref.resolvedPath,
          content: '',
          size: 0,
          lastModified: 0,
          error: `Path is not a file: ${ref.filePath}`
        });
        continue;
      }
      
      // Check file size (limit to 1MB for safety)
      if (stats.size > 1024 * 1024) {
        fileContents.push({
          path: ref.resolvedPath,
          content: '',
          size: stats.size,
          lastModified: stats.mtime.getTime(),
          error: `File too large (${Math.round(stats.size / 1024)}KB > 1MB): ${ref.filePath}`
        });
        continue;
      }
      
      const content = await fs.readFile(ref.resolvedPath, 'utf8');
      
      fileContents.push({
        path: ref.resolvedPath,
        content,
        size: stats.size,
        lastModified: stats.mtime.getTime()
      });
      
    } catch (error) {
      fileContents.push({
        path: ref.resolvedPath,
        content: '',
        size: 0,
        lastModified: 0,
        error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
  
  return fileContents;
}

/**
 * Process user input with file references
 */
export async function processFileReferences(
  input: string, 
  workingDirectory: string
): Promise<ProcessedInput> {
  const fileReferences = parseFileReferences(input, workingDirectory);
  
  if (fileReferences.length === 0) {
    return {
      originalInput: input,
      processedInput: input,
      fileReferences: [],
      fileContents: [],
      hasFileReferences: false
    };
  }
  
  const fileContents = await readFileContents(fileReferences);
  
  // Replace file references with readable descriptions
  let processedInput = input;
  let offset = 0;
  
  for (let i = 0; i < fileReferences.length; i++) {
    const ref = fileReferences[i];
    const content = fileContents[i];
    
    let replacement: string;
    if (content.error) {
      replacement = `[File: ${ref.filePath} - Error: ${content.error}]`;
    } else {
      replacement = `[File: ${ref.filePath}]`;
    }
    
    const startPos = ref.startIndex + offset;
    const endPos = ref.endIndex + offset;
    
    processedInput = processedInput.substring(0, startPos) + 
                   replacement + 
                   processedInput.substring(endPos);
    
    offset += replacement.length - ref.originalText.length;
  }
  
  // Append file contents at the end
  if (fileContents.some(fc => !fc.error && fc.content)) {
    processedInput += '\n\n--- Referenced Files ---\n';
    
    for (const content of fileContents) {
      if (content.error) {
        processedInput += `\n❌ ${content.path}: ${content.error}\n`;
      } else if (content.content) {
        processedInput += `\n📄 ${content.path}:\n\`\`\`\n${content.content}\n\`\`\`\n`;
      }
    }
  }
  
  return {
    originalInput: input,
    processedInput,
    fileReferences,
    fileContents,
    hasFileReferences: true
  };
}

/**
 * Check if input contains file references
 */
export function hasFileReferences(input: string): boolean {
  return /@[^\s@]+/.test(input);
}
