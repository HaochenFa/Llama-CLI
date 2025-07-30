/**
 * Session Management Utilities for LlamaCLI
 * Provides helper functions for session operations and data manipulation
 */

import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

import {
  PersistedSession,
  SessionMetadata,
  SessionStatus,
  SessionPriority,
  SessionStats,
  SessionExportFormat,
  SessionExportOptions,
  SessionImportResult
} from '../types/session.js';
import { ChatMessage } from '../types/context.js';

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomBytes = crypto.randomBytes(6).toString('hex');
  return `session_${timestamp}_${randomBytes}`;
}

/**
 * Calculate session data checksum
 */
export function calculateSessionChecksum(session: PersistedSession): string {
  const data = JSON.stringify({
    context: session.context,
    chatHistory: session.chatHistory,
    contextItems: session.contextItems,
    memories: session.memories,
  });
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Validate session data integrity
 */
export function validateSessionIntegrity(session: PersistedSession): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields
  if (!session.metadata?.id) {
    errors.push('Session metadata missing or invalid ID');
  }

  if (!session.context?.sessionId) {
    errors.push('Session context missing or invalid session ID');
  }

  if (session.metadata?.id !== session.context?.sessionId) {
    errors.push('Session ID mismatch between metadata and context');
  }

  // Validate checksum
  const expectedChecksum = calculateSessionChecksum(session);
  if (session.metadata?.checksum !== expectedChecksum) {
    errors.push('Session checksum validation failed');
  }

  // Validate timestamps
  if (session.metadata?.createdAt > Date.now()) {
    errors.push('Invalid creation timestamp (future date)');
  }

  if (session.metadata?.lastActivity < session.metadata?.createdAt) {
    errors.push('Last activity timestamp is before creation timestamp');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Estimate session size in bytes
 */
export function estimateSessionSize(session: PersistedSession): number {
  return Buffer.byteLength(JSON.stringify(session), 'utf8');
}

/**
 * Compress session data for storage
 */
export async function compressSessionData(data: string): Promise<string> {
  // Simple base64 compression - in production, use zlib
  const compressed = Buffer.from(data).toString('base64');
  return `compressed:${compressed}`;
}

/**
 * Decompress session data
 */
export async function decompressSessionData(compressedData: string): Promise<string> {
  if (!compressedData.startsWith('compressed:')) {
    return compressedData; // Not compressed
  }
  
  const compressed = compressedData.replace('compressed:', '');
  return Buffer.from(compressed, 'base64').toString('utf8');
}

/**
 * Create empty session statistics
 */
export function createEmptySessionStats(): SessionStats {
  return {
    messageCount: 0,
    toolCallCount: 0,
    totalTokensUsed: 0,
    averageResponseTime: 0,
    successfulToolCalls: 0,
    failedToolCalls: 0,
    totalDuration: 0,
    activeTime: 0,
    pausedTime: 0,
  };
}

/**
 * Update session statistics
 */
export function updateSessionStats(
  stats: SessionStats,
  updates: Partial<SessionStats>
): SessionStats {
  return {
    ...stats,
    ...updates,
  };
}

/**
 * Calculate session duration
 */
export function calculateSessionDuration(metadata: SessionMetadata): number {
  const endTime = metadata.completedAt || metadata.lastActivity;
  return endTime - metadata.createdAt;
}

/**
 * Format session duration for display
 */
export function formatSessionDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Get session status display color
 */
export function getSessionStatusColor(status: SessionStatus): string {
  switch (status) {
    case SessionStatus.ACTIVE:
      return 'green';
    case SessionStatus.PAUSED:
      return 'yellow';
    case SessionStatus.COMPLETED:
      return 'blue';
    case SessionStatus.ARCHIVED:
      return 'gray';
    case SessionStatus.ERROR:
      return 'red';
    default:
      return 'white';
  }
}

/**
 * Get session priority display symbol
 */
export function getSessionPrioritySymbol(priority: SessionPriority): string {
  switch (priority) {
    case SessionPriority.URGENT:
      return '🔴';
    case SessionPriority.HIGH:
      return '🟡';
    case SessionPriority.NORMAL:
      return '🟢';
    case SessionPriority.LOW:
      return '🔵';
    default:
      return '⚪';
  }
}

/**
 * Export session to different formats
 */
export async function exportSession(
  session: PersistedSession,
  options: SessionExportOptions
): Promise<string> {
  const exportData: any = {};

  if (options.includeMetadata !== false) {
    exportData.metadata = session.metadata;
  }

  if (options.includeHistory !== false) {
    exportData.chatHistory = session.chatHistory;
  }

  if (options.includeContext !== false) {
    exportData.context = session.context;
    exportData.contextItems = session.contextItems;
  }

  if (options.includeMemories !== false) {
    exportData.memories = session.memories;
  }

  let output: string;

  switch (options.format) {
    case SessionExportFormat.JSON:
      output = JSON.stringify(exportData, null, 2);
      break;

    case SessionExportFormat.YAML:
      // Simple YAML-like format - in production, use a proper YAML library
      output = convertToYaml(exportData);
      break;

    case SessionExportFormat.MARKDOWN:
      output = convertToMarkdown(exportData);
      break;

    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }

  if (options.compress) {
    output = await compressSessionData(output);
  }

  if (options.encryptionKey) {
    output = encryptData(output, options.encryptionKey);
  }

  return output;
}

/**
 * Import session from exported data
 */
export async function importSession(
  data: string,
  encryptionKey?: string
): Promise<SessionImportResult> {
  const result: SessionImportResult = {
    success: false,
    errors: [],
    warnings: [],
  };

  try {
    let processedData = data;

    // Decrypt if needed
    if (encryptionKey && data.startsWith('encrypted:')) {
      try {
        processedData = decryptData(data, encryptionKey);
      } catch (error) {
        result.errors.push('Failed to decrypt session data');
        return result;
      }
    }

    // Decompress if needed
    if (processedData.startsWith('compressed:')) {
      try {
        processedData = await decompressSessionData(processedData);
      } catch (error) {
        result.errors.push('Failed to decompress session data');
        return result;
      }
    }

    // Parse JSON
    let sessionData: any;
    try {
      sessionData = JSON.parse(processedData);
    } catch (error) {
      result.errors.push('Invalid JSON format');
      return result;
    }

    // Validate required fields
    if (!sessionData.metadata?.id) {
      result.errors.push('Missing session metadata or ID');
      return result;
    }

    // Generate new session ID to avoid conflicts
    const newSessionId = generateSessionId();
    sessionData.metadata.id = newSessionId;
    
    if (sessionData.context) {
      sessionData.context.sessionId = newSessionId;
    }

    result.success = true;
    result.sessionId = newSessionId;

    // Add warnings for missing data
    if (!sessionData.chatHistory) {
      result.warnings.push('No chat history found in import data');
    }

    if (!sessionData.context) {
      result.warnings.push('No context data found in import data');
    }

  } catch (error) {
    result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Sanitize session name for file system
 */
export function sanitizeSessionName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid filename characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 100); // Limit length
}

/**
 * Create session backup filename
 */
export function createBackupFilename(sessionId: string, timestamp?: number): string {
  const time = timestamp || Date.now();
  const dateStr = new Date(time).toISOString().replace(/[:.]/g, '-');
  return `${sessionId}_backup_${dateStr}.json`;
}

// Private helper functions
function convertToYaml(data: any): string {
  // Simple YAML conversion - in production, use a proper YAML library
  return JSON.stringify(data, null, 2)
    .replace(/"/g, '')
    .replace(/,$/gm, '')
    .replace(/^\s*{/gm, '')
    .replace(/^\s*}/gm, '');
}

function convertToMarkdown(data: any): string {
  let markdown = `# Session Export\n\n`;

  if (data.metadata) {
    markdown += `## Metadata\n\n`;
    markdown += `- **ID**: ${data.metadata.id}\n`;
    markdown += `- **Name**: ${data.metadata.name}\n`;
    markdown += `- **Status**: ${data.metadata.status}\n`;
    markdown += `- **Created**: ${new Date(data.metadata.createdAt).toISOString()}\n`;
    markdown += `- **Last Activity**: ${new Date(data.metadata.lastActivity).toISOString()}\n\n`;
  }

  if (data.chatHistory && data.chatHistory.length > 0) {
    markdown += `## Chat History\n\n`;
    for (const message of data.chatHistory) {
      markdown += `### ${message.role}\n\n`;
      markdown += `${message.content}\n\n`;
    }
  }

  return markdown;
}

function encryptData(data: string, key: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `encrypted:${encrypted}`;
}

function decryptData(data: string, key: string): string {
  const encrypted = data.replace('encrypted:', '');
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
