/**
 * File System Tools Module for LlamaCLI
 * Provides comprehensive file system interaction capabilities
 */

export { ReadFileTool } from "./read-file.js";
export { WriteFileTool } from "./write-file.js";
export { ListDirectoryTool } from "./list-directory.js";
export { SearchFilesTool } from "./search-files.js";

// Re-export types for convenience
export type { ReadFileParams } from "./read-file.js";

export type { WriteFileParams } from "./write-file.js";

export type { ListDirectoryParams } from "./list-directory.js";

export type { SearchFilesParams } from "./search-files.js";

/**
 * Initialize filesystem tools
 */
export function initializeFilesystemTools() {
  // Import here to avoid circular dependencies
  import("../base.js").then(({ globalToolRegistry }) => {
    import("./read-file.js").then(({ ReadFileTool }) => {
      globalToolRegistry.register(new ReadFileTool());
    });
    import("./write-file.js").then(({ WriteFileTool }) => {
      globalToolRegistry.register(new WriteFileTool());
    });
    import("./list-directory.js").then(({ ListDirectoryTool }) => {
      globalToolRegistry.register(new ListDirectoryTool());
    });
    import("./search-files.js").then(({ SearchFilesTool }) => {
      globalToolRegistry.register(new SearchFilesTool());
    });
  });
}

/**
 * File system tools configuration
 */
export const FILESYSTEM_TOOLS_CONFIG = {
  // File size limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_DIRECTORY_ENTRIES: 1000,

  // Security settings
  BLOCKED_PATHS: ["/etc/passwd", "/etc/shadow", "/etc/hosts", "/proc", "/sys", "/dev"],

  BLOCKED_EXTENSIONS: [".exe", ".bat", ".cmd", ".scr", ".pif", ".com"],

  // Default excludes for directory listing
  DEFAULT_EXCLUDES: [
    "node_modules",
    ".git",
    ".svn",
    ".hg",
    ".DS_Store",
    "Thumbs.db",
    "*.tmp",
    "*.temp",
    "*.log",
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
  ],

  // Supported text file extensions
  TEXT_EXTENSIONS: [
    ".txt",
    ".md",
    ".json",
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".py",
    ".java",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".cs",
    ".php",
    ".rb",
    ".go",
    ".rs",
    ".swift",
    ".kt",
    ".scala",
    ".html",
    ".htm",
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".xml",
    ".yaml",
    ".yml",
    ".toml",
    ".ini",
    ".cfg",
    ".sh",
    ".bash",
    ".zsh",
    ".fish",
    ".ps1",
    ".bat",
    ".sql",
    ".r",
    ".m",
    ".pl",
    ".lua",
    ".vim",
  ],

  // Binary file extensions that should not be read as text
  BINARY_EXTENSIONS: [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".ico",
    ".svg",
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".zip",
    ".tar",
    ".gz",
    ".bz2",
    ".7z",
    ".rar",
    ".mp3",
    ".mp4",
    ".avi",
    ".mov",
    ".wmv",
    ".flv",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".app",
  ],
} as const;
