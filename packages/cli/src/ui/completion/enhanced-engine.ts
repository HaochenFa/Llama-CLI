/**
 * Enhanced Completion Engine for LlamaCLI
 * Provides advanced completion features like fuzzy matching, context awareness, and history
 */

import * as fs from "fs/promises";
import * as path from "path";
import { CompletionContext, CompletionResult } from "../completion.js";

export interface CompletionItem {
  text: string;
  description?: string;
  type: "command" | "option" | "file" | "directory" | "profile" | "history" | "slash-command";
  priority: number;
  frequency?: number;
  lastUsed?: number;
  fuzzyScore?: number;
}

export interface HistoryEntry {
  command: string;
  timestamp: number;
  frequency: number;
}

export class EnhancedCompletionEngine {
  private commandHistory: Map<string, HistoryEntry> = new Map();
  private fileCache: Map<string, { files: string[]; timestamp: number }> = new Map();
  private cacheTimeout = 5000; // 5 seconds

  /**
   * Get enhanced completions with fuzzy matching and context awareness
   */
  async getEnhancedCompletions(context: CompletionContext): Promise<CompletionResult> {
    const { line, cursor } = context;
    const beforeCursor = line.substring(0, cursor);
    const words = beforeCursor.split(/\s+/);
    const currentWord = words[words.length - 1] || "";

    let completions: CompletionItem[] = [];

    // Determine completion type based on context
    if (beforeCursor.startsWith("/")) {
      // Slash command completion
      completions = await this.getSlashCommandCompletions(currentWord);
    } else if (beforeCursor.includes("@")) {
      // File reference completion
      completions = await this.getFileReferenceCompletions(currentWord, context);
    } else if (words.length === 1) {
      // Main command completion
      completions = await this.getMainCommandCompletions(currentWord);
    } else {
      // Option and parameter completion
      completions = await this.getOptionCompletions(words, currentWord, context);
    }

    // Apply fuzzy matching
    if (currentWord) {
      completions = this.applyFuzzyMatching(completions, currentWord);
    }

    // Sort by priority and relevance
    completions = this.sortCompletions(completions);

    // Convert to legacy format
    const legacyCompletions = completions.map((item) => item.text);
    const prefix = this.getCompletionPrefix(beforeCursor, currentWord);

    return {
      completions: legacyCompletions,
      prefix,
      suffix: "",
    };
  }

  /**
   * Get slash command completions
   */
  private async getSlashCommandCompletions(partial: string): Promise<CompletionItem[]> {
    const slashCommands = [
      { name: "help", description: "Show help information" },
      { name: "theme", description: "Manage CLI themes" },
      { name: "config", description: "Manage LLM configurations" },
      { name: "status", description: "Show system status" },
      { name: "clear", description: "Clear the screen" },
      { name: "exit", description: "Exit the CLI" },
    ];

    return slashCommands.map((cmd) => ({
      text: `/${cmd.name}`,
      description: cmd.description,
      type: "slash-command" as const,
      priority: 10,
    }));
  }

  /**
   * Get file reference completions
   */
  private async getFileReferenceCompletions(
    partial: string,
    context: CompletionContext
  ): Promise<CompletionItem[]> {
    const atIndex = partial.lastIndexOf("@");
    if (atIndex === -1) return [];

    const pathPart = partial.substring(atIndex + 1);
    const files = await this.getFileCompletions(pathPart, context.workingDirectory);

    return files.map((file) => ({
      text: `@${file}`,
      type: file.endsWith("/") ? "directory" : ("file" as const),
      priority: file.endsWith("/") ? 8 : 9,
    }));
  }

  /**
   * Get main command completions
   */
  private async getMainCommandCompletions(partial: string): Promise<CompletionItem[]> {
    const commands = [
      { name: "chat", description: "Start or continue a chat session" },
      { name: "get", description: "Quick query without session" },
      { name: "config", description: "Manage configuration" },
      { name: "session", description: "Manage chat sessions" },
      { name: "preferences", description: "Manage user preferences" },
    ];

    const completions: CompletionItem[] = [];

    // Add regular commands
    for (const cmd of commands) {
      completions.push({
        text: cmd.name,
        description: cmd.description,
        type: "command",
        priority: 10,
      });
    }

    // Add history-based completions
    const historyCompletions = this.getHistoryCompletions(partial);
    completions.push(...historyCompletions);

    return completions;
  }

  /**
   * Get option completions based on current command
   */
  private async getOptionCompletions(
    words: string[],
    partial: string,
    context: CompletionContext
  ): Promise<CompletionItem[]> {
    const command = words[0];
    const completions: CompletionItem[] = [];

    switch (command) {
      case "chat":
        completions.push(
          { text: "--profile", description: "Select LLM profile", type: "option", priority: 9 },
          { text: "--file", description: "Include file in context", type: "option", priority: 8 },
          {
            text: "--directory",
            description: "Set working directory",
            type: "option",
            priority: 7,
          },
          { text: "--no-tools", description: "Disable tool usage", type: "option", priority: 6 }
        );
        break;

      case "get":
        completions.push(
          { text: "--profile", description: "Select LLM profile", type: "option", priority: 9 },
          { text: "--format", description: "Output format", type: "option", priority: 8 },
          { text: "--output", description: "Output file", type: "option", priority: 7 }
        );
        break;

      case "config":
        completions.push(
          { text: "list", description: "List all profiles", type: "command", priority: 10 },
          { text: "add", description: "Add new profile", type: "command", priority: 9 },
          { text: "remove", description: "Remove profile", type: "command", priority: 8 },
          { text: "use", description: "Switch to profile", type: "command", priority: 9 }
        );
        break;
    }

    // Add profile completions for --profile option
    if (words.includes("--profile") && words[words.length - 2] === "--profile") {
      const profiles = await this.getProfileCompletions(context);
      completions.push(...profiles);
    }

    return completions;
  }

