/**
 * Session History Manager for LlamaCLI
 * Manages conversation history, session restoration, and branching
 */

import { EventEmitter } from "events";
import {
  SessionMetadata,
  SessionBranch,
  SessionStatus,
  PersistedSession,
  SessionStorageBackend,
} from "../types/session.js";
import { ChatMessage } from "../types/context.js";
import { generateSessionId } from "./session-utils.js";

/**
 * History snapshot for point-in-time restoration
 */
export interface HistorySnapshot {
  id: string;
  sessionId: string;
  timestamp: number;
  messageIndex: number;
  description?: string;
  chatHistory: ChatMessage[];
  contextSnapshot: any;
  metadata: {
    messageCount: number;
    tokenCount: number;
    toolCallCount: number;
  };
}

/**
 * Branch creation options
 */
export interface BranchOptions {
  name: string;
  description?: string;
  fromMessageIndex?: number;
  copyContext?: boolean;
  copyMemories?: boolean;
}

/**
 * Restoration options
 */
export interface RestorationOptions {
  restoreContext?: boolean;
  restoreMemories?: boolean;
  createBackup?: boolean;
  mergeStrategy?: "replace" | "merge" | "append";
}

/**
 * History search options
 */
export interface HistorySearchOptions {
  query: string;
  sessionIds?: string[];
  messageTypes?: ("user" | "assistant" | "system" | "tool")[];
  dateRange?: {
    start: number;
    end: number;
  };
  limit?: number;
  includeContext?: boolean;
}

/**
 * Search result
 */
export interface HistorySearchResult {
  sessionId: string;
  messageIndex: number;
  message: ChatMessage;
  context?: string;
  relevanceScore: number;
}

/**
 * Session History Manager Events
 */
export interface SessionHistoryManagerEvents {
  snapshotCreated: (snapshot: HistorySnapshot) => void;
  branchCreated: (branch: SessionBranch, parentSessionId: string) => void;
  sessionRestored: (sessionId: string, fromSnapshot: string) => void;
  historyCompressed: (sessionId: string, originalSize: number, compressedSize: number) => void;
  error: (error: Error, context?: string) => void;
}

/**
 * Session History Manager
 */
export class SessionHistoryManager extends EventEmitter {
  private storageBackend: SessionStorageBackend;
  private snapshots = new Map<string, HistorySnapshot[]>();
  private compressionThreshold: number;
  private maxSnapshotsPerSession: number;

  constructor(
    storageBackend: SessionStorageBackend,
    options: {
      compressionThreshold?: number;
      maxSnapshotsPerSession?: number;
    } = {}
  ) {
    super();
    this.storageBackend = storageBackend;
    this.compressionThreshold = options.compressionThreshold || 1000; // messages
    this.maxSnapshotsPerSession = options.maxSnapshotsPerSession || 50;
  }

  /**
   * Create a history snapshot
   */
  async createSnapshot(
    sessionId: string,
    description?: string,
    messageIndex?: number
  ): Promise<HistorySnapshot> {
    try {
      const session = await this.storageBackend.loadSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const targetIndex = messageIndex ?? session.chatHistory.length - 1;
      const historySlice = session.chatHistory.slice(0, targetIndex + 1);

      const snapshot: HistorySnapshot = {
        id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        timestamp: Date.now(),
        messageIndex: targetIndex,
        description,
        chatHistory: [...historySlice],
        contextSnapshot: {
          longTermMemory: [...session.context.longTermMemory],
          fileContext: [...session.context.fileContext],
          settings: { ...session.context.settings },
        },
        metadata: {
          messageCount: historySlice.length,
          tokenCount: this.estimateTokenCount(historySlice),
          toolCallCount: this.countToolCalls(historySlice),
        },
      };

      // Store snapshot
      const sessionSnapshots = this.snapshots.get(sessionId) || [];
      sessionSnapshots.push(snapshot);

      // Maintain snapshot limit
      if (sessionSnapshots.length > this.maxSnapshotsPerSession) {
        sessionSnapshots.shift(); // Remove oldest
      }

      this.snapshots.set(sessionId, sessionSnapshots);

      this.emit("snapshotCreated", snapshot);
      return snapshot;
    } catch (error) {
      this.emit("error", error as Error, "createSnapshot");
      throw error;
    }
  }

