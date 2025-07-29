/**
 * Shell Tools Module for LlamaCLI
 * Provides secure shell command execution capabilities
 */

export { ShellExecuteTool } from "./execute.js";

// Re-export types for convenience
export type { ShellExecuteParams, ShellExecuteResult } from "./execute.js";

// Export shell tools for manual registration
export const shellTools = ["shell_execute"];

/**
 * Shell tools configuration
 */
export const SHELL_TOOLS_CONFIG = {
  // Execution limits
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  MAX_TIMEOUT: 300000, // 5 minutes
  MAX_OUTPUT_SIZE: 1024 * 1024, // 1MB

  // Security settings
  BLOCKED_COMMANDS: [
    "rm -rf /",
    "rm -rf *",
    "format",
    "fdisk",
    "mkfs",
    "dd if=/dev/zero",
    "dd if=/dev/random",
    ":(){ :|:& };:", // Fork bomb
    "sudo rm",
    "sudo dd",
    "sudo mkfs",
    "sudo fdisk",
  ],

  BLOCKED_PATTERNS: [
    /rm\s+-rf\s+\//, // rm -rf /
    /rm\s+-rf\s+\*/, // rm -rf *
    /dd\s+if=\/dev\/(zero|random)/, // dd from /dev/zero or /dev/random
    /:\(\)\{\s*:\|\:&\s*\}/, // Fork bomb pattern
    /sudo\s+(rm|dd|mkfs|fdisk)/, // Dangerous sudo commands
  ],

  ALLOWED_SHELLS: [
    "/bin/bash",
    "/bin/sh",
    "/bin/zsh",
    "/bin/fish",
    "/usr/bin/bash",
    "/usr/bin/sh",
    "/usr/bin/zsh",
    "/usr/bin/fish",
  ],

  // Environment settings
  SAFE_ENVIRONMENT: {
    PATH: "/usr/local/bin:/usr/bin:/bin",
    HOME: process.env.HOME || "/tmp",
    USER: process.env.USER || "llamacli",
    SHELL: "/bin/bash",
  },

  // Working directory restrictions
  ALLOWED_DIRECTORIES: [process.cwd(), "/tmp", "/var/tmp"],
} as const;
