/**
 * Session Context Optimizer for LlamaCLI
 * Integrates session management with EnhancedContextManager for intelligent context optimization
 */

import { EventEmitter } from 'events';
import { 
  EnhancedContextManager, 
  ContextItem, 
  Memory, 
  MemoryConsolidation,
  CompressionResult 
} from '../core/enhanced-context-manager.js';
import { SessionManager } from './session-manager.js';
import { SessionHistoryManager, HistorySnapshot } from './session-history-manager.js';
import { 
  SessionStorageBackend, 
  PersistedSession, 
  SessionMetadata,
  SessionStatus 
} from '../types/session.js';
import { LLMAdapter } from '../types/adapters.js';

/**
 * Context optimization configuration
 */
export interface ContextOptimizationConfig {
  enableCrossSessionMemory: boolean;
  memoryRetentionDays: number;
  contextCompressionThreshold: number;
  maxContextItemsPerSession: number;
  enableSmartPruning: boolean;
  compressionScheduleInterval: number;
  memoryConsolidationInterval: number;
}

/**
 * Cross-session memory item
 */
export interface CrossSessionMemory {
  id: string;
  content: string;
  type: 'fact' | 'preference' | 'pattern' | 'skill';
  relevanceScore: number;
  sessionIds: string[];
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  tags: string[];
}

/**
 * Context optimization result
 */
export interface ContextOptimizationResult {
  sessionId: string;
  originalContextSize: number;
  optimizedContextSize: number;
  compressionRatio: number;
  memoriesExtracted: number;
  contextItemsPruned: number;
  crossSessionMemoriesAdded: number;
}

/**
 * Session Context Optimizer Events
 */
export interface SessionContextOptimizerEvents {
  contextOptimized: (result: ContextOptimizationResult) => void;
  memoryConsolidated: (sessionId: string, consolidation: MemoryConsolidation) => void;
  crossSessionMemoryCreated: (memory: CrossSessionMemory) => void;
  contextCompressed: (sessionId: string, result: CompressionResult) => void;
  error: (error: Error, context?: string) => void;
}

/**
 * Session Context Optimizer
 */
export class SessionContextOptimizer extends EventEmitter {
  private sessionManager: SessionManager;
  private historyManager: SessionHistoryManager;
  private contextManager: EnhancedContextManager;
  private storageBackend: SessionStorageBackend;
  private config: ContextOptimizationConfig;
  private crossSessionMemories = new Map<string, CrossSessionMemory>();
  private optimizationTimer: NodeJS.Timeout | null = null;

  constructor(
    sessionManager: SessionManager,
    historyManager: SessionHistoryManager,
    contextManager: EnhancedContextManager,
    storageBackend: SessionStorageBackend,
    llmAdapter: LLMAdapter,
    config: Partial<ContextOptimizationConfig> = {}
  ) {
    super();
    
    this.sessionManager = sessionManager;
    this.historyManager = historyManager;
    this.contextManager = contextManager;
    this.storageBackend = storageBackend;
    
    this.config = {
      enableCrossSessionMemory: true,
      memoryRetentionDays: 30,
      contextCompressionThreshold: 10000, // tokens
      maxContextItemsPerSession: 1000,
      enableSmartPruning: true,
      compressionScheduleInterval: 60 * 60 * 1000, // 1 hour
      memoryConsolidationInterval: 24 * 60 * 60 * 1000, // 24 hours
      ...config,
    };

    this.startOptimizationSchedule();
    this.loadCrossSessionMemories();
  }

