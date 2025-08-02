/**
 * Help command for LlamaCLI slash commands
 */

import { SlashCommand, CommandContext, SlashCommandResult, CommandKind } from './types.js';
import { slashCommandProcessor } from './processor.js';

export const helpCommand: SlashCommand = {
  name: 'help',
  altNames: ['h', '?'],
  description: 'Show help information about available commands',
  kind: CommandKind.BUILT_IN,
  
  action: async (context: CommandContext, args: string): Promise<SlashCommandResult> => {
    const { cli } = context;
    
    if (args.trim()) {
      // Show help for specific command
      const commandName = args.trim();
      const command = slashCommandProcessor.findCommand(commandName);
      
      if (!command) {
        return {
          type: 'error',
          content: `Command '${commandName}' not found`,
          messageType: 'error'
        };
      }
      
      // Display detailed help for the command
      cli.displayMessage(`\n📖 Help for /${command.name}`, 'info');
      cli.displayMessage(`Description: ${command.description}`, 'info');
      
      if (command.altNames && command.altNames.length > 0) {
        cli.displayMessage(`Aliases: ${command.altNames.map(alt => `/${alt}`).join(', ')}`, 'info');
      }
      
      if (command.subCommands && command.subCommands.length > 0) {
        cli.displayMessage('\nSubcommands:', 'info');
        for (const subCmd of command.subCommands) {
          cli.displayMessage(`  /${command.name} ${subCmd.name} - ${subCmd.description}`, 'info');
        }
      }
      
      return {
        type: 'message',
        content: '',
        messageType: 'info'
      };
    }
    
    // Show general help
    cli.displayMessage('\n🚀 LlamaCLI - AI-powered command line development partner', 'info');
    cli.displayMessage('', 'info');
    
    // Show slash commands
    cli.displayMessage('📋 Available slash commands:', 'info');
    const commands = slashCommandProcessor.getAllCommands();
    
    const builtInCommands = commands.filter(cmd => cmd.kind === CommandKind.BUILT_IN);
    const userCommands = commands.filter(cmd => cmd.kind === CommandKind.USER_DEFINED);
    const extensionCommands = commands.filter(cmd => cmd.kind === CommandKind.EXTENSION);
    
    if (builtInCommands.length > 0) {
      cli.displayMessage('\n  Built-in commands:', 'info');
      for (const cmd of builtInCommands) {
        const aliases = cmd.altNames ? ` (${cmd.altNames.map(alt => `/${alt}`).join(', ')})` : '';
        cli.displayMessage(`    /${cmd.name}${aliases} - ${cmd.description}`, 'info');
      }
    }
    
    if (userCommands.length > 0) {
      cli.displayMessage('\n  User-defined commands:', 'info');
      for (const cmd of userCommands) {
        cli.displayMessage(`    /${cmd.name} - ${cmd.description}`, 'info');
      }
    }
    
    if (extensionCommands.length > 0) {
      cli.displayMessage('\n  Extension commands:', 'info');
      for (const cmd of extensionCommands) {
        cli.displayMessage(`    /${cmd.name} - ${cmd.description}`, 'info');
      }
    }
    
    // Show regular commands
    cli.displayMessage('\n💬 Regular commands:', 'info');
    cli.displayMessage('  chat [message]     - Start or continue a chat session', 'info');
    cli.displayMessage('  get <query>        - Quick query without session', 'info');
    cli.displayMessage('  @path/to/file      - Reference a file in your message', 'info');
    cli.displayMessage('  !command           - Execute shell command', 'info');
    cli.displayMessage('  !                  - Toggle shell mode', 'info');
    
    cli.displayMessage('\n💡 Tips:', 'info');
    cli.displayMessage('  • Use Tab for auto-completion', 'info');
    cli.displayMessage('  • Type /help <command> for detailed help', 'info');
    cli.displayMessage('  • Use Ctrl+L to clear screen', 'info');
    cli.displayMessage('  • Use Ctrl+D or /exit to quit', 'info');
    
    return {
      type: 'message',
      content: '',
      messageType: 'info'
    };
  },
  
  completion: async (context: CommandContext, partialArg: string): Promise<string[]> => {
    const commands = slashCommandProcessor.getAllCommands();
    return commands
      .filter(cmd => cmd.name.toLowerCase().startsWith(partialArg.toLowerCase()))
      .map(cmd => cmd.name);
  }
};
