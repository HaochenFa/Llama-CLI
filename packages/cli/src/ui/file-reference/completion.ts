/**
 * File Reference Completion for LlamaCLI
 * Provides intelligent file path completion for @path/to/file syntax
 */

import * as path from 'path';
import * as fs from 'fs/promises';

export interface FileCompletionResult {
  completions: string[];
  prefix: string;
}

/**
 * Get file path completions for @path syntax
 */
export async function getFileCompletions(
  input: string,
  cursorPosition: number,
  workingDirectory: string
): Promise<FileCompletionResult> {
  // Find the @ symbol before cursor
  const beforeCursor = input.substring(0, cursorPosition);
  const atMatch = beforeCursor.match(/@([^\s@]*)$/);
  
  if (!atMatch) {
    return { completions: [], prefix: '' };
  }
  
  const partialPath = atMatch[1];
  const atPosition = atMatch.index!;
  
  try {
    const completions = await getPathCompletions(partialPath, workingDirectory);
    
    // Format completions with @ prefix
    const formattedCompletions = completions.map(completion => {
      const fullCompletion = input.substring(0, atPosition) + '@' + completion + input.substring(cursorPosition);
      return fullCompletion;
    });
    
    return {
      completions: formattedCompletions,
      prefix: input.substring(0, atPosition + 1 + partialPath.length)
    };
  } catch (error) {
    return { completions: [], prefix: '' };
  }
}

/**
 * Get path completions for a partial path
 */
async function getPathCompletions(partialPath: string, workingDirectory: string): Promise<string[]> {
  let basePath: string;
  let searchPattern: string;
  
  if (partialPath === '') {
    // No path provided, show current directory contents
    basePath = workingDirectory;
    searchPattern = '';
  } else if (partialPath.endsWith('/') || partialPath.endsWith(path.sep)) {
    // Path ends with separator, show directory contents
    basePath = path.isAbsolute(partialPath) 
      ? partialPath 
      : path.resolve(workingDirectory, partialPath);
    searchPattern = '';
  } else {
    // Partial filename, show matching files in parent directory
    const dirname = path.dirname(partialPath);
    const basename = path.basename(partialPath);
    
    basePath = dirname === '.' 
      ? workingDirectory 
      : path.isAbsolute(dirname)
        ? dirname
        : path.resolve(workingDirectory, dirname);
    
    searchPattern = basename;
  }
  
  try {
    const entries = await fs.readdir(basePath, { withFileTypes: true });
    const completions: string[] = [];
    
    for (const entry of entries) {
      // Skip hidden files unless explicitly requested
      if (entry.name.startsWith('.') && !searchPattern.startsWith('.')) {
        continue;
      }
      
      // Filter by search pattern
      if (searchPattern && !entry.name.toLowerCase().startsWith(searchPattern.toLowerCase())) {
        continue;
      }
      
      let completionPath: string;
      
      if (partialPath === '') {
        // Root level completion
        completionPath = entry.name;
      } else if (partialPath.endsWith('/') || partialPath.endsWith(path.sep)) {
        // Directory completion
        completionPath = partialPath + entry.name;
      } else {
        // File completion
        const dirname = path.dirname(partialPath);
        completionPath = dirname === '.' 
          ? entry.name 
          : path.join(dirname, entry.name);
      }
      
      // Add trailing slash for directories
      if (entry.isDirectory()) {
        completionPath += '/';
      }
      
      completions.push(completionPath);
    }
    
    // Sort completions: directories first, then files
    completions.sort((a, b) => {
      const aIsDir = a.endsWith('/');
      const bIsDir = b.endsWith('/');
      
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      
      return a.localeCompare(b, undefined, { numeric: true });
    });
    
    return completions;
    
  } catch (error) {
    // Directory doesn't exist or can't be read
    return [];
  }
}

/**
 * Check if the cursor is within a file reference
 */
export function isInFileReference(input: string, cursorPosition: number): boolean {
  const beforeCursor = input.substring(0, cursorPosition);
  const afterCursor = input.substring(cursorPosition);
  
  // Find the last @ before cursor
  const lastAtIndex = beforeCursor.lastIndexOf('@');
  if (lastAtIndex === -1) {
    return false;
  }
  
  // Check if there's whitespace between @ and cursor
  const textAfterAt = beforeCursor.substring(lastAtIndex + 1);
  if (/\s/.test(textAfterAt)) {
    return false;
  }
  
  // Check if the file reference continues after cursor
  const textAfterCursor = afterCursor.match(/^[^\s@]*/);
  
  return true;
}

/**
 * Get the current file reference at cursor position
 */
export function getCurrentFileReference(input: string, cursorPosition: number): string | null {
  if (!isInFileReference(input, cursorPosition)) {
    return null;
  }
  
  const beforeCursor = input.substring(0, cursorPosition);
  const afterCursor = input.substring(cursorPosition);
  
  // Find the @ symbol
  const lastAtIndex = beforeCursor.lastIndexOf('@');
  const pathBefore = beforeCursor.substring(lastAtIndex + 1);
  
  // Find the end of the path
  const pathAfterMatch = afterCursor.match(/^[^\s@]*/);
  const pathAfter = pathAfterMatch ? pathAfterMatch[0] : '';
  
  return pathBefore + pathAfter;
}