  /**
   * Optimize context for a specific session
   */
  async optimizeSessionContext(sessionId: string): Promise<ContextOptimizationResult> {
    try {
      const activeSession = this.sessionManager.getCurrentSession();
      if (!activeSession || activeSession.metadata.id !== sessionId) {
        throw new Error(`Session ${sessionId} is not currently active`);
      }

      const originalContextSize = this.estimateContextSize(activeSession);
      let optimizedContextSize = originalContextSize;
      let memoriesExtracted = 0;
      let contextItemsPruned = 0;
      let crossSessionMemoriesAdded = 0;

      // Step 1: Extract and consolidate memories
      if (this.config.enableCrossSessionMemory) {
        const consolidation = await this.contextManager.consolidateMemories();
        memoriesExtracted = consolidation.consolidatedMemories.length;
        
        // Convert to cross-session memories
        for (const memory of consolidation.consolidatedMemories) {
          await this.createCrossSessionMemory(memory, sessionId);
          crossSessionMemoriesAdded++;
        }

        this.emit('memoryConsolidated', sessionId, consolidation);
      }

      // Step 2: Compress context if needed
      if (originalContextSize > this.config.contextCompressionThreshold) {
        const compressionResult = await this.contextManager.compressContext(
          activeSession.context.sessionId
        );
        
        optimizedContextSize = this.estimateContextSize(activeSession);
        this.emit('contextCompressed', sessionId, compressionResult);
      }

      // Step 3: Prune old context items
      if (this.config.enableSmartPruning) {
        contextItemsPruned = await this.pruneContextItems(activeSession);
        optimizedContextSize = this.estimateContextSize(activeSession);
      }

      // Step 4: Add relevant cross-session memories
      if (this.config.enableCrossSessionMemory) {
        await this.addRelevantCrossSessionMemories(activeSession);
      }

      // Update session
      this.sessionManager.updateSessionContext(sessionId, activeSession.context);

      const result: ContextOptimizationResult = {
        sessionId,
        originalContextSize,
        optimizedContextSize,
        compressionRatio: originalContextSize > 0 ? optimizedContextSize / originalContextSize : 1,
        memoriesExtracted,
        contextItemsPruned,
        crossSessionMemoriesAdded,
      };

      this.emit('contextOptimized', result);
      return result;

    } catch (error) {
      this.emit('error', error as Error, 'optimizeSessionContext');
      throw error;
    }
  }

  /**
   * Optimize all active sessions
   */
  async optimizeAllSessions(): Promise<ContextOptimizationResult[]> {
    const results: ContextOptimizationResult[] = [];
    
    try {
      const sessions = await this.sessionManager.listSessions({
        status: [SessionStatus.ACTIVE],
      });

      if (!sessions.success || !sessions.data) {
        return results;
      }

      for (const sessionMetadata of sessions.data) {
        try {
          const result = await this.optimizeSessionContext(sessionMetadata.id);
          results.push(result);
        } catch (error) {
          this.emit('error', error as Error, `optimizeAllSessions:${sessionMetadata.id}`);
        }
      }

    } catch (error) {
      this.emit('error', error as Error, 'optimizeAllSessions');
    }

    return results;
  }

