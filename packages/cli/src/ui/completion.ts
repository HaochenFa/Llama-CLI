/**
 * Command Auto-completion System for LlamaCLI
 * Provides intelligent command, option, and file path completion
 */

import { readdir, stat } from "fs/promises";
import { join, dirname, basename } from "path";
import { ConfigStore } from "@llamacli/core";
import { EnhancedCompletionEngine } from "./completion/enhanced-engine.js";

export interface CompletionResult {
  completions: string[];
  prefix: string;
  suffix: string;
}

export interface CompletionContext {
  line: string;
  cursor: number;
  workingDirectory: string;
  configStore?: ConfigStore;
}

export class CompletionEngine {
  private commands: Map<string, CommandCompletion> = new Map();
  public configStore?: ConfigStore;
  private enhancedEngine: EnhancedCompletionEngine;

  constructor(configStore?: ConfigStore) {
    this.configStore = configStore;
    this.enhancedEngine = new EnhancedCompletionEngine();
    this.initializeCommands();
  }

  /**
   * Initialize command completions
   */
  private initializeCommands(): void {
    // Main commands
    this.commands.set("chat", {
      description: "Start an interactive chat session",
      options: [
        { name: "--profile", alias: "-p", hasValue: true, description: "Use specific LLM profile" },
        { name: "--file", alias: "-f", hasValue: true, description: "Include file in context" },
        { name: "--directory", alias: "-d", hasValue: true, description: "Set working directory" },
        { name: "--no-tools", hasValue: false, description: "Disable tool usage" },
        { name: "--yolo", hasValue: false, description: "Auto-approve all tool calls" },
      ],
      subcommands: [],
    });

    this.commands.set("get", {
      description: "Quick query without interactive session",
      options: [
        { name: "--profile", alias: "-p", hasValue: true, description: "Use specific LLM profile" },
        { name: "--file", alias: "-f", hasValue: true, description: "Include file in context" },
      ],
      subcommands: [],
    });

    this.commands.set("config", {
      description: "Manage configuration",
      options: [],
      subcommands: [
        { name: "list", description: "List all profiles" },
        { name: "add", description: "Add a new profile" },
        { name: "use", description: "Set active profile" },
        { name: "remove", description: "Remove a profile" },
      ],
    });

    this.commands.set("session", {
      description: "Manage sessions",
      options: [],
      subcommands: [
        { name: "list", description: "List all sessions" },
        { name: "show", description: "Show session details" },
        { name: "delete", description: "Delete a session" },
        { name: "export", description: "Export session data" },
        { name: "import", description: "Import session data" },
      ],
    });
  }

  /**
   * Get enhanced completions using the new engine
   */
  async getEnhancedCompletions(context: CompletionContext): Promise<CompletionResult> {
    // Update enhanced engine with current config store
    if (this.configStore) {
      const enhancedContext = { ...context, configStore: this.configStore };
      return this.enhancedEngine.getEnhancedCompletions(enhancedContext);
    }
    return this.enhancedEngine.getEnhancedCompletions(context);
  }

  /**
   * Record command usage for history-based completions
   */
  recordCommandUsage(command: string): void {
    this.enhancedEngine.recordCommandUsage(command);
  }

  /**
   * Get completion statistics
   */
  getCompletionStats(): { historySize: number; cacheSize: number } {
    return this.enhancedEngine.getStats();
  }

  /**
   * Clear file cache
   */
  clearFileCache(): void {
    this.enhancedEngine.clearFileCache();
  }

  /**
   * Get completions for the current input (legacy method)
   */
  async getCompletions(context: CompletionContext): Promise<CompletionResult> {
    const { line, cursor } = context;
    const beforeCursor = line.slice(0, cursor);
    const afterCursor = line.slice(cursor);

    // Parse the command line
    const tokens = this.parseCommandLine(beforeCursor);
    const currentToken = tokens[tokens.length - 1] || "";

    // Determine what type of completion we need
    if (tokens.length === 0 || (tokens.length === 1 && !beforeCursor.endsWith(" "))) {
      // Complete main command
      return this.completeCommand(currentToken, afterCursor);
    }

    const mainCommand = tokens[0];
    const commandInfo = this.commands.get(mainCommand);

    if (!commandInfo) {
      return { completions: [], prefix: currentToken, suffix: afterCursor };
    }

    // Check if we're completing an option value
    const lastToken = tokens[tokens.length - 2];
    if (lastToken && this.isOptionWithValue(lastToken, commandInfo)) {
      return this.completeOptionValue(lastToken, currentToken, afterCursor, context);
    }

    // Check if we're completing a subcommand
    if (commandInfo.subcommands.length > 0 && !currentToken.startsWith("-")) {
      const subcommandNames = commandInfo.subcommands.map((sc) => sc.name);
      const matches = subcommandNames.filter((name) => name.startsWith(currentToken));
      return { completions: matches, prefix: currentToken, suffix: afterCursor };
    }

    // Complete options
    return this.completeOptions(commandInfo, currentToken, afterCursor, tokens);
  }

