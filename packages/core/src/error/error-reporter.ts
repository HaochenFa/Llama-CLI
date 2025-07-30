/**
 * Error Reporting System for LlamaCLI
 * Handles error logging, reporting, and analytics
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { userPreferencesManager } from '../config/user-preferences.js';
import { EnhancedError, ErrorContext } from './enhanced-error-handler.js';

export interface ErrorReport {
  id: string;
  timestamp: number;
  version: string;
  error: EnhancedError;
  environment: EnvironmentInfo;
  userConsent: boolean;
  sessionId?: string;
}

export interface EnvironmentInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
  osVersion: string;
  llamacliVersion: string;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  cwd: string;
  env: Record<string, string>;
}

export class ErrorReporter {
  private static instance: ErrorReporter;
  private reportsDir: string;
  private maxReports: number = 100;
  private maxReportAge: number = 30 * 24 * 60 * 60 * 1000; // 30 days

  constructor() {
    this.reportsDir = path.join(os.homedir(), '.llamacli', 'error-reports');
  }

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  /**
   * Report an error
   */
  async reportError(
    enhancedError: EnhancedError,
    sessionId?: string,
    userConsent: boolean = false
  ): Promise<string> {
    const reportId = this.generateReportId();
    
    const report: ErrorReport = {
      id: reportId,
      timestamp: Date.now(),
      version: '1.0.0', // TODO: Get from package.json
      error: enhancedError,
      environment: await this.collectEnvironmentInfo(),
      userConsent,
      sessionId,
    };

    // Save report locally
    await this.saveReport(report);

    // Clean up old reports
    await this.cleanupOldReports();

    // Send report if user consented and telemetry is enabled
    if (userConsent && await this.isTelemetryEnabled()) {
      await this.sendReport(report);
    }

    return reportId;
  }

  /**
   * Get error statistics
   */
  async getErrorStatistics(): Promise<{
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: number;
    oldestError?: number;
    newestError?: number;
  }> {
    await this.ensureReportsDir();
    
    const files = await fs.readdir(this.reportsDir);
    const reportFiles = files.filter(f => f.endsWith('.json'));
    
    const stats = {
      totalErrors: reportFiles.length,
      errorsByType: {} as Record<string, number>,
      recentErrors: 0,
      oldestError: undefined as number | undefined,
      newestError: undefined as number | undefined,
    };

    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    for (const file of reportFiles) {
      try {
        const reportPath = path.join(this.reportsDir, file);
        const data = await fs.readFile(reportPath, 'utf8');
        const report = JSON.parse(data) as ErrorReport;

        // Count by type
        const errorType = report.error.type;
        stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + 1;

        // Count recent errors
        if (report.timestamp > oneDayAgo) {
          stats.recentErrors++;
        }

        // Track oldest and newest
        if (!stats.oldestError || report.timestamp < stats.oldestError) {
          stats.oldestError = report.timestamp;
        }
        if (!stats.newestError || report.timestamp > stats.newestError) {
          stats.newestError = report.timestamp;
        }
      } catch (error) {
        // Skip corrupted report files
        console.debug(`Failed to read error report ${file}:`, error);
      }
    }

    return stats;
  }

  /**
   * List recent error reports
   */
  async getRecentReports(limit: number = 10): Promise<ErrorReport[]> {
    await this.ensureReportsDir();
    
    const files = await fs.readdir(this.reportsDir);
    const reportFiles = files.filter(f => f.endsWith('.json'));
    
    const reports: ErrorReport[] = [];
    
    for (const file of reportFiles) {
      try {
        const reportPath = path.join(this.reportsDir, file);
        const data = await fs.readFile(reportPath, 'utf8');
        const report = JSON.parse(data) as ErrorReport;
        reports.push(report);
      } catch (error) {
        // Skip corrupted files
      }
    }

    // Sort by timestamp (newest first) and limit
    return reports
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Export error reports
   */
  async exportReports(outputPath: string): Promise<void> {
    const reports = await this.getRecentReports(1000); // Export up to 1000 reports
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalReports: reports.length,
      reports: reports.map(report => ({
        ...report,
        // Remove sensitive information
        environment: {
          ...report.environment,
          env: {}, // Remove environment variables
          cwd: '[REDACTED]', // Remove current working directory
        },
      })),
    };

    await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2), 'utf8');
  }

  /**
   * Clear all error reports
   */
  async clearReports(): Promise<void> {
    await this.ensureReportsDir();
    
    const files = await fs.readdir(this.reportsDir);
    const reportFiles = files.filter(f => f.endsWith('.json'));
    
    for (const file of reportFiles) {
      const filePath = path.join(this.reportsDir, file);
      await fs.unlink(filePath);
    }
  }

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `error-${timestamp}-${random}`;
  }

  /**
   * Collect environment information
   */
  private async collectEnvironmentInfo(): Promise<EnvironmentInfo> {
    // Filter sensitive environment variables
    const safeEnvVars = ['NODE_ENV', 'LLAMACLI_DEBUG', 'LLAMACLI_CONFIG'];
    const env: Record<string, string> = {};
    
    for (const key of safeEnvVars) {
      if (process.env[key]) {
        env[key] = process.env[key]!;
      }
    }

    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      osVersion: os.release(),
      llamacliVersion: '1.0.0', // TODO: Get from package.json
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      cwd: process.cwd(),
      env,
    };
  }

  /**
   * Save report to local storage
   */
  private async saveReport(report: ErrorReport): Promise<void> {
    await this.ensureReportsDir();
    
    const filename = `${report.id}.json`;
    const filepath = path.join(this.reportsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2), 'utf8');
  }

  /**
   * Send report to remote service (if implemented)
   */
  private async sendReport(report: ErrorReport): Promise<void> {
    // TODO: Implement remote error reporting
    // This would send the report to a remote service for analysis
    console.debug(`Would send error report ${report.id} to remote service`);
  }

  /**
   * Check if telemetry is enabled
   */
  private async isTelemetryEnabled(): Promise<boolean> {
    try {
      await userPreferencesManager.initialize();
      const behaviorPrefs = userPreferencesManager.getBehaviorPreferences();
      return behaviorPrefs.sendTelemetry;
    } catch (error) {
      return false; // Default to disabled if preferences can't be loaded
    }
  }

  /**
   * Ensure reports directory exists
   */
  private async ensureReportsDir(): Promise<void> {
    try {
      await fs.access(this.reportsDir);
    } catch {
      await fs.mkdir(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Clean up old error reports
   */
  private async cleanupOldReports(): Promise<void> {
    await this.ensureReportsDir();
    
    const files = await fs.readdir(this.reportsDir);
    const reportFiles = files.filter(f => f.endsWith('.json'));
    
    if (reportFiles.length <= this.maxReports) {
      return; // No cleanup needed
    }

    // Get file stats and sort by modification time
    const fileStats = await Promise.all(
      reportFiles.map(async (file) => {
        const filepath = path.join(this.reportsDir, file);
        const stats = await fs.stat(filepath);
        return { file, mtime: stats.mtime.getTime(), filepath };
      })
    );

    fileStats.sort((a, b) => a.mtime - b.mtime);

    // Remove oldest files to stay within limit
    const filesToRemove = fileStats.slice(0, fileStats.length - this.maxReports);
    
    for (const { filepath } of filesToRemove) {
      try {
        await fs.unlink(filepath);
      } catch (error) {
        console.debug(`Failed to remove old error report ${filepath}:`, error);
      }
    }

    // Also remove files older than maxReportAge
    const cutoffTime = Date.now() - this.maxReportAge;
    const oldFiles = fileStats.filter(({ mtime }) => mtime < cutoffTime);
    
    for (const { filepath } of oldFiles) {
      try {
        await fs.unlink(filepath);
      } catch (error) {
        console.debug(`Failed to remove old error report ${filepath}:`, error);
      }
    }
  }
}

// Export singleton instance
export const errorReporter = ErrorReporter.getInstance();
