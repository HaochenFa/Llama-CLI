/**
 * Interactive CLI Interface for LlamaCLI
 * Provides enhanced command-line interaction with auto-completion, syntax highlighting, and themes
 */

import readline from "readline";
import { EventEmitter } from "events";
import { ConfigStore, userPreferencesManager, UserPreferencesManager } from "@llamacli/core";
import { completionEngine, CompletionContext } from "./completion.js";
import { syntaxHighlighter } from "./syntax-highlighting.js";
import { themeManager } from "./theme-manager.js";

export interface InteractiveCLIOptions {
  configStore?: ConfigStore;
  workingDirectory?: string;
  prompt?: string;
  enableCompletion?: boolean;
  enableSyntaxHighlighting?: boolean;
  theme?: string;
}

export interface CLICommand {
  command: string;
  args: string[];
  raw: string;
}

export class InteractiveCLI extends EventEmitter {
  private rl: readline.Interface;
  private configStore?: ConfigStore;
  private preferencesManager: UserPreferencesManager;
  private workingDirectory: string;
  private promptText: string;
  private enableCompletion: boolean;
  private enableSyntaxHighlighting: boolean;
  private commandHistory: string[] = [];
  private isActive: boolean = false;

  constructor(options: InteractiveCLIOptions = {}) {
    super();

    this.configStore = options.configStore;
    this.preferencesManager = userPreferencesManager;
    this.workingDirectory = options.workingDirectory || process.cwd();
    this.promptText = options.prompt || "llamacli> ";
    this.enableCompletion = options.enableCompletion !== false;
    this.enableSyntaxHighlighting = options.enableSyntaxHighlighting !== false;

    // Initialize theme
    if (options.theme) {
      themeManager.setTheme(options.theme);
    }

    // Initialize completion engine
    if (this.configStore) {
      completionEngine.configStore = this.configStore;
    }

    // Create readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      completer: this.enableCompletion ? this.completer.bind(this) : undefined,
      history: this.commandHistory,
      historySize: 1000,
      removeHistoryDuplicates: true,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.rl.on("line", (input) => {
      const trimmed = input.trim();
      if (trimmed) {
        this.commandHistory.push(trimmed);
        const command = this.parseCommand(trimmed);
        this.emit("command", command);
      } else {
        this.showPrompt();
      }
    });

    this.rl.on("close", () => {
      this.isActive = false;
      this.emit("exit");
    });

    this.rl.on("SIGINT", () => {
      this.rl.write("\n");
      this.showPrompt();
    });

    // Handle special key combinations
    process.stdin.on("keypress", (str, key) => {
      if (!key) return;

      // Ctrl+L to clear screen
      if (key.ctrl && key.name === "l") {
        console.clear();
        this.showPrompt();
      }

      // Ctrl+D to exit
      if (key.ctrl && key.name === "d") {
        this.close();
      }
    });
  }

  /**
   * Auto-completion function
   */
  private async completer(line: string): Promise<[string[], string]> {
    try {
      const context: CompletionContext = {
        line,
        cursor: line.length,
        workingDirectory: this.workingDirectory,
        configStore: this.configStore,
      };

      const result = await completionEngine.getCompletions(context);
      return [result.completions, result.prefix];
    } catch (error) {
      // Return empty completions on error
      return [[], line];
    }
  }

  /**
   * Parse command line into structured command
   */
  private parseCommand(input: string): CLICommand {
    const parts = input.split(/\s+/);
    const command = parts[0] || "";
    const args = parts.slice(1);

    return {
      command,
      args,
      raw: input,
    };
  }

  /**
   * Start the interactive CLI
   */
  async start(): Promise<void> {
    if (this.isActive) return;

    this.isActive = true;
    await this.loadUserPreferences();
    this.showWelcome();
    this.showPrompt();
  }