  /**
   * Create a session branch
   */
  async createBranch(parentSessionId: string, options: BranchOptions): Promise<string> {
    try {
      const parentSession = await this.storageBackend.loadSession(parentSessionId);
      if (!parentSession) {
        throw new Error(`Parent session ${parentSessionId} not found`);
      }

      const branchSessionId = generateSessionId();
      const branchPoint = options.fromMessageIndex ?? parentSession.chatHistory.length - 1;

      // Create branch metadata
      const branch: SessionBranch = {
        id: branchSessionId,
        name: options.name,
        description: options.description,
        parentSessionId,
        branchPoint,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      // Create branched session
      const branchedSession: PersistedSession = {
        metadata: {
          ...parentSession.metadata,
          id: branchSessionId,
          name: `${parentSession.metadata.name} - ${options.name}`,
          description: options.description,
          status: SessionStatus.ACTIVE,
          createdAt: Date.now(),
          lastActivity: Date.now(),
          lastSaved: 0,
          parentSessionId,
          branches: [],
          version: 1,
          checksum: "",
        },
        context: {
          ...parentSession.context,
          sessionId: branchSessionId,
          chatHistory: [],
          longTermMemory: options.copyMemories ? [...parentSession.context.longTermMemory] : [],
        },
        chatHistory: parentSession.chatHistory.slice(0, branchPoint + 1),
        contextItems: options.copyContext ? [...parentSession.contextItems] : [],
        memories: options.copyMemories ? [...parentSession.memories] : [],
        settings: { ...parentSession.settings },
      };

      // Update parent session to include branch reference
      parentSession.metadata.branches.push(branch);
      await this.storageBackend.saveSession(parentSession);

      // Save branched session
      await this.storageBackend.saveSession(branchedSession);

      this.emit("branchCreated", branch, parentSessionId);
      return branchSessionId;
    } catch (error) {
      this.emit("error", error as Error, "createBranch");
      throw error;
    }
  }

  /**
   * Restore session from snapshot
   */
  async restoreFromSnapshot(
    sessionId: string,
    snapshotId: string,
    options: RestorationOptions = {}
  ): Promise<void> {
    try {
      const sessionSnapshots = this.snapshots.get(sessionId);
      if (!sessionSnapshots) {
        throw new Error(`No snapshots found for session ${sessionId}`);
      }

      const snapshot = sessionSnapshots.find((s) => s.id === snapshotId);
      if (!snapshot) {
        throw new Error(`Snapshot ${snapshotId} not found`);
      }

      const session = await this.storageBackend.loadSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Create backup if requested
      if (options.createBackup) {
        await this.createSnapshot(sessionId, "Pre-restoration backup");
      }

      // Restore chat history
      switch (options.mergeStrategy) {
        case "replace":
          session.chatHistory = [...snapshot.chatHistory];
          break;
        case "merge":
          // Merge by keeping unique messages
          const existingIds = new Set(session.chatHistory.map((m) => m.id));
          const newMessages = snapshot.chatHistory.filter((m) => !existingIds.has(m.id));
          session.chatHistory = [...session.chatHistory, ...newMessages];
          break;
        case "append":
          session.chatHistory = [...session.chatHistory, ...snapshot.chatHistory];
          break;
        default:
          session.chatHistory = [...snapshot.chatHistory];
      }

      // Restore context if requested
      if (options.restoreContext && snapshot.contextSnapshot) {
        if (snapshot.contextSnapshot.longTermMemory) {
          session.context.longTermMemory = [...snapshot.contextSnapshot.longTermMemory];
        }
        if (snapshot.contextSnapshot.fileContext) {
          session.context.fileContext = [...snapshot.contextSnapshot.fileContext];
        }
        if (snapshot.contextSnapshot.settings) {
          session.context.settings = {
            ...session.context.settings,
            ...snapshot.contextSnapshot.settings,
          };
        }
      }

      // Restore memories if requested
      if (options.restoreMemories && snapshot.contextSnapshot?.memories) {
        session.memories = [...snapshot.contextSnapshot.memories];
      }

      // Update metadata
      session.metadata.lastActivity = Date.now();
      session.metadata.version += 1;

      // Save restored session
      await this.storageBackend.saveSession(session);

      this.emit("sessionRestored", sessionId, snapshotId);
    } catch (error) {
      this.emit("error", error as Error, "restoreFromSnapshot");
      throw error;
    }
  }

  /**
   * Search through session history
   */
  async searchHistory(options: HistorySearchOptions): Promise<HistorySearchResult[]> {
    try {
      const results: HistorySearchResult[] = [];
      const sessionIds = options.sessionIds || (await this.getAllSessionIds());

      for (const sessionId of sessionIds) {
        const session = await this.storageBackend.loadSession(sessionId);
        if (!session) continue;

        // Filter by date range
        if (options.dateRange) {
          const sessionTime = session.metadata.createdAt;
          if (sessionTime < options.dateRange.start || sessionTime > options.dateRange.end) {
            continue;
          }
        }

        // Search through messages
        for (let i = 0; i < session.chatHistory.length; i++) {
          const message = session.chatHistory[i];

          // Filter by message type
          if (options.messageTypes && !options.messageTypes.includes(message.role)) {
            continue;
          }

          // Search in message content
          const relevanceScore = this.calculateRelevanceScore(message.content, options.query);
          if (relevanceScore > 0.1) {
            // Minimum relevance threshold
            results.push({
              sessionId,
              messageIndex: i,
              message,
              context: options.includeContext ? this.getMessageContext(session, i) : undefined,
              relevanceScore,
            });
          }
        }
      }

      // Sort by relevance and apply limit
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);

      if (options.limit) {
        return results.slice(0, options.limit);
      }

      return results;
    } catch (error) {
      this.emit("error", error as Error, "searchHistory");
      throw error;
    }
  }

