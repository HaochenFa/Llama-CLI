/**
 * Slash Command System for LlamaCLI
 * Provides meta-level control over the CLI interface
 */

export enum CommandKind {
  BUILT_IN = 'built-in',
  USER_DEFINED = 'user-defined',
  EXTENSION = 'extension',
}

export interface CommandContext {
  configStore?: any;
  cli: any;
  workingDirectory: string;
  args: string[];
  rawInput: string;
}

export interface SlashCommandResult {
  type: 'message' | 'action' | 'error';
  content?: string;
  messageType?: 'info' | 'success' | 'warning' | 'error';
  action?: string;
}

export interface SlashCommand {
  name: string;
  altNames?: string[];
  description: string;
  kind: CommandKind;
  
  // The action to run
  action?: (
    context: CommandContext,
    args: string
  ) => void | SlashCommandResult | Promise<void | SlashCommandResult>;
  
  // Provides argument completion
  completion?: (
    context: CommandContext,
    partialArg: string
  ) => Promise<string[]>;
  
  subCommands?: SlashCommand[];
}

export interface SlashCommandProcessor {
  commands: SlashCommand[];
  registerCommand(command: SlashCommand): void;
  unregisterCommand(name: string): void;
  processCommand(input: string, context: CommandContext): Promise<SlashCommandResult | false>;
  getCompletions(input: string, context: CommandContext): Promise<string[]>;
}