  /**
   * Load user preferences and apply settings
   */
  private async loadUserPreferences(): Promise<void> {
    try {
      await this.preferencesManager.initialize();
      const cliPrefs = this.preferencesManager.getCLIPreferences();

      // Apply CLI preferences
      this.promptText = cliPrefs.prompt;
      this.enableCompletion = cliPrefs.autoComplete;
      this.enableSyntaxHighlighting = cliPrefs.syntaxHighlighting;

      // Load command history if enabled
      const historyPrefs = this.preferencesManager.getHistoryPreferences();
      if (historyPrefs.enabled && historyPrefs.persistAcrossSessions) {
        await this.loadCommandHistory();
      }
    } catch (error) {
      console.debug("Failed to load user preferences:", error);
    }
  }

  /**
   * Close the interactive CLI
   */
  async close(): Promise<void> {
    if (!this.isActive) return;

    this.isActive = false;

    // Save command history if enabled
    const historyPrefs = this.preferencesManager.getHistoryPreferences();
    if (historyPrefs.enabled && historyPrefs.persistAcrossSessions) {
      await this.saveCommandHistory();
    }

    this.rl.close();
  }

  /**
   * Show welcome message
   */
  private showWelcome(): void {
    const theme = themeManager.getCurrentTheme();
    const banner = themeManager.createBanner(
      "LlamaCLI",
      "AI-powered command line development partner"
    );

    console.log(banner);
    console.log(theme.styles.muted('Type "help" for available commands, or start chatting!\n'));
  }

  /**
   * Show command prompt
   */
  showPrompt(): void {
    if (!this.isActive) return;

    const theme = themeManager.getCurrentTheme();
    const styledPrompt = theme.styles.prompt(this.promptText);
    this.rl.setPrompt(styledPrompt);
    this.rl.prompt();
  }

  /**
   * Display a message
   */
  displayMessage(message: string, type: "info" | "success" | "warning" | "error" = "info"): void {
    const theme = themeManager.getCurrentTheme();
    const styledMessage = theme.styles[type](message);
    console.log(styledMessage);
  }

  /**
   * Display a code block with syntax highlighting
   */
  displayCode(code: string, language?: string, title?: string): void {
    if (this.enableSyntaxHighlighting) {
      const highlighted = syntaxHighlighter.formatCodeBlock(code, language, title);
      console.log(highlighted);
    } else {
      console.log(code);
    }
  }

  /**
   * Display a table
   */
  displayTable(headers: string[], rows: string[][]): void {
    const table = themeManager.createTable(headers, rows);
    console.log(table);
  }

  /**
   * Display a list
   */
  displayList(
    items: Array<{ text: string; type?: "info" | "success" | "warning" | "error" }>
  ): void {
    for (const item of items) {
      const listItem = themeManager.createListItem(item.text, item.type);
      console.log(listItem);
    }
  }

  /**
   * Display a progress bar
   */
  displayProgress(current: number, total: number, label?: string): void {
    const progressBar = themeManager.createProgressBar(current, total);
    const output = label ? `${label}: ${progressBar}` : progressBar;

    // Use carriage return to update in place
    process.stdout.write(`\r${output}`);

    if (current >= total) {
      process.stdout.write("\n");
    }
  }

  /**
   * Clear the screen
   */
  clearScreen(): void {
    console.clear();
  }

  /**
   * Set working directory
   */
  setWorkingDirectory(directory: string): void {
    this.workingDirectory = directory;
  }

  /**
   * Get working directory
   */
  getWorkingDirectory(): string {
    return this.workingDirectory;
  }

  /**
   * Set prompt text
   */
  setPrompt(prompt: string): void {
    this.promptText = prompt;
  }

  /**
   * Get command history
   */
  getHistory(): string[] {
    return [...this.commandHistory];
  }

  /**
   * Clear command history
   */
  clearHistory(): void {
    this.commandHistory = [];
    (this.rl as any).history = [];
  }

  /**
   * Enable/disable auto-completion
   */
  setCompletionEnabled(enabled: boolean): void {
    this.enableCompletion = enabled;
    // Note: readline interface needs to be recreated to change completer
  }

  /**
   * Enable/disable syntax highlighting
   */
  setSyntaxHighlightingEnabled(enabled: boolean): void {
    this.enableSyntaxHighlighting = enabled;
  }