  /**
   * Get all snapshots for a session
   */
  getSessionSnapshots(sessionId: string): HistorySnapshot[] {
    return this.snapshots.get(sessionId) || [];
  }

  /**
   * Delete a snapshot
   */
  deleteSnapshot(sessionId: string, snapshotId: string): boolean {
    const sessionSnapshots = this.snapshots.get(sessionId);
    if (!sessionSnapshots) return false;

    const index = sessionSnapshots.findIndex((s) => s.id === snapshotId);
    if (index === -1) return false;

    sessionSnapshots.splice(index, 1);
    return true;
  }

  /**
   * Compress old history to save space
   */
  async compressHistory(sessionId: string, keepRecentCount: number = 100): Promise<void> {
    try {
      const session = await this.storageBackend.loadSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      if (session.chatHistory.length <= this.compressionThreshold) {
        return; // No compression needed
      }

      const originalSize = session.chatHistory.length;
      const recentMessages = session.chatHistory.slice(-keepRecentCount);
      const oldMessages = session.chatHistory.slice(0, -keepRecentCount);

      // Create compressed summary of old messages
      const compressedSummary = await this.createHistorySummary(oldMessages);

      // Replace old messages with summary
      const summaryMessage: ChatMessage = {
        id: `compressed_${Date.now()}`,
        role: "system",
        content: `[Compressed History Summary]\n${compressedSummary}`,
        timestamp: Date.now(),
      };

      session.chatHistory = [summaryMessage, ...recentMessages];

      // Update compression metadata
      session.compressionMetadata = {
        originalSize,
        compressedSize: session.chatHistory.length,
        algorithm: "summary",
        timestamp: Date.now(),
      };

      await this.storageBackend.saveSession(session);

      this.emit("historyCompressed", sessionId, originalSize, session.chatHistory.length);
    } catch (error) {
      this.emit("error", error as Error, "compressHistory");
      throw error;
    }
  }

  /**
   * Get session branches
   */
  async getSessionBranches(sessionId: string): Promise<SessionBranch[]> {
    try {
      const session = await this.storageBackend.loadSession(sessionId);
      return session?.metadata.branches || [];
    } catch (error) {
      this.emit("error", error as Error, "getSessionBranches");
      return [];
    }
  }

