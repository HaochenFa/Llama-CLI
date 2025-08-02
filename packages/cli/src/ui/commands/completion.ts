/**
 * Completion command for LlamaCLI slash commands
 */

import { SlashCommand, CommandContext, SlashCommandResult, CommandKind } from './types.js';
import { completionEngine } from '../completion.js';

export const completionCommand: SlashCommand = {
  name: 'completion',
  altNames: ['comp'],
  description: 'Manage and view completion system statistics',
  kind: CommandKind.BUILT_IN,
  
  action: async (context: CommandContext, args: string): Promise<SlashCommandResult> => {
    const { cli } = context;
    const trimmedArgs = args.trim();
    
    if (trimmedArgs === 'stats') {
      // Show completion statistics
      const stats = completionEngine.getCompletionStats();
      
      cli.displayMessage('\n📊 Completion System Statistics:', 'info');
      cli.displayMessage('', 'info');
      cli.displayMessage(`📚 Command History Size: ${stats.historySize}`, 'info');
      cli.displayMessage(`💾 File Cache Size: ${stats.cacheSize}`, 'info');
      
      return {
        type: 'message',
        content: '',
        messageType: 'info'
      };
    } else if (trimmedArgs === 'clear') {
      // Clear file cache
      completionEngine.clearFileCache();
      cli.displayMessage('✅ File cache cleared', 'success');
      
      return {
        type: 'message',
        content: '',
        messageType: 'success'
      };
    } else if (!trimmedArgs) {
      // Show help
      cli.displayMessage('\n🔧 Completion System Management:', 'info');
      cli.displayMessage('', 'info');
      cli.displayMessage('Available commands:', 'info');
      cli.displayMessage('  /completion stats  - Show completion statistics', 'info');
      cli.displayMessage('  /completion clear  - Clear file cache', 'info');
      cli.displayMessage('', 'info');
      cli.displayMessage('💡 Features:', 'info');
      cli.displayMessage('  • Fuzzy matching for commands and files', 'info');
      cli.displayMessage('  • History-based command suggestions', 'info');
      cli.displayMessage('  • Context-aware completions', 'info');
      cli.displayMessage('  • Intelligent file path completion', 'info');
      cli.displayMessage('  • Profile and option completion', 'info');
      
      return {
        type: 'message',
        content: '',
        messageType: 'info'
      };
    } else {
      return {
        type: 'error',
        content: `Unknown completion command: ${trimmedArgs}. Use /completion for help.`,
        messageType: 'error'
      };
    }
  },
  
  completion: async (context: CommandContext, partialArg: string): Promise<string[]> => {
    const commands = ['stats', 'clear'];
    return commands.filter(cmd => 
      cmd.toLowerCase().startsWith(partialArg.toLowerCase())
    );
  }
};
