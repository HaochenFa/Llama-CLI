/**
 * Shell Command Processor for LlamaCLI
 * Handles shell command execution and shell mode
 */

import { spawn, ChildProcess } from 'child_process';
import * as os from 'os';
import * as path from 'path';

export interface ShellExecutionResult {
  command: string;
  output: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  error?: Error;
  aborted: boolean;
  pid?: number;
}

export interface ShellProcessorOptions {
  workingDirectory: string;
  timeout?: number;
  allowDangerousCommands?: boolean;
}

export class ShellProcessor {
  private workingDirectory: string;
  private timeout: number;
  private allowDangerousCommands: boolean;
  private sessionAllowlist: Set<string> = new Set();

  // Dangerous commands that require confirmation
  private static DANGEROUS_COMMANDS = new Set([
    'rm', 'rmdir', 'del', 'delete',
    'format', 'fdisk', 'mkfs',
    'dd', 'shred', 'wipe',
    'chmod', 'chown', 'chgrp',
    'sudo', 'su', 'doas',
    'passwd', 'useradd', 'userdel',
    'systemctl', 'service', 'launchctl',
    'reboot', 'shutdown', 'halt',
    'kill', 'killall', 'pkill',
    'mount', 'umount', 'unmount'
  ]);

  constructor(options: ShellProcessorOptions) {
    this.workingDirectory = options.workingDirectory;
    this.timeout = options.timeout || 30000; // 30 seconds default
    this.allowDangerousCommands = options.allowDangerousCommands || false;
  }

  /**
   * Check if input is a shell command (starts with !)
   */
  isShellCommand(input: string): boolean {
    return input.trim().startsWith('!');
  }

  /**
   * Check if input is shell mode toggle (just !)
   */
  isShellModeToggle(input: string): boolean {
    return input.trim() === '!';
  }

  /**
   * Parse shell command from input
   */
  parseShellCommand(input: string): string {
    const trimmed = input.trim();
    if (trimmed.startsWith('!')) {
      return trimmed.substring(1).trim();
    }
    return trimmed;
  }

  /**
   * Check if command is dangerous and needs confirmation
   */
  isDangerousCommand(command: string): boolean {
    if (this.allowDangerousCommands) {
      return false;
    }

    const commandParts = command.trim().split(/\s+/);
    const baseCommand = path.basename(commandParts[0] || '');
    
    return ShellProcessor.DANGEROUS_COMMANDS.has(baseCommand.toLowerCase());
  }

  /**
   * Check if command is allowed (either safe or in allowlist)
   */
  isCommandAllowed(command: string): boolean {
    if (!this.isDangerousCommand(command)) {
      return true;
    }

    const commandParts = command.trim().split(/\s+/);
    const baseCommand = path.basename(commandParts[0] || '');
    
    return this.sessionAllowlist.has(baseCommand.toLowerCase());
  }

  /**
   * Add command to session allowlist
   */
  allowCommand(command: string): void {
    const commandParts = command.trim().split(/\s+/);
    const baseCommand = path.basename(commandParts[0] || '');
    this.sessionAllowlist.add(baseCommand.toLowerCase());
  }

  /**
   * Execute shell command
   */
  async executeCommand(command: string): Promise<ShellExecutionResult> {
    return new Promise((resolve) => {
      const isWindows = os.platform() === 'win32';
      const shell = isWindows ? 'cmd.exe' : 'bash';
      const shellArgs = isWindows ? ['/c', command] : ['-c', command];

      let stdout = '';
      let stderr = '';
      let aborted = false;

      const child: ChildProcess = spawn(shell, shellArgs, {
        cwd: this.workingDirectory,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: !isWindows,
        env: {
          ...process.env,
          LLAMACLI: '1',
        },
      });

      // Set up timeout
      const timeoutId = setTimeout(() => {
        aborted = true;
        if (child.pid) {
          try {
            if (isWindows) {
              child.kill('SIGTERM');
            } else {
              // Kill the entire process group
              process.kill(-child.pid, 'SIGTERM');
            }
          } catch (error) {
            // Process might already be dead
          }
        }
      }, this.timeout);

      // Collect stdout
      if (child.stdout) {
        child.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
        });
      }

      // Collect stderr
      if (child.stderr) {
        child.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });
      }

      // Handle process completion
      child.on('exit', (code, signal) => {
        clearTimeout(timeoutId);
        
        resolve({
          command,
          output: stdout + (stderr ? `\n${stderr}` : ''),
          stdout,
          stderr,
          exitCode: code,
          signal,
          aborted,
          pid: child.pid,
        });
      });

      // Handle process errors
      child.on('error', (error) => {
        clearTimeout(timeoutId);
        
        resolve({
          command,
          output: '',
          stdout,
          stderr,
          exitCode: null,
          signal: null,
          error,
          aborted,
          pid: child.pid,
        });
      });
    });
  }

  /**
   * Get current working directory
   */
  getWorkingDirectory(): string {
    return this.workingDirectory;
  }

  /**
   * Set working directory
   */
  setWorkingDirectory(directory: string): void {
    this.workingDirectory = path.resolve(directory);
  }

  /**
   * Get session allowlist
   */
  getSessionAllowlist(): string[] {
    return Array.from(this.sessionAllowlist);
  }

  /**
   * Clear session allowlist
   */
  clearSessionAllowlist(): void {
    this.sessionAllowlist.clear();
  }
}
