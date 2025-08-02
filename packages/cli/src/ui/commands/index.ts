/**
 * Slash Commands Index for LlamaCLI
 * Registers all available slash commands
 */

import { slashCommandProcessor } from "./processor.js";
import { helpCommand } from "./help.js";
import { themeCommand } from "./theme.js";
import { configCommand } from "./config.js";
import { clearCommand } from "./clear.js";
import { exitCommand } from "./exit.js";
import { statusCommand } from "./status.js";
import { completionCommand } from "./completion.js";

/**
 * Initialize and register all built-in slash commands
 */
export function initializeSlashCommands(): void {
  // Register built-in commands
  slashCommandProcessor.registerCommand(helpCommand);
  slashCommandProcessor.registerCommand(themeCommand);
  slashCommandProcessor.registerCommand(configCommand);
  slashCommandProcessor.registerCommand(clearCommand);
  slashCommandProcessor.registerCommand(exitCommand);
  slashCommandProcessor.registerCommand(statusCommand);
  slashCommandProcessor.registerCommand(completionCommand);
}

// Export the processor and types
export { slashCommandProcessor } from "./processor.js";
export * from "./types.js";
