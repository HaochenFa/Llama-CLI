/**
 * Enhanced Error Handler for LlamaCLI
 * Provides user-friendly error messages, recovery suggestions, and debugging information
 */

import { userPreferencesManager } from "../config/user-preferences.js";

export interface ErrorContext {
  command?: string;
  operation?: string;
  userInput?: string;
  sessionId?: string;
  timestamp?: number;
  environment?: Record<string, any>;
}

export interface ErrorSuggestion {
  action: string;
  description: string;
  command?: string;
  priority: "high" | "medium" | "low";
}

export interface EnhancedError {
  type: ErrorType;
  code: string;
  message: string;
  userMessage: string;
  suggestions: ErrorSuggestion[];
  context?: ErrorContext;
  originalError?: Error;
  debugInfo?: Record<string, any>;
  recoverable: boolean;
  reportable: boolean;
}

export enum ErrorType {
  NETWORK = "network",
  AUTHENTICATION = "authentication",
  CONFIGURATION = "configuration",
  VALIDATION = "validation",
  PERMISSION = "permission",
  RESOURCE = "resource",
  API = "api",
  INTERNAL = "internal",
  USER_INPUT = "user_input",
  SYSTEM = "system",
}

export class EnhancedErrorHandler {
  private static instance: EnhancedErrorHandler;
  private errorPatterns: Map<RegExp, ErrorType> = new Map();
  private errorHandlers: Map<ErrorType, (error: any, context?: ErrorContext) => EnhancedError> =
    new Map();

  constructor() {
    this.initializeErrorPatterns();
    this.initializeErrorHandlers();
  }

  static getInstance(): EnhancedErrorHandler {
    if (!EnhancedErrorHandler.instance) {
      EnhancedErrorHandler.instance = new EnhancedErrorHandler();
    }
    return EnhancedErrorHandler.instance;
  }

  /**
   * Initialize error pattern recognition
   */
  private initializeErrorPatterns(): void {
    // Network errors
    this.errorPatterns.set(
      /network|fetch|connection|timeout|ENOTFOUND|ECONNREFUSED/i,
      ErrorType.NETWORK
    );

    // Authentication errors
    this.errorPatterns.set(
      /auth|unauthorized|forbidden|401|403|invalid.*key|token/i,
      ErrorType.AUTHENTICATION
    );

    // Configuration errors
    this.errorPatterns.set(/config|setting|profile|not.*found.*profile/i, ErrorType.CONFIGURATION);

    // Validation errors
    this.errorPatterns.set(/invalid|validation|required|missing|format/i, ErrorType.VALIDATION);

    // Permission errors
    this.errorPatterns.set(/permission|access.*denied|EACCES|EPERM/i, ErrorType.PERMISSION);

    // Resource errors
    this.errorPatterns.set(
      /not.*found|ENOENT|file.*not.*exist|directory.*not.*exist/i,
      ErrorType.RESOURCE
    );

    // API errors
    this.errorPatterns.set(/api|quota|rate.*limit|429|500|502|503|504/i, ErrorType.API);
  }

  /**
   * Initialize error type handlers
   */
  private initializeErrorHandlers(): void {
    this.errorHandlers.set(ErrorType.NETWORK, this.handleNetworkError.bind(this));
    this.errorHandlers.set(ErrorType.AUTHENTICATION, this.handleAuthError.bind(this));
    this.errorHandlers.set(ErrorType.CONFIGURATION, this.handleConfigError.bind(this));
    this.errorHandlers.set(ErrorType.VALIDATION, this.handleValidationError.bind(this));
    this.errorHandlers.set(ErrorType.PERMISSION, this.handlePermissionError.bind(this));
    this.errorHandlers.set(ErrorType.RESOURCE, this.handleResourceError.bind(this));
    this.errorHandlers.set(ErrorType.API, this.handleApiError.bind(this));
    this.errorHandlers.set(ErrorType.INTERNAL, this.handleInternalError.bind(this));
    this.errorHandlers.set(ErrorType.USER_INPUT, this.handleUserInputError.bind(this));
    this.errorHandlers.set(ErrorType.SYSTEM, this.handleSystemError.bind(this));
  }