  /**
   * Set theme
   */
  async setTheme(themeName: string): Promise<boolean> {
    return await themeManager.setTheme(themeName);
  }

  /**
   * Get available themes
   */
  getAvailableThemes(): string[] {
    return themeManager.getAvailableThemes().map((theme) => theme.name);
  }

  /**
   * Show help information
   */
  showHelp(): void {
    const theme = themeManager.getCurrentTheme();

    console.log(themeManager.createSectionHeader("Available Commands"));
    console.log();

    const commands = [
      { command: "chat", description: "Start an interactive chat session" },
      { command: "get <query>", description: "Quick query without interactive session" },
      { command: "config list", description: "List all profiles" },
      { command: "config add <name>", description: "Add a new profile" },
      { command: "config use <name>", description: "Set active profile" },
      { command: "session list", description: "List all sessions" },
      { command: "session show <id>", description: "Show session details" },
      { command: "help", description: "Show this help message" },
      { command: "exit", description: "Exit the CLI" },
    ];

    for (const cmd of commands) {
      console.log(`  ${theme.styles.highlight(cmd.command.padEnd(20))} ${cmd.description}`);
    }

    console.log();
    console.log(theme.styles.muted("Keyboard shortcuts:"));
    console.log(theme.styles.muted("  Ctrl+L  Clear screen"));
    console.log(theme.styles.muted("  Ctrl+D  Exit"));
    console.log(theme.styles.muted("  Tab     Auto-complete"));
    console.log(theme.styles.muted("  ↑/↓     Command history"));
    console.log();
  }

  /**
   * Check if CLI is active
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Load command history from persistent storage
   */
  private async loadCommandHistory(): Promise<void> {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const os = await import("os");

      const historyPath = path.join(os.homedir(), ".llamacli", "history.json");
      const data = await fs.readFile(historyPath, "utf8");
      const history = JSON.parse(data) as string[];

      const historyPrefs = this.preferencesManager.getHistoryPreferences();

      // Filter out excluded patterns
      const filteredHistory = history.filter((cmd) => {
        return !historyPrefs.excludePatterns.some((pattern) =>
          cmd.toLowerCase().includes(pattern.toLowerCase())
        );
      });

      // Apply max entries limit
      const limitedHistory = filteredHistory.slice(-historyPrefs.maxEntries);

      this.commandHistory = limitedHistory;
      (this.rl as any).history = [...limitedHistory].reverse(); // readline expects reverse order
    } catch (error) {
      // History file doesn't exist or is corrupted, start with empty history
      this.commandHistory = [];
    }
  }

  /**
   * Save command history to persistent storage
   */
  private async saveCommandHistory(): Promise<void> {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const os = await import("os");

      const dataDir = path.join(os.homedir(), ".llamacli");
      const historyPath = path.join(dataDir, "history.json");

      // Ensure directory exists
      try {
        await fs.access(dataDir);
      } catch {
        await fs.mkdir(dataDir, { recursive: true });
      }

      const historyPrefs = this.preferencesManager.getHistoryPreferences();

      // Filter and limit history
      let historyToSave = [...this.commandHistory];

      // Remove excluded patterns
      historyToSave = historyToSave.filter((cmd) => {
        return !historyPrefs.excludePatterns.some((pattern) =>
          cmd.toLowerCase().includes(pattern.toLowerCase())
        );
      });

      // Handle duplicates
      if (historyPrefs.duplicateHandling === "remove") {
        historyToSave = [...new Set(historyToSave)];
      } else if (historyPrefs.duplicateHandling === "moveToEnd") {
        const unique = new Map();
        historyToSave.forEach((cmd) => unique.set(cmd, cmd));
        historyToSave = Array.from(unique.values());
      }

      // Apply max entries limit
      historyToSave = historyToSave.slice(-historyPrefs.maxEntries);

      await fs.writeFile(historyPath, JSON.stringify(historyToSave, null, 2), "utf8");
    } catch (error) {
      console.debug("Failed to save command history:", error);
    }
  }
}

export default InteractiveCLI;
