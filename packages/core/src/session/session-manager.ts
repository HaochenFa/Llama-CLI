/**
 * Core Session Manager for LlamaCLI
 * Manages session lifecycle, persistence, and operations
 */

import { EventEmitter } from "events";
import crypto from "crypto";

import {
  SessionStorageBackend,
  PersistedSession,
  SessionMetadata,
  SessionFilter,
  SessionStatus,
  SessionPriority,
  SessionManagerConfig,
  SessionOperationResult,
  SessionExportOptions,
  SessionImportResult,
  SessionBranch,
  SessionStats,
} from "../types/session.js";
import { InternalContext, ChatMessage, ContextSettings } from "../types/context.js";
import { ContextItem, Memory } from "../core/enhanced-context-manager.js";
import { FileStorageBackend } from "./file-storage-backend.js";

/**
 * Session manager events
 */
export interface SessionManagerEvents {
  sessionCreated: (sessionId: string, metadata: SessionMetadata) => void;
  sessionLoaded: (sessionId: string, metadata: SessionMetadata) => void;
  sessionSaved: (sessionId: string, metadata: SessionMetadata) => void;
  sessionDeleted: (sessionId: string) => void;
  sessionStatusChanged: (
    sessionId: string,
    oldStatus: SessionStatus,
    newStatus: SessionStatus
  ) => void;
  autoSaveTriggered: (sessionId: string) => void;
  error: (error: Error, context?: string) => void;
}

/**
 * Active session state
 */
interface ActiveSession {
  metadata: SessionMetadata;
  context: InternalContext;
  chatHistory: ChatMessage[];
  contextItems: ContextItem[];
  memories: Memory[];
  settings: ContextSettings;
  isDirty: boolean;
  lastAutoSave: number;
}

/**
 * Core Session Manager
 */