  /**
   * Get profile completions
   */
  private async getProfileCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    if (!context.configStore) return [];

    try {
      // Use getAllProfiles method instead of listProfiles
      const profiles = await context.configStore.getAllProfiles();
      return profiles.map((profile: any) => ({
        text: profile.name,
        description: `${profile.provider} - ${profile.model || "default"}`,
        type: "profile" as const,
        priority: 10,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get file completions with caching
   */
  private async getFileCompletions(
    partialPath: string,
    workingDirectory: string
  ): Promise<string[]> {
    const dirPath = path.dirname(partialPath === "" ? "." : partialPath);
    const baseName = path.basename(partialPath);
    const fullDirPath = path.resolve(workingDirectory, dirPath);

    // Check cache
    const cacheKey = fullDirPath;
    const cached = this.fileCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return this.filterFiles(cached.files, baseName, dirPath);
    }

    try {
      const entries = await fs.readdir(fullDirPath, { withFileTypes: true });
      const files = entries.map((entry) => {
        const name = entry.name;
        if (entry.isDirectory()) {
          return dirPath === "." ? `${name}/` : `${dirPath}/${name}/`;
        } else {
          return dirPath === "." ? name : `${dirPath}/${name}`;
        }
      });

      // Cache the results
      this.fileCache.set(cacheKey, { files, timestamp: Date.now() });

      return this.filterFiles(files, baseName, dirPath);
    } catch {
      return [];
    }
  }

  /**
   * Filter files based on partial match
   */
  private filterFiles(files: string[], baseName: string, dirPath: string): string[] {
    if (!baseName) return files;

    return files.filter((file) => {
      const fileName = path.basename(file);
      return fileName.toLowerCase().startsWith(baseName.toLowerCase());
    });
  }

  /**
   * Get history-based completions
   */
  private getHistoryCompletions(partial: string): CompletionItem[] {
    const historyItems: CompletionItem[] = [];

    for (const [command, entry] of this.commandHistory) {
      if (command.toLowerCase().includes(partial.toLowerCase())) {
        const recency = Date.now() - entry.timestamp;
        const recencyScore = Math.max(0, 10 - recency / (24 * 60 * 60 * 1000)); // Decay over days

        historyItems.push({
          text: command,
          type: "history",
          priority: 5 + recencyScore,
          frequency: entry.frequency,
          lastUsed: entry.timestamp,
        });
      }
    }

    return historyItems;
  }

  /**
   * Apply fuzzy matching to completions
   */
  private applyFuzzyMatching(completions: CompletionItem[], query: string): CompletionItem[] {
    if (!query) return completions;

    const queryLower = query.toLowerCase();

    return completions
      .map((item) => {
        const textLower = item.text.toLowerCase();
        let score = 0;

        // Exact match gets highest score
        if (textLower === queryLower) {
          score = 100;
        }
        // Starts with gets high score
        else if (textLower.startsWith(queryLower)) {
          score = 90;
        }
        // Contains gets medium score
        else if (textLower.includes(queryLower)) {
          score = 70;
        }
        // Fuzzy match gets lower score
        else {
          score = this.calculateFuzzyScore(textLower, queryLower);
        }

        return { ...item, fuzzyScore: score };
      })
      .filter((item) => item.fuzzyScore! > 30); // Filter out low-scoring matches
  }

  /**
   * Calculate fuzzy matching score
   */
  private calculateFuzzyScore(text: string, query: string): number {
    let score = 0;
    let queryIndex = 0;

    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
      if (text[i] === query[queryIndex]) {
        score += 10;
        queryIndex++;
      }
    }

    // Bonus for completing the query
    if (queryIndex === query.length) {
      score += 20;
    }

    return score;
  }

  /**
   * Sort completions by priority and relevance
   */
  private sortCompletions(completions: CompletionItem[]): CompletionItem[] {
    return completions.sort((a, b) => {
      // Primary sort: fuzzy score (if available)
      if (a.fuzzyScore !== undefined && b.fuzzyScore !== undefined) {
        if (a.fuzzyScore !== b.fuzzyScore) {
          return b.fuzzyScore - a.fuzzyScore;
        }
      }

      // Secondary sort: priority
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      // Tertiary sort: frequency (for history items)
      if (a.frequency !== undefined && b.frequency !== undefined) {
        return b.frequency - a.frequency;
      }

      // Final sort: alphabetical
      return a.text.localeCompare(b.text);
    });
  }

  /**
   * Get completion prefix for replacement
   */
  private getCompletionPrefix(beforeCursor: string, currentWord: string): string {
    if (beforeCursor.endsWith(currentWord)) {
      return beforeCursor.substring(0, beforeCursor.length - currentWord.length);
    }
    return beforeCursor;
  }

  /**
   * Record command usage for history
   */
  recordCommandUsage(command: string): void {
    const existing = this.commandHistory.get(command);
    if (existing) {
      existing.frequency++;
      existing.timestamp = Date.now();
    } else {
      this.commandHistory.set(command, {
        command,
        timestamp: Date.now(),
        frequency: 1,
      });
    }

    // Limit history size
    if (this.commandHistory.size > 1000) {
      const oldest = Array.from(this.commandHistory.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      )[0];
      this.commandHistory.delete(oldest[0]);
    }
  }

  /**
   * Clear file cache
   */
  clearFileCache(): void {
    this.fileCache.clear();
  }

  /**
   * Get completion statistics
   */
  getStats(): { historySize: number; cacheSize: number } {
    return {
      historySize: this.commandHistory.size,
      cacheSize: this.fileCache.size,
    };
  }
}