  /**
   * Merge branch back to parent
   */
  async mergeBranch(
    branchSessionId: string,
    mergeStrategy: "append" | "replace" | "smart" = "smart"
  ): Promise<void> {
    try {
      const branchSession = await this.storageBackend.loadSession(branchSessionId);
      if (!branchSession || !branchSession.metadata.parentSessionId) {
        throw new Error("Invalid branch session or missing parent");
      }

      const parentSession = await this.storageBackend.loadSession(
        branchSession.metadata.parentSessionId
      );
      if (!parentSession) {
        throw new Error("Parent session not found");
      }

      // Create backup before merge
      await this.createSnapshot(branchSession.metadata.parentSessionId, "Pre-merge backup");

      // Perform merge based on strategy
      switch (mergeStrategy) {
        case "append":
          parentSession.chatHistory = [...parentSession.chatHistory, ...branchSession.chatHistory];
          break;
        case "replace":
          parentSession.chatHistory = [...branchSession.chatHistory];
          break;
        case "smart":
          // Smart merge: avoid duplicates and maintain chronological order
          await this.performSmartMerge(parentSession, branchSession);
          break;
      }

      // Update parent session
      parentSession.metadata.lastActivity = Date.now();
      parentSession.metadata.version += 1;

      // Remove branch reference
      parentSession.metadata.branches = parentSession.metadata.branches.filter(
        (b) => b.id !== branchSessionId
      );

      await this.storageBackend.saveSession(parentSession);

      // Optionally delete branch session
      // await this.storageBackend.deleteSession(branchSessionId);
    } catch (error) {
      this.emit("error", error as Error, "mergeBranch");
      throw error;
    }
  }

  // Private helper methods
  private async getAllSessionIds(): Promise<string[]> {
    const sessions = await this.storageBackend.listSessions();
    return sessions.map((s) => s.id);
  }

  private estimateTokenCount(messages: ChatMessage[]): number {
    // Simple token estimation - in production, use proper tokenizer
    return messages.reduce((total, msg) => total + Math.ceil(msg.content.length / 4), 0);
  }

  private countToolCalls(messages: ChatMessage[]): number {
    return messages.filter((msg) => msg.tool_calls && msg.tool_calls.length > 0).length;
  }

  private calculateRelevanceScore(content: string, query: string): number {
    // Simple relevance scoring - in production, use proper text similarity
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();

    if (lowerContent.includes(lowerQuery)) {
      return 1.0;
    }

    const queryWords = lowerQuery.split(/\s+/);
    const matchingWords = queryWords.filter((word) => lowerContent.includes(word));

    return matchingWords.length / queryWords.length;
  }

  private getMessageContext(session: PersistedSession, messageIndex: number): string {
    const contextRange = 2; // Messages before and after
    const start = Math.max(0, messageIndex - contextRange);
    const end = Math.min(session.chatHistory.length, messageIndex + contextRange + 1);

    return session.chatHistory
      .slice(start, end)
      .map((msg) => `${msg.role}: ${msg.content.substring(0, 100)}...`)
      .join("\n");
  }

  private async createHistorySummary(messages: ChatMessage[]): Promise<string> {
    // Simple summary creation - in production, use LLM for better summaries
    const userMessages = messages.filter((m) => m.role === "user").length;
    const assistantMessages = messages.filter((m) => m.role === "assistant").length;
    const toolCalls = this.countToolCalls(messages);

    return `Compressed ${messages.length} messages (${userMessages} user, ${assistantMessages} assistant, ${toolCalls} tool calls) from conversation history.`;
  }

  private async performSmartMerge(
    parentSession: PersistedSession,
    branchSession: PersistedSession
  ): Promise<void> {
    // Smart merge implementation - avoid duplicates, maintain order
    const parentIds = new Set(parentSession.chatHistory.map((m) => m.id));
    const newMessages = branchSession.chatHistory.filter((m) => !parentIds.has(m.id));

    // Merge and sort by timestamp
    const allMessages = [...parentSession.chatHistory, ...newMessages];
    allMessages.sort((a, b) => a.timestamp - b.timestamp);

    parentSession.chatHistory = allMessages;
  }
}
