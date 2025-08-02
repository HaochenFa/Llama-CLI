/**
 * Clear command for LlamaCLI slash commands
 */

import { SlashCommand, CommandContext, SlashCommandResult, CommandKind } from './types.js';

export const clearCommand: SlashCommand = {
  name: 'clear',
  altNames: ['cls', 'c'],
  description: 'Clear the terminal screen',
  kind: CommandKind.BUILT_IN,
  
  action: async (context: CommandContext, args: string): Promise<SlashCommandResult> => {
    const { cli } = context;
    
    // Clear the screen
    if (cli.clearScreen) {
      cli.clearScreen();
    } else {
      // Fallback to console.clear
      console.clear();
    }
    
    return {
      type: 'message',
      content: '',
      messageType: 'info'
    };
  }
};