export class SessionManager extends EventEmitter {
  private config: SessionManagerConfig;
  private activeSessions = new Map<string, ActiveSession>();
  private currentSessionId: string | null = null;
  private autoSaveTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<SessionManagerConfig>) {
    super();

    this.config = {
      storageBackend: new FileStorageBackend(),
      autoSaveInterval: 30000, // 30 seconds
      maxSessionAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      maxActiveSessions: 10,
      compressionThreshold: 1024 * 1024, // 1MB
      enableBranching: true,
      enableAutoCleanup: true,
      backupEnabled: true,
      backupInterval: 60 * 60 * 1000, // 1 hour
      ...config,
    };

    this.startAutoSave();
  }

  /**
   * Initialize the session manager
   */
  async initialize(): Promise<void> {
    try {
      await this.config.storageBackend.initialize();

      if (this.config.enableAutoCleanup) {
        await this.performAutoCleanup();
      }
    } catch (error) {
      this.emit("error", error as Error, "initialization");
      throw error;
    }
  }

  /**
   * Create a new session
   */
  async createSession(
    name: string,
    initialContext: InternalContext,
    options: {
      description?: string;
      priority?: SessionPriority;
      tags?: string[];
      parentSessionId?: string;
      branchPoint?: number;
    } = {}
  ): Promise<SessionOperationResult<string>> {
    try {
      const sessionId = this.generateSessionId();
      const now = Date.now();

      // Create session metadata
      const metadata: SessionMetadata = {
        id: sessionId,
        name,
        description: options.description,
        status: SessionStatus.ACTIVE,
        priority: options.priority || SessionPriority.NORMAL,
        tags: options.tags || [],
        createdAt: now,
        lastActivity: now,
        lastSaved: 0,
        activeProfile: initialContext.activeProfile,
        workingDirectory: initialContext.workingDirectory || process.cwd(),
        initialGoal: options.description,
        stats: this.createEmptyStats(),
        parentSessionId: options.parentSessionId,
        branches: [],
        version: 1,
        checksum: "",
      };

      // Create active session
      const activeSession: ActiveSession = {
        metadata,
        context: initialContext,
        chatHistory: [...initialContext.chatHistory],
        contextItems: [],
        memories: [],
        settings: initialContext.settings,
        isDirty: true,
        lastAutoSave: 0,
      };

      // Check session limits
      if (this.activeSessions.size >= this.config.maxActiveSessions) {
        await this.evictOldestSession();
      }

      // Add to active sessions
      this.activeSessions.set(sessionId, activeSession);
      this.currentSessionId = sessionId;

      // Handle branching
      if (options.parentSessionId && this.config.enableBranching) {
        await this.createBranch(options.parentSessionId, sessionId, options.branchPoint || 0);
      }

      // Save initial state
      await this.saveSession(sessionId);

      this.emit("sessionCreated", sessionId, metadata);

      return {
        success: true,
        data: sessionId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.emit("error", error as Error, "createSession");

      return {
        success: false,
        error: `Failed to create session: ${errorMessage}`,
      };
    }
  }

  /**
   * Load an existing session
   */
  async loadSession(sessionId: string): Promise<SessionOperationResult<ActiveSession>> {
    try {
      // Check if already active
      const existingSession = this.activeSessions.get(sessionId);
      if (existingSession) {
        this.currentSessionId = sessionId;
        return {
          success: true,
          data: existingSession,
        };
      }

      // Load from storage
      const persistedSession = await this.config.storageBackend.loadSession(sessionId);
      if (!persistedSession) {
        return {
          success: false,
          error: `Session ${sessionId} not found`,
        };
      }

      // Create active session
      const activeSession: ActiveSession = {
        metadata: persistedSession.metadata,
        context: persistedSession.context,
        chatHistory: persistedSession.chatHistory,
        contextItems: persistedSession.contextItems || [],
        memories: persistedSession.memories || [],
        settings: persistedSession.settings,
        isDirty: false,
        lastAutoSave: Date.now(),
      };

      // Update last activity
      activeSession.metadata.lastActivity = Date.now();
      activeSession.isDirty = true;

      // Check session limits
      if (this.activeSessions.size >= this.config.maxActiveSessions) {
        await this.evictOldestSession();
      }

      // Add to active sessions
      this.activeSessions.set(sessionId, activeSession);
      this.currentSessionId = sessionId;

      this.emit("sessionLoaded", sessionId, activeSession.metadata);

      return {
        success: true,
        data: activeSession,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.emit("error", error as Error, "loadSession");

      return {
        success: false,
        error: `Failed to load session: ${errorMessage}`,
      };
    }
  }

  /**
   * Save a session
   */
  async saveSession(sessionId: string): Promise<SessionOperationResult<void>> {
    try {
      const activeSession = this.activeSessions.get(sessionId);
      if (!activeSession) {
        return {
          success: false,
          error: `Session ${sessionId} is not active`,
        };
      }

      // Create persisted session
      const persistedSession: PersistedSession = {
        metadata: activeSession.metadata,
        context: activeSession.context,
        chatHistory: activeSession.chatHistory,
        contextItems: activeSession.contextItems,
        memories: activeSession.memories,
        settings: activeSession.settings,
      };

      // Apply compression if needed
      if (this.shouldCompress(persistedSession)) {
        await this.compressSession(persistedSession);
      }

      // Save to storage
      await this.config.storageBackend.saveSession(persistedSession);

      // Update active session state
      activeSession.isDirty = false;
      activeSession.lastAutoSave = Date.now();
      activeSession.metadata.lastSaved = Date.now();

      this.emit("sessionSaved", sessionId, activeSession.metadata);

      return {
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.emit("error", error as Error, "saveSession");

      return {
        success: false,
        error: `Failed to save session: ${errorMessage}`,
      };
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<SessionOperationResult<void>> {
    try {
      // Remove from active sessions
      this.activeSessions.delete(sessionId);

      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
      }

      // Delete from storage
      const deleted = await this.config.storageBackend.deleteSession(sessionId);

      if (!deleted) {
        return {
          success: false,
          error: `Session ${sessionId} not found`,
        };
      }

      this.emit("sessionDeleted", sessionId);

      return {
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.emit("error", error as Error, "deleteSession");

      return {
        success: false,
        error: `Failed to delete session: ${errorMessage}`,
      };
    }
  }

  /**
   * List sessions with filtering
   */
  async listSessions(filter?: SessionFilter): Promise<SessionOperationResult<SessionMetadata[]>> {
    try {
      const sessions = await this.config.storageBackend.listSessions(filter);

      return {
        success: true,
        data: sessions,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.emit("error", error as Error, "listSessions");

      return {
        success: false,
        error: `Failed to list sessions: ${errorMessage}`,
      };
    }
  }

  /**
   * Update session status
   */
  async updateSessionStatus(
    sessionId: string,
    status: SessionStatus
  ): Promise<SessionOperationResult<void>> {
    try {
      const activeSession = this.activeSessions.get(sessionId);

      if (activeSession) {
        const oldStatus = activeSession.metadata.status;
        activeSession.metadata.status = status;
        activeSession.metadata.lastActivity = Date.now();
        activeSession.isDirty = true;

        this.emit("sessionStatusChanged", sessionId, oldStatus, status);

        // Auto-save after status change
        await this.saveSession(sessionId);
      } else {
        // Load session, update status, and save
        const loadResult = await this.loadSession(sessionId);
        if (!loadResult.success) {
          return {
            success: false,
            error: loadResult.error,
          };
        }

        return await this.updateSessionStatus(sessionId, status);
      }

      return {
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.emit("error", error as Error, "updateSessionStatus");

      return {
        success: false,
        error: `Failed to update session status: ${errorMessage}`,
      };
    }
  }

  /**
   * Get current active session
   */
  getCurrentSession(): ActiveSession | null {
    if (!this.currentSessionId) return null;
    return this.activeSessions.get(this.currentSessionId) || null;
  }

  /**
   * Switch to a different session
   */
  async switchToSession(sessionId: string): Promise<SessionOperationResult<ActiveSession>> {
    const loadResult = await this.loadSession(sessionId);
    if (loadResult.success) {
      this.currentSessionId = sessionId;
    }
    return loadResult;
  }

  /**
   * Update session context
   */
  updateSessionContext(sessionId: string, updates: Partial<InternalContext>): void {
    const activeSession = this.activeSessions.get(sessionId);
    if (activeSession) {
      Object.assign(activeSession.context, updates);
      activeSession.metadata.lastActivity = Date.now();
      activeSession.isDirty = true;
    }
  }

  /**
   * Add message to session
   */
  addMessage(sessionId: string, message: ChatMessage): void {
    const activeSession = this.activeSessions.get(sessionId);
    if (activeSession) {
      activeSession.chatHistory.push(message);
      activeSession.metadata.stats.messageCount++;
      activeSession.metadata.lastActivity = Date.now();
      activeSession.isDirty = true;
    }
  }

  /**
   * Add context item to session
   */
  addContextItem(sessionId: string, item: ContextItem): void {
    const activeSession = this.activeSessions.get(sessionId);
    if (activeSession) {
      activeSession.contextItems.push(item);
      activeSession.metadata.lastActivity = Date.now();
      activeSession.isDirty = true;
    }
  }

  /**
   * Add memory to session
   */
  addMemory(sessionId: string, memory: Memory): void {
    const activeSession = this.activeSessions.get(sessionId);
    if (activeSession) {
      activeSession.memories.push(memory);
      activeSession.metadata.lastActivity = Date.now();
      activeSession.isDirty = true;
    }
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    // Stop auto-save timer
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    // Save all dirty sessions
    const savePromises = Array.from(this.activeSessions.entries())
      .filter(([_, session]) => session.isDirty)
      .map(([sessionId, _]) => this.saveSession(sessionId));

    await Promise.allSettled(savePromises);

    // Clear active sessions
    this.activeSessions.clear();
    this.currentSessionId = null;
  }

  // Private helper methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
  }

  private createEmptyStats(): SessionStats {
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

  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(async () => {
      const now = Date.now();

      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (session.isDirty && now - session.lastAutoSave >= this.config.autoSaveInterval) {
          try {
            await this.saveSession(sessionId);
            this.emit("autoSaveTriggered", sessionId);
          } catch (error) {
            this.emit("error", error as Error, "autoSave");
          }
        }
      }
    }, this.config.autoSaveInterval);
  }

  private async evictOldestSession(): Promise<void> {
    let oldestSessionId: string | null = null;
    let oldestActivity = Date.now();

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.metadata.lastActivity < oldestActivity) {
        oldestActivity = session.metadata.lastActivity;
        oldestSessionId = sessionId;
      }
    }

    if (oldestSessionId) {
      // Save before evicting
      const session = this.activeSessions.get(oldestSessionId);
      if (session?.isDirty) {
        await this.saveSession(oldestSessionId);
      }

      this.activeSessions.delete(oldestSessionId);

      if (this.currentSessionId === oldestSessionId) {
        this.currentSessionId = null;
      }
    }
  }

  private async createBranch(
    parentSessionId: string,
    branchSessionId: string,
    branchPoint: number
  ): Promise<void> {
    // Implementation for creating session branches
    // This would update the parent session's metadata to include the new branch
  }

  private shouldCompress(session: PersistedSession): boolean {
    const size = JSON.stringify(session).length;
    return size > this.config.compressionThreshold;
  }

  private async compressSession(session: PersistedSession): Promise<void> {
    // Implementation for session compression
    // This would compress large chat histories and context items
  }

  private async performAutoCleanup(): Promise<void> {
    if (!this.config.enableAutoCleanup) return;

    try {
      await this.config.storageBackend.cleanup({
        maxAge: this.config.maxSessionAge,
        statusesToClean: [SessionStatus.COMPLETED, SessionStatus.ARCHIVED],
      });
    } catch (error) {
      this.emit("error", error as Error, "autoCleanup");
    }
  }
}
