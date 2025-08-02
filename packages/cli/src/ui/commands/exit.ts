/**
 * Exit command for LlamaCLI slash commands
 */

import { SlashCommand, CommandContext, SlashCommandResult, CommandKind } from './types.js';

export const exitCommand: SlashCommand = {
  name: 'exit',
  altNames: ['quit', 'q'],
  description: 'Exit the CLI application',
  kind: CommandKind.BUILT_IN,
  
  action: async (context: CommandContext, args: string): Promise<SlashCommandResult> => {
    const { cli } = context;
    
    cli.displayMessage('👋 Goodbye!', 'info');
    
    // Close the CLI
    if (cli.close) {
      await cli.close();
    }
    
    // Exit the process
    setTimeout(() => {
      process.exit(0);
    }, 100);
    
    return {
      type: 'message',
      content: '',
      messageType: 'info'
    };
  }
};
