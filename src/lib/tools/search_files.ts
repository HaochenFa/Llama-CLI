import { ToolDefinition } from '../../types/context.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export const search_files_tool: ToolDefinition = {
  type: 'native',
  name: 'search_files',
  description: 'Searches for files in a directory tree based on filename patterns, file extensions, or content. Returns a list of matching file paths.',
  parameters: {
    type: 'object',
    properties: {
      directory: {
        type: 'string',
        description: "The absolute path to the directory to search in (e.g., '/home/user/project'). Relative paths are not supported.",
      },
      pattern: {
        type: 'string',
        description: "Optional: Filename pattern to match (supports wildcards like '*.js', '*.ts', 'test*', etc.). If not provided, all files are considered.",
      },
      content_search: {
        type: 'string',
        description: "Optional: Search for files containing this text content. Case-insensitive search.",
      },
      max_depth: {
        type: 'number',
        description: "Optional: Maximum directory depth to search (default: 5). Use 1 for current directory only.",
        default: 5
      },
      max_results: {
        type: 'number',
        description: "Optional: Maximum number of results to return (default: 50).",
        default: 50
      },
      include_hidden: {
        type: 'boolean',
        description: "Optional: Whether to include hidden files and directories (starting with '.'). Default: false.",
        default: false
      }
    },
    required: ['directory'],
  },
  invoke: async (args: { 
    directory: string; 
    pattern?: string; 
    content_search?: string; 
    max_depth?: number; 
    max_results?: number;
    include_hidden?: boolean;
  }) => {
    const { 
      directory, 
      pattern, 
      content_search, 
      max_depth = 5, 
      max_results = 50,
      include_hidden = false 
    } = args;

    if (!path.isAbsolute(directory)) {
      throw new Error('directory must be an absolute path.');
    }

    try {
      // Check if directory exists
      const stats = await fs.stat(directory);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${directory}`);
      }

      const results: string[] = [];
      
      // Convert pattern to regex if provided
      let patternRegex: RegExp | null = null;
      if (pattern) {
        // Convert glob pattern to regex
        const regexPattern = pattern
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.');
        patternRegex = new RegExp(`^${regexPattern}$`, 'i');
      }

      async function searchDirectory(currentDir: string, currentDepth: number): Promise<void> {
        if (currentDepth > max_depth || results.length >= max_results) {
          return;
        }

        try {
          const entries = await fs.readdir(currentDir, { withFileTypes: true });

          for (const entry of entries) {
            if (results.length >= max_results) {
              break;
            }

            // Skip hidden files/directories if not included
            if (!include_hidden && entry.name.startsWith('.')) {
              continue;
            }

            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
              // Recursively search subdirectories
              await searchDirectory(fullPath, currentDepth + 1);
            } else if (entry.isFile()) {
              let matches = true;

              // Check filename pattern
              if (patternRegex && !patternRegex.test(entry.name)) {
                matches = false;
              }

              // Check content if specified
              if (matches && content_search) {
                try {
                  // Only search in text files (avoid binary files)
                  const ext = path.extname(entry.name).toLowerCase();
                  const textExtensions = [
                    '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h',
                    '.go', '.rs', '.php', '.rb', '.html', '.css', '.scss', '.less',
                    '.json', '.yaml', '.yml', '.xml', '.md', '.txt', '.log',
                    '.sh', '.bash', '.zsh', '.sql', '.graphql', '.env', '.config'
                  ];

                  if (textExtensions.includes(ext) || !ext) {
                    // Check file size (limit to 1MB for content search)
                    const fileStats = await fs.stat(fullPath);
                    if (fileStats.size <= 1024 * 1024) {
                      const content = await fs.readFile(fullPath, 'utf-8');
                      if (!content.toLowerCase().includes(content_search.toLowerCase())) {
                        matches = false;
                      }
                    } else {
                      matches = false; // Skip large files
                    }
                  } else {
                    matches = false; // Skip binary files
                  }
                } catch (error) {
                  // If we can't read the file, skip it
                  matches = false;
                }
              }

              if (matches) {
                results.push(fullPath);
              }
            }
          }
        } catch (error) {
          // Skip directories we can't read (permission issues, etc.)
          return;
        }
      }

      await searchDirectory(directory, 0);

      if (results.length === 0) {
        return 'No files found matching the search criteria.';
      }

      // Format results
      const resultText = results
        .slice(0, max_results)
        .map((filePath, index) => `${index + 1}. ${filePath}`)
        .join('\n');

      const summary = `Found ${results.length} file(s)${results.length >= max_results ? ` (showing first ${max_results})` : ''}:\n\n${resultText}`;
      
      return summary;

    } catch (error: any) {
      return `Error searching files in ${directory}: ${(error as Error).message}`;
    }
  },
};
