/**
 * LlamaCLI - AI-powered command line development partner
 * Main entry point for the CLI application
 */

import { Command } from "commander";
import { ChatCommand } from "./commands/chat.js";
import { ConfigCommand } from "./commands/config.js";
import { GetCommand } from "./commands/get.js";
import { SessionCommand } from "./commands/session.js";
import { ConfigStore } from "@llamacli/core";
import { getErrorMessage } from "./utils/error-utils.js";
import { benchmark, performanceMonitor } from "@llamacli/core";
import { themeManager } from "./ui/theme-manager.js";
import { completionEngine } from "./ui/completion.js";
import { InteractiveCLI } from "./ui/interactive-cli.js";
import { NonInteractiveProcessor } from "./non-interactive/index.js";

// Start performance monitoring
const startTime = performance.now();
benchmark.start("startup");
performanceMonitor.start();

const program = new Command();

program
  .name("llamacli")
  .description("AI-powered command line development partner")
  .version("1.0.0")
  .option("-i, --interactive", "Start enhanced interactive mode")
  .option("-p, --prompt <text>", "Run in non-interactive mode with prompt")
  .option("-f, --format <type>", "Output format (text, json, markdown)", "text")
  .option("-o, --output <file>", "Write output to file")
  .option("-q, --quiet", "Suppress status messages")
  .option("-v, --verbose", "Show detailed metadata");

// Initialize configuration store
let configStore: ConfigStore;

async function initializeConfig() {
  try {
    benchmark.start("configLoad");
    configStore = new ConfigStore();
    await configStore.initialize();
    benchmark.end("configLoad");

    // Record configuration load time
    const configLoadTime =
      benchmark.getResults().find((r) => r.name === "configLoad")?.duration || 0;
    performanceMonitor.recordMeasurement("configLoadTime", configLoadTime);
  } catch (error) {
    benchmark.end("configLoad");
    console.error("Failed to initialize configuration:", getErrorMessage(error));
    process.exit(1);
  }
}

/**
 * Run non-interactive mode
 */
async function runNonInteractiveMode(options: any) {
  await initializeConfig();

  const processor = new NonInteractiveProcessor(configStore, process.cwd());
  const nonInteractiveOptions = NonInteractiveProcessor.parseNonInteractiveArgs(process.argv);

  // Override with commander options
  if (options.prompt) nonInteractiveOptions.prompt = options.prompt;
  if (options.format) nonInteractiveOptions.format = options.format;
  if (options.output) nonInteractiveOptions.output = options.output;
  if (options.quiet) nonInteractiveOptions.quiet = options.quiet;
  if (options.verbose) nonInteractiveOptions.verbose = options.verbose;

  const result = await processor.run(nonInteractiveOptions);

  if (!result.success) {
    process.exit(1);
  }

  process.exit(0);
}

/**
 * Start enhanced interactive mode with new CLI features
 */
async function startInteractiveMode() {
  await initializeConfig();

  // Initialize theme manager with config store
  await themeManager.setTheme("default");

  // Initialize completion engine with config store
  completionEngine.configStore = configStore;

  // Create interactive CLI instance
  const interactiveCLI = new InteractiveCLI({
    configStore,
    workingDirectory: process.cwd(),
    prompt: "llamacli> ",
    enableCompletion: true,
    enableSyntaxHighlighting: true,
    theme: "default",
  });

  // Handle commands from interactive CLI
  interactiveCLI.on("command", async (command) => {
    await handleInteractiveCommand(command, interactiveCLI);
  });

  interactiveCLI.on("exit", () => {
    console.log("\nGoodbye! 👋");
    process.exit(0);
  });

  // Start the interactive CLI
  interactiveCLI.start();
}

/**
 * Handle commands from the interactive CLI
 */
async function handleInteractiveCommand(command: any, cli: InteractiveCLI) {
  const { command: cmd, args, raw } = command;

  try {
    switch (cmd.toLowerCase()) {
      case "help":
        cli.showHelp();
        break;

      case "chat":
        const chatOptions = parseCommandArgs(args, [
          { name: "profile", alias: "p", hasValue: true },
          { name: "file", alias: "f", hasValue: true },
          { name: "directory", alias: "d", hasValue: true },
          { name: "no-tools", hasValue: false },
          { name: "yolo", hasValue: false },
        ]);
        const chatCommand = new ChatCommand(configStore);
        await chatCommand.run(chatOptions);
        break;

      case "get":
        if (args.length === 0) {
          cli.displayMessage("Usage: get <query>", "error");
          break;
        }
        const query = args.join(" ");
        const getOptions = parseCommandArgs(args.slice(1), [
          { name: "profile", alias: "p", hasValue: true },
          { name: "file", alias: "f", hasValue: true },
        ]);
        const getCommand = new GetCommand(configStore);
        await getCommand.run(query, getOptions);
        break;

      case "config":
        cli.displayMessage("Config commands are available in non-interactive mode", "info");
        cli.displayMessage("Use: llamacli config list", "info");
        break;

      case "session":
        cli.displayMessage("Session commands are available in non-interactive mode", "info");
        cli.displayMessage("Use: llamacli session list", "info");
        break;

      case "theme":
        await handleThemeCommand(args, cli);
        break;

      case "clear":
        cli.clearScreen();
        break;

      case "exit":
      case "quit":
        cli.close();
        break;

      default:
        if (cmd) {
          cli.displayMessage(`Unknown command: ${cmd}`, "warning");
          cli.displayMessage('Type "help" for available commands', "info");
        }
        break;
    }
  } catch (error) {
    cli.displayMessage(`Error executing command: ${getErrorMessage(error)}`, "error");
  }

  cli.showPrompt();
}

