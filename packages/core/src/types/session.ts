/**
 * Session Management Types for LlamaCLI
 * Defines interfaces for session storage, persistence, and management
 */

import { ChatMessage, InternalContext, ContextSettings } from './context.js';
import { ContextItem, Memory } from '../core/enhanced-context-manager.js';

/**
 * Session status enumeration
 */
export enum SessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
  ERROR = 'error'
}

/**
 * Session priority levels
 */
export enum SessionPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Session branch information
 */
export interface SessionBranch {
  id: string;
  name: string;
  description?: string;
  parentSessionId: string;
  branchPoint: number; // Message index where branch was created
  createdAt: number;
  lastActivity: number;
}

/**
 * Session statistics
 */
export interface SessionStats {
  messageCount: number;
  toolCallCount: number;
  totalTokensUsed: number;
  averageResponseTime: number;
  successfulToolCalls: number;
  failedToolCalls: number;
  totalDuration: number;
  activeTime: number;
  pausedTime: number;
}

/**
 * Session metadata with comprehensive tracking
 */
export interface SessionMetadata {
  id: string;
  name: string;
  description?: string;
  status: SessionStatus;
  priority: SessionPriority;
  tags: string[];
  
  // Timestamps
  createdAt: number;
  lastActivity: number;
  lastSaved: number;
  completedAt?: number;
  
  // Context information
  activeProfile: string;
  workingDirectory: string;
  initialGoal?: string;
  
  // Statistics
  stats: SessionStats;
  
  // Branching
  parentSessionId?: string;
  branches: SessionBranch[];
  
  // User metadata
  userId?: string;
  projectId?: string;
  
  // Version control
  version: number;
  checksum: string;
}

/**
 * Persisted session data structure
 */
export interface PersistedSession {
  metadata: SessionMetadata;
  context: InternalContext;
  chatHistory: ChatMessage[];
  contextItems: ContextItem[];
  memories: Memory[];
  settings: ContextSettings;
  
  // Compressed data for large sessions
  compressedHistory?: string;
  compressionMetadata?: {
    originalSize: number;
    compressedSize: number;
    algorithm: string;
    timestamp: number;
  };
}

/**
 * Session storage backend interface
 */
export interface SessionStorageBackend {
  /**
   * Initialize the storage backend
   */
  initialize(): Promise<void>;
  
  /**
   * Save a session to storage
   */
  saveSession(session: PersistedSession): Promise<void>;
  
  /**
   * Load a session from storage
   */
  loadSession(sessionId: string): Promise<PersistedSession | null>;
  
  /**
   * Delete a session from storage
   */
  deleteSession(sessionId: string): Promise<boolean>;
  
  /**
   * List all sessions with optional filtering
   */
  listSessions(filter?: SessionFilter): Promise<SessionMetadata[]>;
  
  /**
   * Check if a session exists
   */
  sessionExists(sessionId: string): Promise<boolean>;
  
  /**
   * Get storage statistics
   */
  getStorageStats(): Promise<StorageStats>;
  
  /**
   * Cleanup old or unused sessions
   */
  cleanup(options?: CleanupOptions): Promise<CleanupResult>;
}

/**
 * Session filtering options
 */
export interface SessionFilter {
  status?: SessionStatus[];
  priority?: SessionPriority[];
  tags?: string[];
  userId?: string;
  projectId?: string;
  createdAfter?: number;
  createdBefore?: number;
  lastActivityAfter?: number;
  lastActivityBefore?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'lastActivity' | 'name' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Storage statistics
 */
export interface StorageStats {
  totalSessions: number;
  totalSize: number;
  averageSessionSize: number;
  oldestSession: number;
  newestSession: number;
  sessionsByStatus: Record<SessionStatus, number>;
  sessionsByPriority: Record<SessionPriority, number>;
}

/**
 * Cleanup options
 */
export interface CleanupOptions {
  maxAge?: number; // Maximum age in milliseconds
  maxSessions?: number; // Maximum number of sessions to keep
  statusesToClean?: SessionStatus[];
  dryRun?: boolean;
}

/**
 * Cleanup result
 */
export interface CleanupResult {
  sessionsRemoved: number;
  spaceFreed: number;
  errors: string[];
}

/**
 * Session export/import formats
 */
export enum SessionExportFormat {
  JSON = 'json',
  YAML = 'yaml',
  MARKDOWN = 'markdown'
}

/**
 * Session export options
 */
export interface SessionExportOptions {
  format: SessionExportFormat;
  includeMetadata?: boolean;
  includeHistory?: boolean;
  includeContext?: boolean;
  includeMemories?: boolean;
  compress?: boolean;
  encryptionKey?: string;
}

/**
 * Session import result
 */
export interface SessionImportResult {
  success: boolean;
  sessionId?: string;
  errors: string[];
  warnings: string[];
}

/**
 * Session manager configuration
 */
export interface SessionManagerConfig {
  storageBackend: SessionStorageBackend;
  autoSaveInterval: number; // Auto-save interval in milliseconds
  maxSessionAge: number; // Maximum session age before archiving
  maxActiveSessions: number; // Maximum number of active sessions
  compressionThreshold: number; // Size threshold for compression
  enableBranching: boolean;
  enableAutoCleanup: boolean;
  backupEnabled: boolean;
  backupInterval: number;
}

/**
 * Session operation result
 */
export interface SessionOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}
