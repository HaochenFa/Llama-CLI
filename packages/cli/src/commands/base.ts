/**
 * Base command class for LlamaCLI
 */

import { Command } from "commander";
import { LlamaCLIConfig, loadConfig, validateConfig } from "@llamacli/core";
import { CLIContext } from "../types/cli.js";
import { Logger } from "../utils/logger.js";
import { ErrorHandler } from "../utils/error-handler.js";

/**
 * Command options interface
 */
export interface BaseCommandOptions {
  config?: string;
  verbose?: boolean;
  quiet?: boolean;
  profile?: string;
  workingDir?: string;
}

/**
 * Base command class
 */
export abstract class BaseCommand {
  protected command: Command;
  protected config: LlamaCLIConfig | null = null;
  protected context: CLIContext | null = null;
  protected logger: Logger;
  protected errorHandler: ErrorHandler;

  constructor(name: string, description: string) {
    this.command = new Command(name);
    this.command.description(description);
    this.logger = new Logger();
    this.errorHandler = new ErrorHandler(this.logger);

    this.setupBaseOptions();
    this.setupCommand();
  }

  /**
   * Get the commander command instance
   */
  getCommand(): Command {
    return this.command;
  }

  /**
   * Setup base options available to all commands
   */
  private setupBaseOptions(): void {
    this.command
      .option("-c, --config <path>", "path to configuration file")
      .option("-v, --verbose", "enable verbose output")
      .option("-q, --quiet", "suppress output")
      .option("-p, --profile <name>", "LLM profile to use")
      .option("-w, --working-dir <path>", "working directory", process.cwd());
  }

  /**
   * Setup command-specific options and behavior
   */
  protected abstract setupCommand(): void;

  /**
   * Execute the command
   */
  protected abstract execute(options: BaseCommandOptions, ...args: any[]): Promise<void>;

  /**
   * Initialize command context
   */
  protected async initializeContext(options: BaseCommandOptions): Promise<void> {
    try {
      // Setup logger
      if (options.verbose) {
        this.logger.setLevel("debug");
      } else if (options.quiet) {
        this.logger.setLevel("error");
      }

      // Load configuration
      this.config = await loadConfig(options.config);

      // Validate configuration
      const validation = validateConfig(this.config);
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(", ")}`);
      }

      // Show warnings
      if (validation.warnings.length > 0) {
        for (const warning of validation.warnings) {
          this.logger.warn(
            typeof warning === "string" ? warning : warning.message || "Configuration warning"
          );
        }
      }

      // Override profile if specified
      if (options.profile && this.config?.llm?.profiles) {
        const profile = this.config.llm.profiles.find((p) => p.name === options.profile);
        if (!profile) {
          throw new Error(`Profile not found: ${options.profile}`);
        }
        this.config.llm.defaultProfile = profile.id;
      }

      // Create CLI context
      this.context = {
        config: this.config,
        workingDirectory: options.workingDir || process.cwd(),
        logger: this.logger,
        errorHandler: this.errorHandler,
        startTime: Date.now(),
      };

      const defaultProfile = this.config?.llm?.profiles?.find(
        (p) => p.id === this.config?.llm?.defaultProfile
      );
      this.logger.debug("Command context initialized", {
        config: options.config,
        profile: defaultProfile?.name || "default",
        workingDir: this.context?.workingDirectory || process.cwd(),
      });
    } catch (error) {
      await this.errorHandler.handle(error);
      process.exit(1);
    }
  }

  /**
   * Cleanup resources
   */
  protected async cleanup(): Promise<void> {
    // Override in subclasses if needed
  }

  /**
   * Handle command execution with error handling
   */
  protected createHandler(handler: (options: BaseCommandOptions, ...args: any[]) => Promise<void>) {
    return async (options: BaseCommandOptions, ...args: any[]) => {
      try {
        await this.initializeContext(options);
        await handler.call(this, options, ...args);
      } catch (error) {
        await this.errorHandler.handle(error);
        process.exit(1);
      } finally {
        await this.cleanup();
      }
    };
  }

  /**
   * Validate required options
   */
  protected validateOptions(
    options: BaseCommandOptions,
    required: (keyof BaseCommandOptions)[]
  ): void {
    for (const key of required) {
      if (!options[key]) {
        throw new Error(
          `Required option missing: --${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`
        );
      }
    }
  }

  /**
   * Get configuration value with fallback
   */
  protected getConfigValue<T>(path: string, defaultValue?: T): T {
    if (!this.config) {
      throw new Error("Configuration not loaded");
    }

    const keys = path.split(".");
    let current: any = this.config;

    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        throw new Error(`Configuration value not found: ${path}`);
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Check if running in CI environment
   */
  protected isCI(): boolean {
    return !!(process.env.CI || process.env.CONTINUOUS_INTEGRATION);
  }

  /**
   * Check if TTY is available
   */
  protected isTTY(): boolean {
    return !!(process.stdout.isTTY && process.stdin.isTTY);
  }

  /**
   * Get terminal width
   */
  protected getTerminalWidth(): number {
    return process.stdout.columns || 80;
  }

  /**
   * Format duration in human-readable format
   */
  protected formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Format file size in human-readable format
   */
  protected formatSize(bytes: number): string {
    if (bytes === 0) return "0 B";

    const units = ["B", "KB", "MB", "GB", "TB"];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
  }

  /**
   * Show progress indicator
   */
  protected showProgress(message: string): () => void {
    if (this.logger.getLevel() >= 3 || this.isCI() || !this.isTTY()) {
      // LogLevel.ERROR = 3
      this.logger.info(message);
      return () => {}; // No-op cleanup
    }

    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let i = 0;

    const interval = setInterval(() => {
      process.stdout.write(`\r${frames[i]} ${message}`);
      i = (i + 1) % frames.length;
    }, 100);

    return () => {
      clearInterval(interval);
      process.stdout.write("\r\x1b[K"); // Clear line
    };
  }

  /**
   * Confirm action with user
   */
  protected async confirm(message: string, defaultValue: boolean = false): Promise<boolean> {
    if (this.isCI() || !this.isTTY()) {
      return defaultValue;
    }

    const { default: inquirer } = await import("inquirer");
    const { confirmed } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmed",
        message,
        default: defaultValue,
      },
    ]);

    return confirmed;
  }

  /**
   * Prompt for input
   */
  protected async prompt(message: string, defaultValue?: string): Promise<string> {
    if (this.isCI() || !this.isTTY()) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error("Cannot prompt for input in non-interactive environment");
    }

    const { default: inquirer } = await import("inquirer");
    const { value } = await inquirer.prompt([
      {
        type: "input",
        name: "value",
        message,
        default: defaultValue,
      },
    ]);

    return value;
  }

  /**
   * Select from options
   */
  protected async select<T extends string>(
    message: string,
    choices: T[],
    defaultValue?: T
  ): Promise<T> {
    if (this.isCI() || !this.isTTY()) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error("Cannot prompt for selection in non-interactive environment");
    }

    const { default: inquirer } = await import("inquirer");
    const { selected } = await inquirer.prompt([
      {
        type: "list",
        name: "selected",
        message,
        choices,
        default: defaultValue,
      },
    ]);

    return selected;
  }
}