  /**
   * Process and enhance an error
   */
  processError(error: unknown, context?: ErrorContext): EnhancedError {
    const errorType = this.classifyError(error);
    const handler = this.errorHandlers.get(errorType) || this.handleInternalError.bind(this);

    const enhancedError = handler(error, context);
    enhancedError.context = { ...context, timestamp: Date.now() };

    return enhancedError;
  }

  /**
   * Classify error type based on patterns
   */
  private classifyError(error: unknown): ErrorType {
    const message = this.extractErrorMessage(error);

    for (const [pattern, type] of this.errorPatterns) {
      if (pattern.test(message)) {
        return type;
      }
    }

    return ErrorType.INTERNAL;
  }

  /**
   * Extract error message from various error types
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    if (error && typeof error === "object" && "message" in error) {
      return String(error.message);
    }
    return "Unknown error";
  }

  /**
   * Handle network errors
   */
  private handleNetworkError(error: any, context?: ErrorContext): EnhancedError {
    return {
      type: ErrorType.NETWORK,
      code: "NETWORK_ERROR",
      message: this.extractErrorMessage(error),
      userMessage: "Network connection failed. Please check your internet connection.",
      suggestions: [
        {
          action: "Check Internet Connection",
          description: "Verify that you have a stable internet connection",
          priority: "high",
        },
        {
          action: "Retry Operation",
          description: "Try the command again in a few moments",
          command: "Press ↑ and Enter to retry the last command",
          priority: "high",
        },
        {
          action: "Check Firewall",
          description: "Ensure your firewall is not blocking the connection",
          priority: "medium",
        },
        {
          action: "Use Different Network",
          description: "Try connecting from a different network if available",
          priority: "low",
        },
      ],
      originalError: error instanceof Error ? error : undefined,
      recoverable: true,
      reportable: false,
    };
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: any, context?: ErrorContext): EnhancedError {
    return {
      type: ErrorType.AUTHENTICATION,
      code: "AUTH_ERROR",
      message: this.extractErrorMessage(error),
      userMessage: "Authentication failed. Please check your credentials.",
      suggestions: [
        {
          action: "Check API Key",
          description: "Verify that your API key is correct and active",
          command: "llamacli config list",
          priority: "high",
        },
        {
          action: "Update Profile",
          description: "Update your LLM profile with correct credentials",
          command: "llamacli config add <profile-name>",
          priority: "high",
        },
        {
          action: "Check Permissions",
          description: "Ensure your API key has the necessary permissions",
          priority: "medium",
        },
        {
          action: "Contact Support",
          description: "Contact your LLM provider support if the issue persists",
          priority: "low",
        },
      ],
      originalError: error instanceof Error ? error : undefined,
      recoverable: true,
      reportable: false,
    };
  }

  /**
   * Handle configuration errors
   */
  private handleConfigError(error: any, context?: ErrorContext): EnhancedError {
    return {
      type: ErrorType.CONFIGURATION,
      code: "CONFIG_ERROR",
      message: this.extractErrorMessage(error),
      userMessage: "Configuration error. Please check your settings.",
      suggestions: [
        {
          action: "List Profiles",
          description: "Check available LLM profiles",
          command: "llamacli config list",
          priority: "high",
        },
        {
          action: "Create Profile",
          description: "Create a new LLM profile if none exist",
          command: "llamacli config add <profile-name>",
          priority: "high",
        },
        {
          action: "Reset Configuration",
          description: "Reset configuration to defaults if corrupted",
          command: "llamacli preferences reset --section cli",
          priority: "medium",
        },
        {
          action: "Check Documentation",
          description: "Review the configuration documentation",
          priority: "low",
        },
      ],
      originalError: error instanceof Error ? error : undefined,
      recoverable: true,
      reportable: false,
    };
  }

  /**
   * Handle validation errors
   */
  private handleValidationError(error: any, context?: ErrorContext): EnhancedError {
    return {
      type: ErrorType.VALIDATION,
      code: "VALIDATION_ERROR",
      message: this.extractErrorMessage(error),
      userMessage: "Invalid input. Please check your command and try again.",
      suggestions: [
        {
          action: "Check Command Syntax",
          description: "Verify the command syntax is correct",
          command: "llamacli --help",
          priority: "high",
        },
        {
          action: "Use Auto-completion",
          description: "Use Tab key for command auto-completion",
          priority: "high",
        },
        {
          action: "Check File Paths",
          description: "Ensure file paths exist and are accessible",
          priority: "medium",
        },
        {
          action: "Review Examples",
          description: "Check command examples in the documentation",
          priority: "low",
        },
      ],
      originalError: error instanceof Error ? error : undefined,
      recoverable: true,
      reportable: false,
    };
  }

