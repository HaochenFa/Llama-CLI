/**
 * File-based Session Storage Backend for LlamaCLI
 * Implements persistent session storage using the file system
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

import {
  SessionStorageBackend,
  PersistedSession,
  SessionMetadata,
  SessionFilter,
  StorageStats,
  CleanupOptions,
  CleanupResult,
  SessionStatus,
  SessionPriority
} from '../types/session.js';

/**
 * File-based storage backend configuration
 */
export interface FileStorageConfig {
  storageDir?: string;
  enableCompression?: boolean;
  enableEncryption?: boolean;
  encryptionKey?: string;
  maxFileSize?: number;
  backupEnabled?: boolean;
}

/**
 * File-based session storage backend
 */
export class FileStorageBackend implements SessionStorageBackend {
  private storageDir: string;
  private metadataDir: string;
  private dataDir: string;
  private backupDir: string;
  private config: Required<FileStorageConfig>;

  constructor(config: FileStorageConfig = {}) {
    this.config = {
      storageDir: config.storageDir || path.join(os.homedir(), '.llamacli', 'sessions'),
      enableCompression: config.enableCompression ?? true,
      enableEncryption: config.enableEncryption ?? false,
      encryptionKey: config.encryptionKey || '',
      maxFileSize: config.maxFileSize || 50 * 1024 * 1024, // 50MB
      backupEnabled: config.backupEnabled ?? true,
    };

    this.storageDir = this.config.storageDir;
    this.metadataDir = path.join(this.storageDir, 'metadata');
    this.dataDir = path.join(this.storageDir, 'data');
    this.backupDir = path.join(this.storageDir, 'backups');
  }