/**
 * Parse command arguments into options object
 */
function parseCommandArgs(
  args: string[],
  optionDefs: Array<{ name: string; alias?: string; hasValue: boolean }>
): any {
  const options: any = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      const optionName = arg.slice(2);
      const optionDef = optionDefs.find((def) => def.name === optionName);

      if (optionDef) {
        if (optionDef.hasValue && i + 1 < args.length) {
          options[optionName] = args[++i];
        } else if (!optionDef.hasValue) {
          options[optionName] = true;
        }
      }
    } else if (arg.startsWith("-")) {
      const alias = arg.slice(1);
      const optionDef = optionDefs.find((def) => def.alias === alias);

      if (optionDef) {
        if (optionDef.hasValue && i + 1 < args.length) {
          options[optionDef.name] = args[++i];
        } else if (!optionDef.hasValue) {
          options[optionDef.name] = true;
        }
      }
    }
  }

  return options;
}

/**
 * Handle theme commands
 */
async function handleThemeCommand(args: string[], cli: InteractiveCLI) {
  if (args.length === 0) {
    const themes = cli.getAvailableThemes();
    cli.displayMessage("Available themes:", "info");
    themes.forEach((theme) => {
      cli.displayMessage(`  - ${theme}`, "info");
    });
    return;
  }

  const themeName = args[0].toLowerCase();
  const success = await cli.setTheme(themeName);

  if (success) {
    cli.displayMessage(`Theme changed to: ${themeName}`, "success");
  } else {
    cli.displayMessage(`Theme not found: ${themeName}`, "error");
  }
}

// Chat command (default)
program
  .command("chat", { isDefault: true })
  .description("Start an interactive chat session")
  .option("-p, --profile <name>", "Use specific LLM profile")
  .option("-f, --file <path>", "Include file in context")
  .option("-d, --directory <path>", "Set working directory")
  .option("--no-tools", "Disable tool usage")
  .option("--yolo", "Auto-approve all tool calls")
  .action(async (options) => {
    await initializeConfig();
    const chatCommand = new ChatCommand(configStore);
    await chatCommand.run(options);
  });

// Quick query command
program
  .command("get <query>")
  .description("Quick query without interactive session")
  .option("-p, --profile <name>", "Use specific LLM profile")
  .option("-f, --file <path>", "Include file in context")
  .action(async (query, options) => {
    await initializeConfig();
    const getCommand = new GetCommand(configStore);
    await getCommand.run(query, options);
  });

// Configuration commands
const configCmd = program.command("config").description("Manage configuration");

configCmd
  .command("list")
  .description("List all profiles")
  .action(async () => {
    await initializeConfig();
    const configCommand = new ConfigCommand(configStore);
    await configCommand.listProfiles();
  });

configCmd
  .command("add <name>")
  .description("Add a new profile")
  .option("-t, --type <type>", "LLM type (ollama, openai, claude, vllm)")
  .option("-e, --endpoint <url>", "API endpoint")
  .option("-m, --model <name>", "Model name")
  .option("-k, --api-key <key>", "API key")
  .action(async (name, options) => {
    await initializeConfig();
    const configCommand = new ConfigCommand(configStore);
    await configCommand.addProfile(name, options);
  });

configCmd
  .command("use <name>")
  .description("Set active profile")
  .action(async (name) => {
    await initializeConfig();
    const configCommand = new ConfigCommand(configStore);
    await configCommand.setActiveProfile(name);
  });

configCmd
  .command("remove <name>")
  .description("Remove a profile")
  .action(async (name) => {
    await initializeConfig();
    const configCommand = new ConfigCommand(configStore);
    await configCommand.removeProfile(name);
  });

// Session management commands
const sessionCommand = new SessionCommand();
program.addCommand(sessionCommand.getCommand());

// Error handling
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Check if we should run in non-interactive mode
const shouldRunNonInteractive = NonInteractiveProcessor.shouldRunNonInteractive();

if (shouldRunNonInteractive) {
  // Parse arguments to get options
  program.parse();
  const options = program.opts();

  // Run non-interactive mode
  await runNonInteractiveMode(options);
} else {
  // Check if we should start interactive mode
  const shouldStartInteractive =
    process.argv.length === 2 ||
    (process.argv.length === 3 &&
      (process.argv[2] === "--interactive" || process.argv[2] === "-i"));

  if (shouldStartInteractive) {
    // Start enhanced interactive mode
    await startInteractiveMode();
  } else {
    // Parse command line arguments normally
    program.parse();
  }
}

// Record startup completion
benchmark.end("startup");
const totalStartupTime = performance.now() - startTime;
performanceMonitor.recordMeasurement("startupTime", totalStartupTime);

// Generate performance report in debug mode
if (process.env.LLAMACLI_DEBUG || process.env.NODE_ENV === "development") {
  const report = benchmark.generateReport();
  console.log("\n" + report);
}