  /**
   * Handle permission errors
   */
  private handlePermissionError(error: any, context?: ErrorContext): EnhancedError {
    return {
      type: ErrorType.PERMISSION,
      code: "PERMISSION_ERROR",
      message: this.extractErrorMessage(error),
      userMessage: "Permission denied. You may not have the required access.",
      suggestions: [
        {
          action: "Check File Permissions",
          description: "Ensure you have read/write access to the required files",
          priority: "high",
        },
        {
          action: "Run with Elevated Privileges",
          description: "Try running the command with sudo (if appropriate)",
          priority: "medium",
        },
        {
          action: "Change Directory",
          description: "Navigate to a directory you have access to",
          priority: "medium",
        },
        {
          action: "Contact Administrator",
          description: "Contact your system administrator for access",
          priority: "low",
        },
      ],
      originalError: error instanceof Error ? error : undefined,
      recoverable: true,
      reportable: false,
    };
  }

  /**
   * Handle resource errors
   */
  private handleResourceError(error: any, context?: ErrorContext): EnhancedError {
    return {
      type: ErrorType.RESOURCE,
      code: "RESOURCE_ERROR",
      message: this.extractErrorMessage(error),
      userMessage: "Resource not found. Please check the file or directory path.",
      suggestions: [
        {
          action: "Check Path",
          description: "Verify the file or directory path is correct",
          priority: "high",
        },
        {
          action: "Use Auto-completion",
          description: "Use Tab key to auto-complete file paths",
          priority: "high",
        },
        {
          action: "List Directory Contents",
          description: "Check what files are available in the current directory",
          command: "ls -la",
          priority: "medium",
        },
        {
          action: "Create Missing File",
          description: "Create the file if it should exist",
          priority: "low",
        },
      ],
      originalError: error instanceof Error ? error : undefined,
      recoverable: true,
      reportable: false,
    };
  }

  /**
   * Handle API errors
   */
  private handleApiError(error: any, context?: ErrorContext): EnhancedError {
    return {
      type: ErrorType.API,
      code: "API_ERROR",
      message: this.extractErrorMessage(error),
      userMessage: "API request failed. The service may be temporarily unavailable.",
      suggestions: [
        {
          action: "Retry Request",
          description: "Try the request again in a few moments",
          priority: "high",
        },
        {
          action: "Check API Status",
          description: "Check if the LLM service is experiencing issues",
          priority: "high",
        },
        {
          action: "Switch Model",
          description: "Try using a different LLM model",
          command: "llamacli config use <different-profile>",
          priority: "medium",
        },
        {
          action: "Check Quota",
          description: "Verify you have not exceeded your API quota",
          priority: "medium",
        },
      ],
      originalError: error instanceof Error ? error : undefined,
      recoverable: true,
      reportable: true,
    };
  }

  /**
   * Handle internal errors
   */
  private handleInternalError(error: any, context?: ErrorContext): EnhancedError {
    return {
      type: ErrorType.INTERNAL,
      code: "INTERNAL_ERROR",
      message: this.extractErrorMessage(error),
      userMessage: "An unexpected error occurred. This may be a bug in LlamaCLI.",
      suggestions: [
        {
          action: "Restart Application",
          description: "Try restarting LlamaCLI",
          priority: "high",
        },
        {
          action: "Check Debug Logs",
          description: "Enable debug mode for more information",
          command: "LLAMACLI_DEBUG=1 llamacli <your-command>",
          priority: "medium",
        },
        {
          action: "Report Bug",
          description: "Report this issue to the LlamaCLI developers",
          priority: "medium",
        },
        {
          action: "Update LlamaCLI",
          description: "Check if a newer version is available",
          priority: "low",
        },
      ],
      originalError: error instanceof Error ? error : undefined,
      debugInfo: {
        stack: error instanceof Error ? error.stack : undefined,
        nodeVersion: process.version,
        platform: process.platform,
      },
      recoverable: false,
      reportable: true,
    };
  }