  /**
   * Initialize the storage backend
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      await fs.mkdir(this.metadataDir, { recursive: true });
      await fs.mkdir(this.dataDir, { recursive: true });
      
      if (this.config.backupEnabled) {
        await fs.mkdir(this.backupDir, { recursive: true });
      }

      // Create index file if it doesn't exist
      const indexPath = path.join(this.storageDir, 'index.json');
      try {
        await fs.access(indexPath);
      } catch {
        await fs.writeFile(indexPath, JSON.stringify({ sessions: [], lastUpdated: Date.now() }));
      }
    } catch (error) {
      throw new Error(`Failed to initialize file storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save a session to storage
   */
  async saveSession(session: PersistedSession): Promise<void> {
    const sessionId = session.metadata.id;
    
    try {
      // Update metadata
      session.metadata.lastSaved = Date.now();
      session.metadata.version += 1;
      session.metadata.checksum = this.calculateChecksum(session);

      // Create backup if enabled
      if (this.config.backupEnabled && await this.sessionExists(sessionId)) {
        await this.createBackup(sessionId);
      }

      // Save metadata
      const metadataPath = path.join(this.metadataDir, `${sessionId}.json`);
      await this.writeFileAtomic(metadataPath, JSON.stringify(session.metadata, null, 2));

      // Save session data
      const dataPath = path.join(this.dataDir, `${sessionId}.json`);
      let sessionData = JSON.stringify(session, null, 2);

      // Apply compression if enabled and data is large
      if (this.config.enableCompression && sessionData.length > 10000) {
        sessionData = await this.compressData(sessionData);
      }

      // Apply encryption if enabled
      if (this.config.enableEncryption && this.config.encryptionKey) {
        sessionData = this.encryptData(sessionData, this.config.encryptionKey);
      }

      await this.writeFileAtomic(dataPath, sessionData);

      // Update index
      await this.updateIndex(session.metadata);

    } catch (error) {
      throw new Error(`Failed to save session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load a session from storage
   */
  async loadSession(sessionId: string): Promise<PersistedSession | null> {
    try {
      const dataPath = path.join(this.dataDir, `${sessionId}.json`);
      
      // Check if session exists
      try {
        await fs.access(dataPath);
      } catch {
        return null;
      }

      let sessionData = await fs.readFile(dataPath, 'utf8');

      // Decrypt if needed
      if (this.config.enableEncryption && this.config.encryptionKey) {
        sessionData = this.decryptData(sessionData, this.config.encryptionKey);
      }

      // Decompress if needed
      if (sessionData.startsWith('compressed:')) {
        sessionData = await this.decompressData(sessionData);
      }

      const session: PersistedSession = JSON.parse(sessionData);

      // Verify checksum
      const expectedChecksum = this.calculateChecksum(session);
      if (session.metadata.checksum !== expectedChecksum) {
        console.warn(`Checksum mismatch for session ${sessionId}. Data may be corrupted.`);
      }

      return session;

    } catch (error) {
      throw new Error(`Failed to load session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a session from storage
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const metadataPath = path.join(this.metadataDir, `${sessionId}.json`);
      const dataPath = path.join(this.dataDir, `${sessionId}.json`);

      let deleted = false;

      // Delete metadata file
      try {
        await fs.unlink(metadataPath);
        deleted = true;
      } catch {
        // File might not exist
      }

      // Delete data file
      try {
        await fs.unlink(dataPath);
        deleted = true;
      } catch {
        // File might not exist
      }

      if (deleted) {
        // Remove from index
        await this.removeFromIndex(sessionId);
      }

      return deleted;

    } catch (error) {
      throw new Error(`Failed to delete session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all sessions with optional filtering
   */
  async listSessions(filter?: SessionFilter): Promise<SessionMetadata[]> {
    try {
      const metadataFiles = await fs.readdir(this.metadataDir);
      const sessions: SessionMetadata[] = [];

      for (const file of metadataFiles) {
        if (!file.endsWith('.json')) continue;

        try {
          const metadataPath = path.join(this.metadataDir, file);
          const metadataContent = await fs.readFile(metadataPath, 'utf8');
          const metadata: SessionMetadata = JSON.parse(metadataContent);

          if (this.matchesFilter(metadata, filter)) {
            sessions.push(metadata);
          }
        } catch (error) {
          console.warn(`Failed to read metadata file ${file}:`, error);
        }
      }

      // Apply sorting
      if (filter?.sortBy) {
        sessions.sort((a, b) => {
          const aValue = a[filter.sortBy!] as any;
          const bValue = b[filter.sortBy!] as any;
          const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          return filter.sortOrder === 'desc' ? -comparison : comparison;
        });
      }

      // Apply pagination
      const start = filter?.offset || 0;
      const end = filter?.limit ? start + filter.limit : undefined;
      return sessions.slice(start, end);

    } catch (error) {
      throw new Error(`Failed to list sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a session exists
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    try {
      const dataPath = path.join(this.dataDir, `${sessionId}.json`);
      await fs.access(dataPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    try {
      const sessions = await this.listSessions();
      let totalSize = 0;

      // Calculate total size
      for (const session of sessions) {
        try {
          const dataPath = path.join(this.dataDir, `${session.id}.json`);
          const stats = await fs.stat(dataPath);
          totalSize += stats.size;
        } catch {
          // File might not exist
        }
      }

      const sessionsByStatus: Record<SessionStatus, number> = {
        [SessionStatus.ACTIVE]: 0,
        [SessionStatus.PAUSED]: 0,
        [SessionStatus.COMPLETED]: 0,
        [SessionStatus.ARCHIVED]: 0,
        [SessionStatus.ERROR]: 0,
      };

      const sessionsByPriority: Record<SessionPriority, number> = {
        [SessionPriority.LOW]: 0,
        [SessionPriority.NORMAL]: 0,
        [SessionPriority.HIGH]: 0,
        [SessionPriority.URGENT]: 0,
      };

      let oldestSession = Date.now();
      let newestSession = 0;

      for (const session of sessions) {
        sessionsByStatus[session.status]++;
        sessionsByPriority[session.priority]++;
        
        if (session.createdAt < oldestSession) {
          oldestSession = session.createdAt;
        }
        if (session.createdAt > newestSession) {
          newestSession = session.createdAt;
        }
      }

      return {
        totalSessions: sessions.length,
        totalSize,
        averageSessionSize: sessions.length > 0 ? totalSize / sessions.length : 0,
        oldestSession,
        newestSession,
        sessionsByStatus,
        sessionsByPriority,
      };

    } catch (error) {
      throw new Error(`Failed to get storage stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleanup old or unused sessions
   */
  async cleanup(options: CleanupOptions = {}): Promise<CleanupResult> {
    const result: CleanupResult = {
      sessionsRemoved: 0,
      spaceFreed: 0,
      errors: [],
    };

    try {
      const sessions = await this.listSessions();
      const now = Date.now();

      for (const session of sessions) {
        let shouldRemove = false;

        // Check age
        if (options.maxAge && (now - session.lastActivity) > options.maxAge) {
          shouldRemove = true;
        }

        // Check status
        if (options.statusesToClean && options.statusesToClean.includes(session.status)) {
          shouldRemove = true;
        }

        if (shouldRemove) {
          try {
            if (!options.dryRun) {
              // Calculate size before deletion
              const dataPath = path.join(this.dataDir, `${session.id}.json`);
              try {
                const stats = await fs.stat(dataPath);
                result.spaceFreed += stats.size;
              } catch {
                // File might not exist
              }

              await this.deleteSession(session.id);
            }
            result.sessionsRemoved++;
          } catch (error) {
            result.errors.push(`Failed to remove session ${session.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Handle maxSessions limit
      if (options.maxSessions && sessions.length > options.maxSessions) {
        const sortedSessions = sessions.sort((a, b) => a.lastActivity - b.lastActivity);
        const sessionsToRemove = sortedSessions.slice(0, sessions.length - options.maxSessions);

        for (const session of sessionsToRemove) {
          try {
            if (!options.dryRun) {
              const dataPath = path.join(this.dataDir, `${session.id}.json`);
              try {
                const stats = await fs.stat(dataPath);
                result.spaceFreed += stats.size;
              } catch {
                // File might not exist
              }

              await this.deleteSession(session.id);
            }
            result.sessionsRemoved++;
          } catch (error) {
            result.errors.push(`Failed to remove session ${session.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

    } catch (error) {
      result.errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  // Private helper methods
  private calculateChecksum(session: PersistedSession): string {
    const data = JSON.stringify({
      context: session.context,
      chatHistory: session.chatHistory,
      contextItems: session.contextItems,
      memories: session.memories,
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private async writeFileAtomic(filePath: string, data: string): Promise<void> {
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, data, 'utf8');
    await fs.rename(tempPath, filePath);
  }

  private async compressData(data: string): Promise<string> {
    // Simple compression placeholder - in production, use zlib
    return `compressed:${Buffer.from(data).toString('base64')}`;
  }

  private async decompressData(data: string): Promise<string> {
    // Simple decompression placeholder - in production, use zlib
    const compressed = data.replace('compressed:', '');
    return Buffer.from(compressed, 'base64').toString('utf8');
  }

  private encryptData(data: string, key: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `encrypted:${encrypted}`;
  }

  private decryptData(data: string, key: string): string {
    const encrypted = data.replace('encrypted:', '');
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private async createBackup(sessionId: string): Promise<void> {
    if (!this.config.backupEnabled) return;

    try {
      const dataPath = path.join(this.dataDir, `${sessionId}.json`);
      const backupPath = path.join(this.backupDir, `${sessionId}_${Date.now()}.json`);
      await fs.copyFile(dataPath, backupPath);
    } catch (error) {
      console.warn(`Failed to create backup for session ${sessionId}:`, error);
    }
  }

  private async updateIndex(metadata: SessionMetadata): Promise<void> {
    // Implementation for updating session index
    // This would maintain a fast lookup index for sessions
  }

  private async removeFromIndex(sessionId: string): Promise<void> {
    // Implementation for removing session from index
  }

  private matchesFilter(metadata: SessionMetadata, filter?: SessionFilter): boolean {
    if (!filter) return true;

    if (filter.status && !filter.status.includes(metadata.status)) return false;
    if (filter.priority && !filter.priority.includes(metadata.priority)) return false;
    if (filter.tags && !filter.tags.some(tag => metadata.tags.includes(tag))) return false;
    if (filter.userId && metadata.userId !== filter.userId) return false;
    if (filter.projectId && metadata.projectId !== filter.projectId) return false;
    if (filter.createdAfter && metadata.createdAt < filter.createdAfter) return false;
    if (filter.createdBefore && metadata.createdAt > filter.createdBefore) return false;
    if (filter.lastActivityAfter && metadata.lastActivity < filter.lastActivityAfter) return false;
    if (filter.lastActivityBefore && metadata.lastActivity > filter.lastActivityBefore) return false;

    return true;
  }
}
