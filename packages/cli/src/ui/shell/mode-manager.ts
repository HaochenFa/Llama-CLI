/**
 * Shell Mode Manager for LlamaCLI
 * Manages shell mode state and UI
 */

import { EventEmitter } from 'events';
import { ShellProcessor, ShellExecutionResult } from './processor.js';

export interface ShellModeOptions {
  workingDirectory: string;
  timeout?: number;
  allowDangerousCommands?: boolean;
}

export interface ShellConfirmationRequest {
  command: string;
  reason: string;
  onConfirm: (allow: boolean, allowAlways?: boolean) => void;
}

export class ShellModeManager extends EventEmitter {
  private isShellMode: boolean = false;
  private processor: ShellProcessor;
  private commandHistory: string[] = [];
  private historyIndex: number = -1;

  constructor(options: ShellModeOptions) {
    super();
    this.processor = new ShellProcessor(options);
  }

  /**
   * Check if currently in shell mode
   */
  isInShellMode(): boolean {
    return this.isShellMode;
  }

  /**
   * Toggle shell mode
   */
  toggleShellMode(): boolean {
    this.isShellMode = !this.isShellMode;
    this.emit('modeChanged', this.isShellMode);
    return this.isShellMode;
  }

  /**
   * Enter shell mode
   */
  enterShellMode(): void {
    if (!this.isShellMode) {
      this.isShellMode = true;
      this.emit('modeChanged', this.isShellMode);
    }
  }

  /**
   * Exit shell mode
   */
  exitShellMode(): void {
    if (this.isShellMode) {
      this.isShellMode = false;
      this.emit('modeChanged', this.isShellMode);
    }
  }

  /**
   * Process input (either shell command or mode toggle)
   */
  async processInput(input: string): Promise<{
    handled: boolean;
    result?: ShellExecutionResult;
    needsConfirmation?: ShellConfirmationRequest;
    modeChanged?: boolean;
  }> {
    const trimmed = input.trim();

    // Check for shell mode toggle
    if (this.processor.isShellModeToggle(trimmed)) {
      const newMode = this.toggleShellMode();
      return {
        handled: true,
        modeChanged: true
      };
    }

    // Check for shell command
    if (this.processor.isShellCommand(trimmed) || this.isShellMode) {
      const command = this.isShellMode 
        ? trimmed 
        : this.processor.parseShellCommand(trimmed);

      if (!command) {
        return { handled: false };
      }

      // Check if command needs confirmation
      if (!this.processor.isCommandAllowed(command)) {
        return {
          handled: true,
          needsConfirmation: {
            command,
            reason: 'This command is potentially dangerous and requires confirmation.',
            onConfirm: async (allow: boolean, allowAlways?: boolean) => {
              if (allow) {
                if (allowAlways) {
                  this.processor.allowCommand(command);
                }
                const result = await this.executeCommand(command);
                this.emit('commandExecuted', result);
              } else {
                this.emit('commandCancelled', command);
              }
            }
          }
        };
      }

      // Execute command directly
      const result = await this.executeCommand(command);
      return {
        handled: true,
        result
      };
    }

    return { handled: false };
  }

  /**
   * Execute a shell command
   */
  private async executeCommand(command: string): Promise<ShellExecutionResult> {
    // Add to history
    if (command && !this.commandHistory.includes(command)) {
      this.commandHistory.push(command);
      // Keep history size reasonable
      if (this.commandHistory.length > 100) {
        this.commandHistory.shift();
      }
    }
    this.historyIndex = -1;

    // Execute command
    const result = await this.processor.executeCommand(command);
    
    // Update working directory if command was 'cd'
    if (command.trim().startsWith('cd ') && result.exitCode === 0) {
      try {
        const newDir = command.trim().substring(3).trim();
        if (newDir) {
          this.processor.setWorkingDirectory(newDir);
          this.emit('workingDirectoryChanged', this.processor.getWorkingDirectory());
        }
      } catch (error) {
        // Ignore cd errors, the command output will show the error
      }
    }

    return result;
  }

  /**
   * Get command history
   */
  getCommandHistory(): string[] {
    return [...this.commandHistory];
  }

  /**
   * Get previous command from history
   */
  getPreviousCommand(): string | null {
    if (this.commandHistory.length === 0) {
      return null;
    }

    if (this.historyIndex === -1) {
      this.historyIndex = this.commandHistory.length - 1;
    } else if (this.historyIndex > 0) {
      this.historyIndex--;
    }

    return this.commandHistory[this.historyIndex] || null;
  }

  /**
   * Get next command from history
   */
  getNextCommand(): string | null {
    if (this.commandHistory.length === 0 || this.historyIndex === -1) {
      return null;
    }

    if (this.historyIndex < this.commandHistory.length - 1) {
      this.historyIndex++;
      return this.commandHistory[this.historyIndex];
    } else {
      this.historyIndex = -1;
      return '';
    }
  }

  /**
   * Get current working directory
   */
  getWorkingDirectory(): string {
    return this.processor.getWorkingDirectory();
  }

  /**
   * Set working directory
   */
  setWorkingDirectory(directory: string): void {
    this.processor.setWorkingDirectory(directory);
    this.emit('workingDirectoryChanged', directory);
  }

  /**
   * Get session allowlist
   */
  getSessionAllowlist(): string[] {
    return this.processor.getSessionAllowlist();
  }

  /**
   * Clear session allowlist
   */
  clearSessionAllowlist(): void {
    this.processor.clearSessionAllowlist();
    this.emit('allowlistCleared');
  }

  /**
   * Get shell mode prompt
   */
  getShellPrompt(): string {
    const cwd = this.processor.getWorkingDirectory();
    const shortPath = cwd.replace(process.env.HOME || '', '~');
    return `shell:${shortPath}$ `;
  }
}