  /**
   * Handle user input errors
   */
  private handleUserInputError(error: any, context?: ErrorContext): EnhancedError {
    return {
      type: ErrorType.USER_INPUT,
      code: "USER_INPUT_ERROR",
      message: this.extractErrorMessage(error),
      userMessage: "Invalid input provided. Please check your command.",
      suggestions: [
        {
          action: "Check Command Help",
          description: "View help for the specific command",
          command: "llamacli <command> --help",
          priority: "high",
        },
        {
          action: "Use Interactive Mode",
          description: "Try using interactive mode for guided input",
          command: "llamacli --interactive",
          priority: "high",
        },
        {
          action: "Check Examples",
          description: "Review command examples in the documentation",
          priority: "medium",
        },
      ],
      originalError: error instanceof Error ? error : undefined,
      recoverable: true,
      reportable: false,
    };
  }

  /**
   * Handle system errors
   */
  private handleSystemError(error: any, context?: ErrorContext): EnhancedError {
    return {
      type: ErrorType.SYSTEM,
      code: "SYSTEM_ERROR",
      message: this.extractErrorMessage(error),
      userMessage: "System error occurred. Please check your environment.",
      suggestions: [
        {
          action: "Check System Resources",
          description: "Ensure sufficient disk space and memory",
          priority: "high",
        },
        {
          action: "Check Node.js Version",
          description: "Verify Node.js version compatibility",
          command: "node --version",
          priority: "medium",
        },
        {
          action: "Restart Terminal",
          description: "Try restarting your terminal session",
          priority: "medium",
        },
        {
          action: "Check Environment Variables",
          description: "Verify required environment variables are set",
          priority: "low",
        },
      ],
      originalError: error instanceof Error ? error : undefined,
      recoverable: true,
      reportable: true,
    };
  }
}

/**
 * Error display and user interaction utilities
 */
export class ErrorDisplayManager {
  private static instance: ErrorDisplayManager;

  static getInstance(): ErrorDisplayManager {
    if (!ErrorDisplayManager.instance) {
      ErrorDisplayManager.instance = new ErrorDisplayManager();
    }
    return ErrorDisplayManager.instance;
  }

  /**
   * Display enhanced error with suggestions
   */
  async displayError(enhancedError: EnhancedError, interactive: boolean = false): Promise<void> {
    const chalk = await import("chalk");

    // Error header
    console.log();
    console.log(chalk.default.red.bold("❌ Error Occurred"));
    console.log(chalk.default.red("─".repeat(50)));

    // User-friendly message
    console.log(chalk.default.yellow("💬 " + enhancedError.userMessage));

    // Technical details (if debug mode)
    if (process.env.LLAMACLI_DEBUG || process.env.NODE_ENV === "development") {
      console.log();
      console.log(chalk.default.gray("🔍 Technical Details:"));
      console.log(chalk.default.gray(`   Type: ${enhancedError.type}`));
      console.log(chalk.default.gray(`   Code: ${enhancedError.code}`));
      console.log(chalk.default.gray(`   Message: ${enhancedError.message}`));

      if (enhancedError.context) {
        console.log(
          chalk.default.gray(`   Context: ${JSON.stringify(enhancedError.context, null, 2)}`)
        );
      }
    }

    // Suggestions
    if (enhancedError.suggestions.length > 0) {
      console.log();
      console.log(chalk.default.blue.bold("💡 Suggested Solutions:"));

      enhancedError.suggestions
        .sort((a, b) => this.getPriorityWeight(a.priority) - this.getPriorityWeight(b.priority))
        .forEach((suggestion, index) => {
          const priorityIcon = this.getPriorityIcon(suggestion.priority);
          console.log(chalk.default.blue(`   ${index + 1}. ${priorityIcon} ${suggestion.action}`));
          console.log(chalk.default.gray(`      ${suggestion.description}`));

          if (suggestion.command) {
            console.log(chalk.default.cyan(`      Command: ${suggestion.command}`));
          }
          console.log();
        });
    }

    // Interactive options
    if (interactive && enhancedError.recoverable) {
      await this.showInteractiveOptions(enhancedError);
    }

    // Footer
    console.log(chalk.default.gray("─".repeat(50)));

    if (enhancedError.reportable) {
      console.log(chalk.default.gray("🐛 This error can be reported to help improve LlamaCLI"));
      console.log(
        chalk.default.gray("   Use LLAMACLI_DEBUG=1 for more detailed error information")
      );
    }

    console.log();
  }

