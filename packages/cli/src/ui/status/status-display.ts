/**
 * Status Display Manager for LlamaCLI
 * Manages the footer status bar with system information
 */

import { EventEmitter } from 'events';
import { SystemInfoCollector, SystemInfo } from './system-info.js';
import { themeManager } from '../theme-manager.js';

export interface StatusDisplayOptions {
  workingDirectory: string;
  updateInterval?: number;
  showMemoryUsage?: boolean;
  showGitInfo?: boolean;
  showProcessInfo?: boolean;
}

export interface LLMStatus {
  provider?: string;
  model?: string;
  isConnected: boolean;
  contextUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface SessionStatus {
  mode: 'normal' | 'shell' | 'chat';
  activeSession?: string;
  messageCount?: number;
}

export class StatusDisplayManager extends EventEmitter {
  private systemInfoCollector: SystemInfoCollector;
  private workingDirectory: string;
  private updateInterval: number;
  private showMemoryUsage: boolean;
  private showGitInfo: boolean;
  private showProcessInfo: boolean;
  private intervalId?: NodeJS.Timeout;
  private currentSystemInfo?: SystemInfo;
  private currentLLMStatus?: LLMStatus;
  private currentSessionStatus: SessionStatus;

  constructor(options: StatusDisplayOptions) {
    super();
    
    this.systemInfoCollector = new SystemInfoCollector();
    this.workingDirectory = options.workingDirectory;
    this.updateInterval = options.updateInterval || 2000; // 2 seconds
    this.showMemoryUsage = options.showMemoryUsage !== false;
    this.showGitInfo = options.showGitInfo !== false;
    this.showProcessInfo = options.showProcessInfo !== false;
    
    this.currentSessionStatus = {
      mode: 'normal'
    };
  }

  /**
   * Start the status display updates
   */
  start(): void {
    if (this.intervalId) {
      return;
    }

    // Initial update
    this.updateSystemInfo();

    // Set up periodic updates
    this.intervalId = setInterval(() => {
      this.updateSystemInfo();
    }, this.updateInterval);
  }

  /**
   * Stop the status display updates
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Update working directory
   */
  setWorkingDirectory(directory: string): void {
    this.workingDirectory = directory;
    this.updateSystemInfo();
  }

  /**
   * Update LLM status
   */
  setLLMStatus(status: LLMStatus): void {
    this.currentLLMStatus = status;
    this.emit('statusChanged');
  }

  /**
   * Update session status
   */
  setSessionStatus(status: Partial<SessionStatus>): void {
    this.currentSessionStatus = { ...this.currentSessionStatus, ...status };
    this.emit('statusChanged');
  }

  /**
   * Get current status line
   */
  getStatusLine(): string {
    if (!this.currentSystemInfo) {
      return '';
    }

    const theme = themeManager.getCurrentTheme();
    const parts: string[] = [];

    // Left section: Directory and Git info
    const leftParts: string[] = [];
    
    // Directory
    leftParts.push(theme.styles.info(this.currentSystemInfo.directory.shortened));
    
    // Git branch
    if (this.showGitInfo && this.currentSystemInfo.git.branch) {
      const gitInfo = this.currentSystemInfo.git.hasChanges 
        ? `(${this.currentSystemInfo.git.branch}*)`
        : `(${this.currentSystemInfo.git.branch})`;
      leftParts.push(theme.styles.muted(gitInfo));
    }

    // Session mode indicator
    if (this.currentSessionStatus.mode !== 'normal') {
      const modeIndicator = this.getModeIndicator();
      leftParts.push(modeIndicator);
    }

    parts.push(leftParts.join(' '));

    // Right section: LLM, Memory, Process info
    const rightParts: string[] = [];

    // LLM status
    if (this.currentLLMStatus) {
      const llmInfo = this.getLLMStatusString();
      rightParts.push(llmInfo);
    }

    // Memory usage
    if (this.showMemoryUsage) {
      const memoryColor = this.currentSystemInfo.memory.percentage > 80 
        ? theme.styles.error 
        : theme.styles.muted;
      rightParts.push(memoryColor(this.currentSystemInfo.memory.formatted));
    }

    // Process info
    if (this.showProcessInfo) {
      const uptime = this.formatUptime(this.currentSystemInfo.process.uptime);
      rightParts.push(theme.styles.muted(`↑${uptime}`));
    }

    if (rightParts.length > 0) {
      parts.push(rightParts.join(' | '));
    }

    return parts.join(' '.repeat(Math.max(1, 80 - parts.join('').length)));
  }

  /**
   * Get compact status line for narrow terminals
   */
  getCompactStatusLine(): string {
    if (!this.currentSystemInfo) {
      return '';
    }

    const theme = themeManager.getCurrentTheme();
    const parts: string[] = [];

    // Essential info only
    const dir = this.currentSystemInfo.directory.shortened;
    parts.push(theme.styles.info(dir.length > 20 ? '...' + dir.slice(-17) : dir));

    if (this.currentSystemInfo.git.branch) {
      parts.push(theme.styles.muted(`(${this.currentSystemInfo.git.branch})`));
    }

    if (this.currentLLMStatus?.model) {
      parts.push(theme.styles.highlight(this.currentLLMStatus.model));
    }

    if (this.showMemoryUsage) {
      parts.push(theme.styles.muted(this.currentSystemInfo.memory.formatted));
    }

    return parts.join(' ');
  }

  /**
   * Update system information
   */
  private async updateSystemInfo(): Promise<void> {
    try {
      this.currentSystemInfo = await this.systemInfoCollector.getSystemInfo(this.workingDirectory);
      this.emit('statusChanged');
    } catch (error) {
      // Silently fail - status display is not critical
    }
  }

  /**
   * Get mode indicator string
   */
  private getModeIndicator(): string {
    const theme = themeManager.getCurrentTheme();
    
    switch (this.currentSessionStatus.mode) {
      case 'shell':
        return theme.styles.warning('[SHELL]');
      case 'chat':
        return theme.styles.success('[CHAT]');
      default:
        return '';
    }
  }

  /**
   * Get LLM status string
   */
  private getLLMStatusString(): string {
    if (!this.currentLLMStatus) {
      return '';
    }

    const theme = themeManager.getCurrentTheme();
    const parts: string[] = [];

    // Model name
    if (this.currentLLMStatus.model) {
      const modelColor = this.currentLLMStatus.isConnected 
        ? theme.styles.success 
        : theme.styles.error;
      parts.push(modelColor(this.currentLLMStatus.model));
    }

    // Context usage
    if (this.currentLLMStatus.contextUsage) {
      const { percentage } = this.currentLLMStatus.contextUsage;
      const remaining = 100 - percentage;
      const contextColor = percentage > 80 
        ? theme.styles.error 
        : percentage > 60 
          ? theme.styles.warning 
          : theme.styles.muted;
      parts.push(contextColor(`(${remaining.toFixed(0)}% left)`));
    }

    return parts.join(' ');
  }

  /**
   * Format uptime in human-readable format
   */
  private formatUptime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.floor(seconds)}s`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h${minutes}m`;
    } else {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      return `${days}d${hours}h`;
    }
  }

  /**
   * Get current system info (for external access)
   */
  getCurrentSystemInfo(): SystemInfo | undefined {
    return this.currentSystemInfo;
  }

  /**
   * Get current LLM status (for external access)
   */
  getCurrentLLMStatus(): LLMStatus | undefined {
    return this.currentLLMStatus;
  }

  /**
   * Get current session status (for external access)
   */
  getCurrentSessionStatus(): SessionStatus {
    return this.currentSessionStatus;
  }
}
