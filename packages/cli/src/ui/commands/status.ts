/**
 * Status command for LlamaCLI slash commands
 */

import { SlashCommand, CommandContext, SlashCommandResult, CommandKind } from './types.js';

export const statusCommand: SlashCommand = {
  name: 'status',
  altNames: ['stat', 's'],
  description: 'Show system and session status information',
  kind: CommandKind.BUILT_IN,
  
  action: async (context: CommandContext, args: string): Promise<SlashCommandResult> => {
    const { cli } = context;
    
    // Get status information from CLI
    if (cli.getStatusLine) {
      const statusLine = cli.getStatusLine();
      const compactStatusLine = cli.getCompactStatusLine();
      
      cli.displayMessage('\n📊 System Status:', 'info');
      cli.displayMessage('', 'info');
      
      cli.displayMessage('Full Status:', 'info');
      cli.displayMessage(`  ${statusLine}`, 'info');
      
      cli.displayMessage('', 'info');
      cli.displayMessage('Compact Status:', 'info');
      cli.displayMessage(`  ${compactStatusLine}`, 'info');
      
      // Get detailed system info if available
      if (cli.statusDisplayManager) {
        const systemInfo = cli.statusDisplayManager.getCurrentSystemInfo();
        const llmStatus = cli.statusDisplayManager.getCurrentLLMStatus();
        const sessionStatus = cli.statusDisplayManager.getCurrentSessionStatus();
        
        if (systemInfo) {
          cli.displayMessage('', 'info');
          cli.displayMessage('📁 Directory Information:', 'info');
          cli.displayMessage(`  Current: ${systemInfo.directory.current}`, 'info');
          cli.displayMessage(`  Shortened: ${systemInfo.directory.shortened}`, 'info');
          cli.displayMessage(`  Tildeified: ${systemInfo.directory.tildeified}`, 'info');
          
          if (systemInfo.git.branch) {
            cli.displayMessage('', 'info');
            cli.displayMessage('🌿 Git Information:', 'info');
            cli.displayMessage(`  Branch: ${systemInfo.git.branch}`, 'info');
            cli.displayMessage(`  Has Changes: ${systemInfo.git.hasChanges ? 'Yes' : 'No'}`, 'info');
            if (systemInfo.git.repository) {
              cli.displayMessage(`  Repository: ${systemInfo.git.repository}`, 'info');
            }
          }
          
          cli.displayMessage('', 'info');
          cli.displayMessage('💾 Memory Information:', 'info');
          cli.displayMessage(`  Used: ${systemInfo.memory.formatted}`, 'info');
          cli.displayMessage(`  Percentage: ${systemInfo.memory.percentage.toFixed(1)}%`, 'info');
          
          cli.displayMessage('', 'info');
          cli.displayMessage('⚙️ Process Information:', 'info');
          cli.displayMessage(`  PID: ${systemInfo.process.pid}`, 'info');
          cli.displayMessage(`  Uptime: ${Math.floor(systemInfo.process.uptime)}s`, 'info');
          cli.displayMessage(`  Node Version: ${systemInfo.process.nodeVersion}`, 'info');
        }
        
        if (llmStatus) {
          cli.displayMessage('', 'info');
          cli.displayMessage('🤖 LLM Status:', 'info');
          if (llmStatus.provider) {
            cli.displayMessage(`  Provider: ${llmStatus.provider}`, 'info');
          }
          if (llmStatus.model) {
            cli.displayMessage(`  Model: ${llmStatus.model}`, 'info');
          }
          cli.displayMessage(`  Connected: ${llmStatus.isConnected ? 'Yes' : 'No'}`, 'info');
          if (llmStatus.contextUsage) {
            cli.displayMessage(`  Context Usage: ${llmStatus.contextUsage.percentage.toFixed(1)}%`, 'info');
          }
        }
        
        cli.displayMessage('', 'info');
        cli.displayMessage('🎯 Session Status:', 'info');
        cli.displayMessage(`  Mode: ${sessionStatus.mode}`, 'info');
        if (sessionStatus.activeSession) {
          cli.displayMessage(`  Active Session: ${sessionStatus.activeSession}`, 'info');
        }
        if (sessionStatus.messageCount !== undefined) {
          cli.displayMessage(`  Message Count: ${sessionStatus.messageCount}`, 'info');
        }
      }
      
      return {
        type: 'message',
        content: '',
        messageType: 'info'
      };
    }
    
    return {
      type: 'error',
      content: 'Status information not available',
      messageType: 'error'
    };
  }
};