  /**
   * Show interactive recovery options
   */
  private async showInteractiveOptions(enhancedError: EnhancedError): Promise<void> {
    const readline = await import("readline");
    const chalk = await import("chalk");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(chalk.default.green.bold("🔧 Recovery Options:"));
    console.log(chalk.default.green("   r) Retry the operation"));
    console.log(chalk.default.green("   h) Show help for this error"));
    console.log(chalk.default.green("   d) Show debug information"));
    console.log(chalk.default.green("   q) Quit"));
    console.log();

    const answer = await new Promise<string>((resolve) => {
      rl.question(chalk.default.green("Choose an option (r/h/d/q): "), resolve);
    });

    rl.close();

    switch (answer.toLowerCase()) {
      case "r":
        console.log(chalk.default.yellow("🔄 Please retry your last command"));
        break;
      case "h":
        await this.showDetailedHelp(enhancedError);
        break;
      case "d":
        await this.showDebugInfo(enhancedError);
        break;
      case "q":
      default:
        console.log(chalk.default.gray("👋 Exiting..."));
        break;
    }
  }

  /**
   * Show detailed help for the error
   */
  private async showDetailedHelp(enhancedError: EnhancedError): Promise<void> {
    const chalk = await import("chalk");

    console.log();
    console.log(chalk.default.blue.bold("📚 Detailed Help"));
    console.log(chalk.default.blue("─".repeat(30)));

    console.log(chalk.default.white(`Error Type: ${enhancedError.type}`));
    console.log(chalk.default.white(`Description: ${enhancedError.userMessage}`));
    console.log();

    console.log(chalk.default.blue("Common Causes:"));
    const causes = this.getCommonCauses(enhancedError.type);
    causes.forEach((cause) => {
      console.log(chalk.default.gray(`  • ${cause}`));
    });

    console.log();
    console.log(chalk.default.blue("Prevention Tips:"));
    const tips = this.getPreventionTips(enhancedError.type);
    tips.forEach((tip) => {
      console.log(chalk.default.gray(`  • ${tip}`));
    });

    console.log();
  }

  /**
   * Show debug information
   */
  private async showDebugInfo(enhancedError: EnhancedError): Promise<void> {
    const chalk = await import("chalk");

    console.log();
    console.log(chalk.default.red.bold("🐛 Debug Information"));
    console.log(chalk.default.red("─".repeat(30)));

    console.log(chalk.default.gray(`Error Type: ${enhancedError.type}`));
    console.log(chalk.default.gray(`Error Code: ${enhancedError.code}`));
    console.log(chalk.default.gray(`Original Message: ${enhancedError.message}`));

    if (enhancedError.originalError?.stack) {
      console.log();
      console.log(chalk.default.gray("Stack Trace:"));
      console.log(chalk.default.gray(enhancedError.originalError.stack));
    }

    if (enhancedError.debugInfo) {
      console.log();
      console.log(chalk.default.gray("Debug Info:"));
      console.log(chalk.default.gray(JSON.stringify(enhancedError.debugInfo, null, 2)));
    }

    if (enhancedError.context) {
      console.log();
      console.log(chalk.default.gray("Context:"));
      console.log(chalk.default.gray(JSON.stringify(enhancedError.context, null, 2)));
    }

    console.log();
  }

  /**
   * Get priority weight for sorting
   */
  private getPriorityWeight(priority: string): number {
    switch (priority) {
      case "high":
        return 1;
      case "medium":
        return 2;
      case "low":
        return 3;
      default:
        return 4;
    }
  }

  /**
   * Get priority icon
   */
  private getPriorityIcon(priority: string): string {
    switch (priority) {
      case "high":
        return "🔥";
      case "medium":
        return "⚡";
      case "low":
        return "💡";
      default:
        return "📝";
    }
  }