  /**
   * Create cross-session memory from regular memory
   */
  async createCrossSessionMemory(
    memory: Memory,
    sessionId: string,
    type: CrossSessionMemory['type'] = 'fact'
  ): Promise<CrossSessionMemory> {
    const crossMemory: CrossSessionMemory = {
      id: `cross_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: memory.content,
      type,
      relevanceScore: memory.importance || 0.5,
      sessionIds: [sessionId],
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1,
      tags: memory.tags || [],
    };

    this.crossSessionMemories.set(crossMemory.id, crossMemory);
    await this.saveCrossSessionMemories();

    this.emit('crossSessionMemoryCreated', crossMemory);
    return crossMemory;
  }

  /**
   * Get relevant cross-session memories for a session
   */
  async getRelevantCrossSessionMemories(
    sessionId: string,
    currentGoal?: string,
    limit: number = 10
  ): Promise<CrossSessionMemory[]> {
    const relevantMemories: Array<{ memory: CrossSessionMemory; score: number }> = [];

    for (const memory of this.crossSessionMemories.values()) {
      // Skip memories from the same session
      if (memory.sessionIds.includes(sessionId)) {
        continue;
      }

      // Calculate relevance score
      let score = memory.relevanceScore;
      
      // Boost score based on access frequency
      score *= Math.log(memory.accessCount + 1);
      
      // Boost score based on recency
      const daysSinceAccess = (Date.now() - memory.lastAccessed) / (24 * 60 * 60 * 1000);
      score *= Math.exp(-daysSinceAccess / 7); // Decay over 7 days
      
      // Boost score based on goal relevance
      if (currentGoal) {
        const goalRelevance = this.calculateTextSimilarity(memory.content, currentGoal);
        score *= (1 + goalRelevance);
      }

      if (score > 0.1) { // Minimum relevance threshold
        relevantMemories.push({ memory, score });
      }
    }

    // Sort by relevance and return top results
    relevantMemories.sort((a, b) => b.score - a.score);
    return relevantMemories.slice(0, limit).map(item => {
      // Update access statistics
      item.memory.lastAccessed = Date.now();
      item.memory.accessCount++;
      return item.memory;
    });
  }

  /**
   * Clean up old cross-session memories
   */
  async cleanupCrossSessionMemories(): Promise<number> {
    const cutoffTime = Date.now() - (this.config.memoryRetentionDays * 24 * 60 * 60 * 1000);
    let removedCount = 0;

    for (const [id, memory] of this.crossSessionMemories.entries()) {
      if (memory.lastAccessed < cutoffTime && memory.accessCount < 3) {
        this.crossSessionMemories.delete(id);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      await this.saveCrossSessionMemories();
    }

    return removedCount;
  }

  /**
   * Export cross-session memories
   */
  async exportCrossSessionMemories(): Promise<CrossSessionMemory[]> {
    return Array.from(this.crossSessionMemories.values());
  }

  /**
   * Import cross-session memories
   */
  async importCrossSessionMemories(memories: CrossSessionMemory[]): Promise<void> {
    for (const memory of memories) {
      this.crossSessionMemories.set(memory.id, memory);
    }
    await this.saveCrossSessionMemories();
  }

  /**
   * Shutdown the optimizer
   */
  async shutdown(): Promise<void> {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = null;
    }
    
    await this.saveCrossSessionMemories();
  }

  // Private helper methods
  private startOptimizationSchedule(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
    }

    this.optimizationTimer = setInterval(async () => {
      try {
        await this.optimizeAllSessions();
        await this.cleanupCrossSessionMemories();
      } catch (error) {
        this.emit('error', error as Error, 'scheduledOptimization');
      }
    }, this.config.compressionScheduleInterval);
  }

  private estimateContextSize(activeSession: any): number {
    // Estimate context size in tokens
    let size = 0;
    
    // Chat history
    size += activeSession.chatHistory.reduce((total: number, msg: any) => 
      total + Math.ceil(msg.content.length / 4), 0);
    
    // Context items
    size += activeSession.contextItems.reduce((total: number, item: any) => 
      total + Math.ceil(item.content.length / 4), 0);
    
    // Memories
    size += activeSession.memories.reduce((total: number, memory: any) => 
      total + Math.ceil(memory.content.length / 4), 0);
    
    return size;
  }

  private async pruneContextItems(activeSession: any): Promise<number> {
    const maxItems = this.config.maxContextItemsPerSession;
    if (activeSession.contextItems.length <= maxItems) {
      return 0;
    }

    // Sort by relevance score and timestamp
    activeSession.contextItems.sort((a: ContextItem, b: ContextItem) => {
      const scoreA = a.relevanceScore * (1 + (Date.now() - a.timestamp) / (24 * 60 * 60 * 1000));
      const scoreB = b.relevanceScore * (1 + (Date.now() - b.timestamp) / (24 * 60 * 60 * 1000));
      return scoreB - scoreA;
    });

    const prunedCount = activeSession.contextItems.length - maxItems;
    activeSession.contextItems = activeSession.contextItems.slice(0, maxItems);
    
    return prunedCount;
  }

  private async addRelevantCrossSessionMemories(activeSession: any): Promise<void> {
    const currentGoal = activeSession.context.sessionMetadata?.initialGoal;
    const relevantMemories = await this.getRelevantCrossSessionMemories(
      activeSession.metadata.id,
      currentGoal,
      5
    );

    for (const memory of relevantMemories) {
      // Convert cross-session memory to context item
      const contextItem: ContextItem = {
        id: `cross_memory_${memory.id}`,
        type: 'memory',
        content: memory.content,
        timestamp: Date.now(),
        relevanceScore: memory.relevanceScore,
        metadata: {
          crossSessionMemory: true,
          originalSessionIds: memory.sessionIds,
          memoryType: memory.type,
        },
        tags: [...memory.tags, 'cross-session'],
        relationships: [],
      };

      activeSession.contextItems.push(contextItem);
    }
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple text similarity calculation
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  private async loadCrossSessionMemories(): Promise<void> {
    try {
      // Implementation would load from persistent storage
      // For now, initialize empty
      this.crossSessionMemories.clear();
    } catch (error) {
      this.emit('error', error as Error, 'loadCrossSessionMemories');
    }
  }

  private async saveCrossSessionMemories(): Promise<void> {
    try {
      // Implementation would save to persistent storage
      // For now, just log
      console.log(`Saved ${this.crossSessionMemories.size} cross-session memories`);
    } catch (error) {
      this.emit('error', error as Error, 'saveCrossSessionMemories');
    }
  }
}
