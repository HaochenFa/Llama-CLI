/**
 * System Information Collector for LlamaCLI
 * Collects various system and environment information for status display
 */

import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';

export interface SystemInfo {
  memory: {
    used: number;
    total: number;
    percentage: number;
    formatted: string;
  };
  git: {
    branch?: string;
    hasChanges?: boolean;
    repository?: string;
  };
  directory: {
    current: string;
    shortened: string;
    tildeified: string;
  };
  process: {
    uptime: number;
    pid: number;
    nodeVersion: string;
  };
}

export class SystemInfoCollector {
  private gitInfoCache: { branch?: string; hasChanges?: boolean; repository?: string } = {};
  private gitCacheTime: number = 0;
  private gitCacheTTL: number = 5000; // 5 seconds

  /**
   * Get current memory usage
   */
  getMemoryInfo(): SystemInfo['memory'] {
    const usage = process.memoryUsage();
    const totalSystemMemory = os.totalmem();
    const used = usage.rss;
    const percentage = (used / totalSystemMemory) * 100;

    return {
      used,
      total: totalSystemMemory,
      percentage,
      formatted: this.formatMemoryUsage(used)
    };
  }

  /**
   * Get Git information for current directory
   */
  async getGitInfo(workingDirectory: string): Promise<SystemInfo['git']> {
    const now = Date.now();
    
    // Return cached result if still valid
    if (now - this.gitCacheTime < this.gitCacheTTL) {
      return this.gitInfoCache;
    }

    try {
      const gitDir = await this.findGitDirectory(workingDirectory);
      if (!gitDir) {
        this.gitInfoCache = {};
        this.gitCacheTime = now;
        return this.gitInfoCache;
      }

      const [branch, hasChanges, repository] = await Promise.all([
        this.getCurrentBranch(gitDir),
        this.hasUncommittedChanges(gitDir),
        this.getRepositoryName(gitDir)
      ]);

      this.gitInfoCache = { branch, hasChanges, repository };
      this.gitCacheTime = now;
      
      return this.gitInfoCache;
    } catch (error) {
      this.gitInfoCache = {};
      this.gitCacheTime = now;
      return this.gitInfoCache;
    }
  }

  /**
   * Get directory information
   */
  getDirectoryInfo(workingDirectory: string): SystemInfo['directory'] {
    const homeDir = os.homedir();
    const tildeified = workingDirectory.startsWith(homeDir) 
      ? workingDirectory.replace(homeDir, '~')
      : workingDirectory;
    
    const shortened = this.shortenPath(tildeified, 50);

    return {
      current: workingDirectory,
      shortened,
      tildeified
    };
  }

  /**
   * Get process information
   */
  getProcessInfo(): SystemInfo['process'] {
    return {
      uptime: process.uptime(),
      pid: process.pid,
      nodeVersion: process.version
    };
  }

  /**
   * Get complete system information
   */
  async getSystemInfo(workingDirectory: string): Promise<SystemInfo> {
    const [memory, git, directory, processInfo] = await Promise.all([
      Promise.resolve(this.getMemoryInfo()),
      this.getGitInfo(workingDirectory),
      Promise.resolve(this.getDirectoryInfo(workingDirectory)),
      Promise.resolve(this.getProcessInfo())
    ]);

    return {
      memory,
      git,
      directory,
      process: processInfo
    };
  }

  /**
   * Format memory usage in human-readable format
   */
  private formatMemoryUsage(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)}${units[unitIndex]}`;
  }

  /**
   * Shorten path to fit within specified length
   */
  private shortenPath(fullPath: string, maxLength: number): string {
    if (fullPath.length <= maxLength) {
      return fullPath;
    }

    const parts = fullPath.split(path.sep);
    if (parts.length <= 2) {
      return fullPath;
    }

    // Try to keep the first and last parts
    let result = parts[0] + path.sep + '...' + path.sep + parts[parts.length - 1];
    
    if (result.length <= maxLength) {
      return result;
    }

    // If still too long, just truncate
    return '...' + fullPath.slice(-(maxLength - 3));
  }

  /**
   * Find Git directory starting from working directory
   */
  private async findGitDirectory(startDir: string): Promise<string | null> {
    let currentDir = startDir;
    
    while (currentDir !== path.dirname(currentDir)) {
      try {
        const gitDir = path.join(currentDir, '.git');
        const stats = await fs.stat(gitDir);
        
        if (stats.isDirectory()) {
          return currentDir;
        }
      } catch (error) {
        // Continue searching
      }
      
      currentDir = path.dirname(currentDir);
    }
    
    return null;
  }

  /**
   * Get current Git branch
   */
  private async getCurrentBranch(gitDir: string): Promise<string | undefined> {
    try {
      const headFile = path.join(gitDir, '.git', 'HEAD');
      const headContent = await fs.readFile(headFile, 'utf8');
      
      if (headContent.startsWith('ref: refs/heads/')) {
        return headContent.replace('ref: refs/heads/', '').trim();
      }
      
      // Detached HEAD
      return headContent.substring(0, 8);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Check if there are uncommitted changes
   */
  private async hasUncommittedChanges(gitDir: string): Promise<boolean> {
    return new Promise((resolve) => {
      const git = spawn('git', ['status', '--porcelain'], {
        cwd: gitDir,
        stdio: ['ignore', 'pipe', 'ignore']
      });

      let output = '';
      git.stdout?.on('data', (data) => {
        output += data.toString();
      });

      git.on('close', (code) => {
        resolve(code === 0 && output.trim().length > 0);
      });

      git.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Get repository name
   */
  private async getRepositoryName(gitDir: string): Promise<string | undefined> {
    try {
      const configFile = path.join(gitDir, '.git', 'config');
      const configContent = await fs.readFile(configFile, 'utf8');
      
      const remoteMatch = configContent.match(/\[remote "origin"\][\s\S]*?url = (.+)/);
      if (remoteMatch) {
        const url = remoteMatch[1].trim();
        const nameMatch = url.match(/\/([^\/]+?)(?:\.git)?$/);
        if (nameMatch) {
          return nameMatch[1];
        }
      }
      
      return undefined;
    } catch (error) {
      return undefined;
    }
  }
}