  /**
   * Get common causes for error type
   */
  private getCommonCauses(errorType: ErrorType): string[] {
    const causes: Record<ErrorType, string[]> = {
      [ErrorType.NETWORK]: [
        "Internet connection is down or unstable",
        "Firewall blocking the connection",
        "DNS resolution issues",
        "Proxy configuration problems",
      ],
      [ErrorType.AUTHENTICATION]: [
        "Invalid or expired API key",
        "Incorrect credentials",
        "API key lacks required permissions",
        "Authentication service is down",
      ],
      [ErrorType.CONFIGURATION]: [
        "Missing or corrupted configuration file",
        "Invalid profile settings",
        "Outdated configuration format",
        "Missing required configuration values",
      ],
      [ErrorType.VALIDATION]: [
        "Invalid command syntax",
        "Missing required parameters",
        "Invalid file paths or formats",
        "Unsupported options or values",
      ],
      [ErrorType.PERMISSION]: [
        "Insufficient file system permissions",
        "Read-only file system",
        "User lacks required privileges",
        "File or directory is locked",
      ],
      [ErrorType.RESOURCE]: [
        "File or directory does not exist",
        "Path is incorrect or misspelled",
        "Resource has been moved or deleted",
        "Insufficient disk space",
      ],
      [ErrorType.API]: [
        "API service is temporarily unavailable",
        "Rate limits exceeded",
        "API quota exhausted",
        "Invalid API request format",
      ],
      [ErrorType.INTERNAL]: [
        "Software bug or unexpected condition",
        "Memory or resource exhaustion",
        "Incompatible system environment",
        "Corrupted application state",
      ],
      [ErrorType.USER_INPUT]: [
        "Typo in command or parameters",
        "Unsupported command combination",
        "Invalid input format",
        "Missing required input",
      ],
      [ErrorType.SYSTEM]: [
        "Operating system compatibility issues",
        "Missing system dependencies",
        "Environment variable problems",
        "System resource limitations",
      ],
    };

    return causes[errorType] || ["Unknown error cause"];
  }

  /**
   * Get prevention tips for error type
   */
  private getPreventionTips(errorType: ErrorType): string[] {
    const tips: Record<ErrorType, string[]> = {
      [ErrorType.NETWORK]: [
        "Test internet connection before running commands",
        "Use stable network connections when possible",
        "Configure proxy settings if behind corporate firewall",
      ],
      [ErrorType.AUTHENTICATION]: [
        "Keep API keys secure and up to date",
        "Regularly verify API key permissions",
        "Use environment variables for sensitive credentials",
      ],
      [ErrorType.CONFIGURATION]: [
        "Backup configuration files regularly",
        "Validate configuration after changes",
        "Use version control for configuration files",
      ],
      [ErrorType.VALIDATION]: [
        "Use auto-completion to avoid typos",
        "Read command help before using new commands",
        "Validate file paths before using them",
      ],
      [ErrorType.PERMISSION]: [
        "Run commands from directories you own",
        "Check file permissions before operations",
        "Use appropriate user accounts for different tasks",
      ],
      [ErrorType.RESOURCE]: [
        "Verify file paths before using them",
        "Use absolute paths when possible",
        "Check available disk space regularly",
      ],
      [ErrorType.API]: [
        "Monitor API usage and quotas",
        "Implement retry logic for transient failures",
        "Use appropriate rate limiting",
      ],
      [ErrorType.INTERNAL]: [
        "Keep LlamaCLI updated to latest version",
        "Report bugs to help improve the software",
        "Use stable release versions in production",
      ],
      [ErrorType.USER_INPUT]: [
        "Use interactive mode for complex commands",
        "Double-check command syntax",
        "Use help commands to learn proper usage",
      ],
      [ErrorType.SYSTEM]: [
        "Keep system and dependencies updated",
        "Monitor system resources",
        "Use supported operating systems and versions",
      ],
    };

    return tips[errorType] || ["Follow best practices for error prevention"];
  }
}

// Export singleton instances
export const enhancedErrorHandler = EnhancedErrorHandler.getInstance();
export const errorDisplayManager = ErrorDisplayManager.getInstance();
