/**
 * Slash Command Processor for LlamaCLI
 * Handles parsing and execution of slash commands
 */

import {
  SlashCommand,
  SlashCommandProcessor,
  SlashCommandResult,
  CommandContext,
  CommandKind,
} from "./types.js";

export class SlashCommandProcessorImpl implements SlashCommandProcessor {
  public commands: SlashCommand[] = [];

  constructor() {
    // Register built-in commands
    this.registerBuiltInCommands();
  }

  /**
   * Register a new slash command
   */
  registerCommand(command: SlashCommand): void {
    // Check for name conflicts
    const existingCommand = this.commands.find(
      (cmd) =>
        cmd.name === command.name ||
        command.altNames?.some((alt) => cmd.name === alt || cmd.altNames?.includes(alt))
    );

    if (existingCommand) {
      throw new Error(`Command '${command.name}' already exists`);
    }

    this.commands.push(command);
  }

  /**
   * Unregister a slash command
   */
  unregisterCommand(name: string): void {
    this.commands = this.commands.filter(
      (cmd) => cmd.name !== name && !cmd.altNames?.includes(name)
    );
  }

  /**
   * Process a slash command input
   */
  async processCommand(
    input: string,
    context: CommandContext
  ): Promise<SlashCommandResult | false> {
    const trimmed = input.trim();

    // Check if it's a slash command
    if (!trimmed.startsWith("/")) {
      return false;
    }

    // Parse command and arguments
    const parts = trimmed.substring(1).trim().split(/\s+/);
    const commandPath = parts.filter((p) => p); // Remove empty parts

    if (commandPath.length === 0) {
      return {
        type: "error",
        content: "Empty command. Type /help for available commands.",
        messageType: "error",
      };
    }

    // Find the command to execute
    let currentCommands = this.commands;
    let commandToExecute: SlashCommand | undefined;
    let pathIndex = 0;

    while (pathIndex < commandPath.length) {
      const commandName = commandPath[pathIndex];

      // Find command by name or alt name
      const foundCommand = currentCommands.find(
        (cmd) => cmd.name === commandName || cmd.altNames?.includes(commandName)
      );

      if (!foundCommand) {
        return {
          type: "error",
          content: `Unknown command: /${commandPath.slice(0, pathIndex + 1).join(" ")}`,
          messageType: "error",
        };
      }

      commandToExecute = foundCommand;
      pathIndex++;

      // If this command has subcommands and we have more path parts, continue
      if (foundCommand.subCommands && pathIndex < commandPath.length) {
        currentCommands = foundCommand.subCommands;
      } else {
        break;
      }
    }

    if (!commandToExecute) {
      return {
        type: "error",
        content: "Command not found",
        messageType: "error",
      };
    }

    // Execute the command
    try {
      const remainingArgs = commandPath.slice(pathIndex).join(" ");
      const commandContext: CommandContext = {
        ...context,
        args: commandPath.slice(pathIndex),
        rawInput: remainingArgs,
      };

      if (commandToExecute.action) {
        const result = await commandToExecute.action(commandContext, remainingArgs);

        if (result) {
          return result;
        }
      }

      return {
        type: "message",
        content: `Command /${commandPath.join(" ")} executed successfully`,
        messageType: "success",
      };
    } catch (error) {
      return {
        type: "error",
        content: `Error executing command: ${error instanceof Error ? error.message : String(error)}`,
        messageType: "error",
      };
    }
  }

  /**
   * Get command completions for input
   */
  async getCompletions(input: string, context: CommandContext): Promise<string[]> {
    if (!input.startsWith("/")) {
      return [];
    }

    const parts = input.substring(1).split(/\s+/);
    const completions: string[] = [];

    if (parts.length === 1) {
      // Complete command names
      const partial = parts[0].toLowerCase();
      for (const cmd of this.commands) {
        if (cmd.name.toLowerCase().startsWith(partial)) {
          completions.push(`/${cmd.name}`);
        }
        if (cmd.altNames) {
          for (const alt of cmd.altNames) {
            if (alt.toLowerCase().startsWith(partial)) {
              completions.push(`/${alt}`);
            }
          }
        }
      }
    } else {
      // Complete subcommands or arguments
      const commandName = parts[0];
      const command = this.commands.find(
        (cmd) => cmd.name === commandName || cmd.altNames?.includes(commandName)
      );

      if (command && command.completion) {
        const partialArg = parts.slice(1).join(" ");
        const argCompletions = await command.completion(context, partialArg);
        completions.push(...argCompletions.map((comp) => `/${commandName} ${comp}`));
      }

      if (command && command.subCommands && parts.length === 2) {
        const partial = parts[1].toLowerCase();
        for (const subCmd of command.subCommands) {
          if (subCmd.name.toLowerCase().startsWith(partial)) {
            completions.push(`/${commandName} ${subCmd.name}`);
          }
        }
      }
    }

    return completions;
  }

  /**
   * Register built-in commands
   */
  private registerBuiltInCommands(): void {
    // Built-in commands will be registered via initializeSlashCommands()
    // This method is kept for future extensibility
  }

  /**
   * Get all available commands
   */
  getAllCommands(): SlashCommand[] {
    return [...this.commands];
  }

  /**
   * Find a command by name
   */
  findCommand(name: string): SlashCommand | undefined {
    return this.commands.find((cmd) => cmd.name === name || cmd.altNames?.includes(name));
  }
}

// Export singleton instance
export const slashCommandProcessor = new SlashCommandProcessorImpl();