  /**
   * Parse command line into tokens
   */
  private parseCommandLine(line: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let inQuotes = false;
    let quoteChar = "";

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false;
        quoteChar = "";
      } else if (!inQuotes && char === " ") {
        if (current) {
          tokens.push(current);
          current = "";
        }
      } else {
        current += char;
      }
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  }

  /**
   * Complete main command
   */
  private completeCommand(prefix: string, suffix: string): CompletionResult {
    const commandNames = Array.from(this.commands.keys());
    const matches = commandNames.filter((name) => name.startsWith(prefix));
    return { completions: matches, prefix, suffix };
  }

  /**
   * Complete command options
   */
  private completeOptions(
    commandInfo: CommandCompletion,
    prefix: string,
    suffix: string,
    existingTokens: string[]
  ): CompletionResult {
    const options = commandInfo.options
      .flatMap((opt) => [opt.name, ...(opt.alias ? [opt.alias] : [])])
      .filter((opt) => opt.startsWith(prefix))
      .filter((opt) => !existingTokens.includes(opt)); // Don't suggest already used options

    return { completions: options, prefix, suffix };
  }

  /**
   * Complete option values
   */
  private async completeOptionValue(
    option: string,
    prefix: string,
    suffix: string,
    context: CompletionContext
  ): Promise<CompletionResult> {
    switch (option) {
      case "--profile":
      case "-p":
        return this.completeProfile(prefix, suffix);

      case "--file":
      case "-f":
        return this.completeFilePath(prefix, suffix, context.workingDirectory);

      case "--directory":
      case "-d":
        return this.completeDirectoryPath(prefix, suffix, context.workingDirectory);

      default:
        return { completions: [], prefix, suffix };
    }
  }

  /**
   * Complete profile names
   */
  private async completeProfile(prefix: string, suffix: string): Promise<CompletionResult> {
    if (!this.configStore) {
      return { completions: [], prefix, suffix };
    }

    try {
      const config = await this.configStore.getConfig();
      const profileNames = Object.keys(config.llm.profiles);
      const matches = profileNames.filter((name) => name.startsWith(prefix));
      return { completions: matches, prefix, suffix };
    } catch (error) {
      return { completions: [], prefix, suffix };
    }
  }

  /**
   * Complete file paths
   */
  private async completeFilePath(
    prefix: string,
    suffix: string,
    workingDirectory: string
  ): Promise<CompletionResult> {
    return this.completePathInternal(prefix, suffix, workingDirectory, false);
  }

  /**
   * Complete directory paths
   */
  private async completeDirectoryPath(
    prefix: string,
    suffix: string,
    workingDirectory: string
  ): Promise<CompletionResult> {
    return this.completePathInternal(prefix, suffix, workingDirectory, true);
  }

  /**
   * Internal path completion logic
   */
  private async completePathInternal(
    prefix: string,
    suffix: string,
    workingDirectory: string,
    directoriesOnly: boolean
  ): Promise<CompletionResult> {
    try {
      const isAbsolute = prefix.startsWith("/");
      const basePath = isAbsolute ? "/" : workingDirectory;
      const searchPath = isAbsolute ? prefix : join(workingDirectory, prefix);
      const searchDir = dirname(searchPath);
      const searchBase = basename(searchPath);

      const entries = await readdir(searchDir);
      const matches: string[] = [];

      for (const entry of entries) {
        if (!entry.startsWith(searchBase)) continue;

        const fullPath = join(searchDir, entry);
        try {
          const stats = await stat(fullPath);
          if (directoriesOnly && !stats.isDirectory()) continue;

          const relativePath = isAbsolute ? fullPath : join(dirname(prefix), entry);
          matches.push(stats.isDirectory() ? relativePath + "/" : relativePath);
        } catch {
          // Skip entries we can't stat
        }
      }

      return { completions: matches, prefix, suffix };
    } catch (error) {
      return { completions: [], prefix, suffix };
    }
  }

  /**
   * Check if an option expects a value
   */
  private isOptionWithValue(option: string, commandInfo: CommandCompletion): boolean {
    return commandInfo.options.some(
      (opt) => (opt.name === option || opt.alias === option) && opt.hasValue
    );
  }
}

// Type definitions
interface CommandCompletion {
  description: string;
  options: OptionCompletion[];
  subcommands: SubcommandCompletion[];
}

interface OptionCompletion {
  name: string;
  alias?: string;
  hasValue: boolean;
  description: string;
}

interface SubcommandCompletion {
  name: string;
  description: string;
}

// Export singleton instance
export const completionEngine = new CompletionEngine();
