/**
 * Enhanced Context Manager for LlamaCLI
 * Provides intelligent context compression, memory management, and relevance scoring
 */

import { LLMAdapter } from '../types/adapters.js';
import { ChatMessage } from '../types/context.js';
import { AgentStep, AgentContext } from './agentic-loop.js';

/**
 * Context item with relevance scoring
 */
export interface ContextItem {
  id: string;
  type: ContextType;
  content: string;
  timestamp: number;
  relevanceScore: number;
  metadata: Record<string, any>;
  tags: string[];
  relationships: string[];
}

/**
 * Context types
 */
export type ContextType = 
  | 'goal'
  | 'step'
  | 'observation'
  | 'reflection'
  | 'external_info'
  | 'user_input'
  | 'tool_result'
  | 'memory';

/**
 * Context compression result
 */
export interface CompressionResult {
  compressedContext: string;
  retainedItems: ContextItem[];
  removedItems: ContextItem[];
  compressionRatio: number;
  tokensSaved: number;
}

/**
 * Memory consolidation result
 */
export interface MemoryConsolidation {
  consolidatedMemories: Memory[];
  insights: string[];
  patterns: Pattern[];
}

/**
 * Memory item
 */
export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  importance: number;
  accessCount: number;
  lastAccessed: number;
  created: number;
  tags: string[];
  relatedMemories: string[];
}

/**
 * Pattern recognition result
 */
export interface Pattern {
  id: string;
  type: PatternType;
  description: string;
  confidence: number;
  examples: string[];
  implications: string[];
}

/**
 * Memory types
 */
export type MemoryType = 
  | 'factual'
  | 'procedural'
  | 'episodic'
  | 'semantic'
  | 'preference'
  | 'constraint';

/**
 * Pattern types
 */
export type PatternType = 
  | 'behavioral'
  | 'temporal'
  | 'causal'
  | 'preference'
  | 'error'
  | 'success';

/**
 * Context manager configuration
 */
export interface EnhancedContextConfig {
  maxContextItems: number;
  maxTokens: number;
  compressionThreshold: number;
  relevanceDecayRate: number;
  memoryConsolidationInterval: number;
  enablePatternRecognition: boolean;
  enableSemanticSearch: boolean;
  minRelevanceScore: number;
}

const DEFAULT_CONTEXT_CONFIG: EnhancedContextConfig = {
  maxContextItems: 100,
  maxTokens: 8192,
  compressionThreshold: 6144,
  relevanceDecayRate: 0.95,
  memoryConsolidationInterval: 3600000, // 1 hour
  enablePatternRecognition: true,
  enableSemanticSearch: true,
  minRelevanceScore: 0.1,
};

/**
 * Enhanced Context Manager
 */
export class EnhancedContextManager {
  private contextItems: ContextItem[] = [];
  private memories: Memory[] = [];
  private patterns: Pattern[] = [];
  private lastConsolidation = Date.now();

  constructor(
    private llmAdapter: LLMAdapter,
    private config: EnhancedContextConfig = DEFAULT_CONTEXT_CONFIG
  ) {}

  /**
   * Add new context item
   */
  addContext(
    type: ContextType,
    content: string,
    metadata: Record<string, any> = {},
    tags: string[] = []
  ): string {
    const id = this.generateId();
    const item: ContextItem = {
      id,
      type,
      content,
      timestamp: Date.now(),
      relevanceScore: 1.0,
      metadata,
      tags,
      relationships: [],
    };

    this.contextItems.push(item);
    this.updateRelevanceScores();
    this.maintainContextSize();

    return id;
  }

  /**
   * Get relevant context for current goal
   */
  async getRelevantContext(
    currentGoal: string,
    maxTokens?: number
  ): Promise<ContextItem[]> {
    const targetTokens = maxTokens || this.config.maxTokens;
    
    // Score items by relevance to current goal
    const scoredItems = await this.scoreRelevance(currentGoal);
    
    // Select items within token limit
    const selectedItems = this.selectItemsByTokens(scoredItems, targetTokens);
    
    // Update access patterns
    selectedItems.forEach(item => this.updateAccessPattern(item.id));
    
    return selectedItems;
  }

  /**
   * Compress context when it exceeds limits
   */
  async compressContext(currentGoal: string): Promise<CompressionResult> {
    const totalTokens = this.estimateTokens(this.contextItems);
    
    if (totalTokens <= this.config.compressionThreshold) {
      return {
        compressedContext: '',
        retainedItems: this.contextItems,
        removedItems: [],
        compressionRatio: 1.0,
        tokensSaved: 0,
      };
    }

    // Identify items for compression
    const { retain, compress } = await this.categorizeForCompression(currentGoal);
    
    // Generate compressed summary
    const compressedSummary = await this.generateCompressedSummary(compress, currentGoal);
    
    // Create compressed context item
    const compressedItem: ContextItem = {
      id: this.generateId(),
      type: 'memory',
      content: compressedSummary,
      timestamp: Date.now(),
      relevanceScore: 0.8,
      metadata: {
        compressionSource: compress.map(item => item.id),
        originalTokens: this.estimateTokens(compress),
      },
      tags: ['compressed', 'summary'],
      relationships: [],
    };

    // Update context items
    this.contextItems = [...retain, compressedItem];
    
    const newTokens = this.estimateTokens(this.contextItems);
    
    return {
      compressedContext: compressedSummary,
      retainedItems: retain,
      removedItems: compress,
      compressionRatio: newTokens / totalTokens,
      tokensSaved: totalTokens - newTokens,
    };
  }

  /**
   * Consolidate memories from context
   */
  async consolidateMemories(): Promise<MemoryConsolidation> {
    if (Date.now() - this.lastConsolidation < this.config.memoryConsolidationInterval) {
      return {
        consolidatedMemories: [],
        insights: [],
        patterns: [],
      };
    }

    // Extract important information for long-term memory
    const newMemories = await this.extractMemories();
    
    // Identify patterns in behavior and outcomes
    const newPatterns = this.config.enablePatternRecognition 
      ? await this.recognizePatterns()
      : [];
    
    // Generate insights from accumulated data
    const insights = await this.generateInsights();
    
    // Update memory stores
    this.memories.push(...newMemories);
    this.patterns.push(...newPatterns);
    this.lastConsolidation = Date.now();
    
    // Cleanup old memories
    this.cleanupMemories();
    
    return {
      consolidatedMemories: newMemories,
      insights,
      patterns: newPatterns,
    };
  }

  /**
   * Search memories by semantic similarity
   */
  async searchMemories(query: string, limit: number = 10): Promise<Memory[]> {
    if (!this.config.enableSemanticSearch) {
      return this.searchMemoriesKeyword(query, limit);
    }

    // Use LLM for semantic search
    const prompt = `Find memories most relevant to this query: "${query}"

Available memories:
${this.memories.map((mem, idx) => `${idx}: ${mem.content.substring(0, 100)}...`).join('\n')}

Return the indices of the ${limit} most relevant memories in JSON format:
\`\`\`json
{
  "relevant_indices": [0, 5, 12],
  "reasoning": "Why these memories are relevant"
}
\`\`\``;

    try {
      const response = await this.llmAdapter.chat([{
        role: 'user',
        content: prompt,
        timestamp: Date.now(),
        id: `memory-search-${Date.now()}`
      }]);

      const result = this.parseJsonFromResponse(response.content);
      const indices = result.relevant_indices || [];
      
      return indices
        .filter((idx: number) => idx >= 0 && idx < this.memories.length)
        .map((idx: number) => this.memories[idx])
        .slice(0, limit);
    } catch (error) {
      return this.searchMemoriesKeyword(query, limit);
    }
  }

  /**
   * Get context summary for current state
   */
  async getContextSummary(currentGoal: string): Promise<string> {
    const relevantItems = await this.getRelevantContext(currentGoal, 2048);
    
    if (relevantItems.length === 0) {
      return 'No relevant context available.';
    }

    const prompt = `Summarize the current context for this goal: "${currentGoal}"

Context items:
${relevantItems.map(item => `${item.type.toUpperCase()}: ${item.content}`).join('\n\n')}

Provide a concise summary highlighting:
1. Current progress
2. Key findings
3. Next logical steps
4. Any obstacles or concerns`;

    const response = await this.llmAdapter.chat([{
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
      id: `context-summary-${Date.now()}`
    }]);

    return response.content;
  }

  // Private helper methods

  private generateId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateRelevanceScores(): void {
    const now = Date.now();
    this.contextItems.forEach(item => {
      const ageInHours = (now - item.timestamp) / (1000 * 60 * 60);
      item.relevanceScore *= Math.pow(this.config.relevanceDecayRate, ageInHours);
    });
  }

  private maintainContextSize(): void {
    if (this.contextItems.length > this.config.maxContextItems) {
      // Remove least relevant items
      this.contextItems.sort((a, b) => b.relevanceScore - a.relevanceScore);
      this.contextItems = this.contextItems.slice(0, this.config.maxContextItems);
    }
  }

  private async scoreRelevance(goal: string): Promise<ContextItem[]> {
    // Simple keyword-based relevance for now
    // In a real implementation, this would use semantic similarity
    const goalWords = goal.toLowerCase().split(/\s+/);
    
    return this.contextItems.map(item => {
      const contentWords = item.content.toLowerCase().split(/\s+/);
      const overlap = goalWords.filter(word => contentWords.includes(word)).length;
      const relevanceBoost = overlap / goalWords.length;
      
      return {
        ...item,
        relevanceScore: item.relevanceScore + relevanceBoost,
      };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private selectItemsByTokens(items: ContextItem[], maxTokens: number): ContextItem[] {
    const selected: ContextItem[] = [];
    let totalTokens = 0;
    
    for (const item of items) {
      const itemTokens = this.estimateTokens([item]);
      if (totalTokens + itemTokens <= maxTokens) {
        selected.push(item);
        totalTokens += itemTokens;
      } else {
        break;
      }
    }
    
    return selected;
  }

  private estimateTokens(items: ContextItem[]): number {
    // Rough token estimation: ~4 characters per token
    const totalChars = items.reduce((sum, item) => sum + item.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  private updateAccessPattern(itemId: string): void {
    const item = this.contextItems.find(item => item.id === itemId);
    if (item) {
      item.metadata.accessCount = (item.metadata.accessCount || 0) + 1;
      item.metadata.lastAccessed = Date.now();
    }
  }

  private async categorizeForCompression(goal: string): Promise<{
    retain: ContextItem[];
    compress: ContextItem[];
  }> {
    const relevantItems = await this.scoreRelevance(goal);
    const threshold = this.config.minRelevanceScore;
    
    return {
      retain: relevantItems.filter(item => item.relevanceScore >= threshold),
      compress: relevantItems.filter(item => item.relevanceScore < threshold),
    };
  }

  private async generateCompressedSummary(items: ContextItem[], goal: string): Promise<string> {
    if (items.length === 0) return '';

    const prompt = `Compress this context into a concise summary for goal: "${goal}"

Context to compress:
${items.map(item => `${item.type}: ${item.content}`).join('\n\n')}

Provide a summary that:
1. Preserves key information
2. Maintains logical flow
3. Removes redundancy
4. Stays under 200 words`;

    const response = await this.llmAdapter.chat([{
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
      id: `compress-${Date.now()}`
    }]);

    return response.content;
  }

  private async extractMemories(): Promise<Memory[]> {
    const importantItems = this.contextItems.filter(item => 
      item.relevanceScore > 0.7 || 
      item.type === 'reflection' ||
      item.metadata.important
    );

    if (importantItems.length === 0) return [];

    const prompt = `Extract important memories from these context items:

${importantItems.map(item => `${item.type}: ${item.content}`).join('\n\n')}

Identify key facts, procedures, and insights in JSON format:
\`\`\`json
{
  "memories": [
    {
      "type": "factual|procedural|episodic|semantic|preference|constraint",
      "content": "The memory content",
      "importance": 0.1-1.0,
      "tags": ["tag1", "tag2"]
    }
  ]
}
\`\`\``;

    try {
      const response = await this.llmAdapter.chat([{
        role: 'user',
        content: prompt,
        timestamp: Date.now(),
        id: `extract-memories-${Date.now()}`
      }]);

      const result = this.parseJsonFromResponse(response.content);
      return (result.memories || []).map((mem: any) => ({
        id: this.generateId(),
        type: mem.type as MemoryType,
        content: mem.content,
        importance: mem.importance || 0.5,
        accessCount: 0,
        lastAccessed: Date.now(),
        created: Date.now(),
        tags: mem.tags || [],
        relatedMemories: [],
      }));
    } catch (error) {
      return [];
    }
  }

  private async recognizePatterns(): Promise<Pattern[]> {
    if (this.contextItems.length < 10) return [];

    const prompt = `Analyze these context items for behavioral patterns:

${this.contextItems.slice(-20).map(item => `${item.type}: ${item.content.substring(0, 100)}`).join('\n')}

Identify patterns in JSON format:
\`\`\`json
{
  "patterns": [
    {
      "type": "behavioral|temporal|causal|preference|error|success",
      "description": "Description of the pattern",
      "confidence": 0.1-1.0,
      "examples": ["example1", "example2"],
      "implications": ["implication1", "implication2"]
    }
  ]
}
\`\`\``;

    try {
      const response = await this.llmAdapter.chat([{
        role: 'user',
        content: prompt,
        timestamp: Date.now(),
        id: `patterns-${Date.now()}`
      }]);

      const result = this.parseJsonFromResponse(response.content);
      return (result.patterns || []).map((pattern: any) => ({
        id: this.generateId(),
        type: pattern.type as PatternType,
        description: pattern.description,
        confidence: pattern.confidence || 0.5,
        examples: pattern.examples || [],
        implications: pattern.implications || [],
      }));
    } catch (error) {
      return [];
    }
  }

  private async generateInsights(): Promise<string[]> {
    if (this.memories.length === 0 && this.patterns.length === 0) {
      return [];
    }

    const prompt = `Generate insights from accumulated memories and patterns:

Recent memories: ${this.memories.slice(-10).map(m => m.content).join('; ')}
Patterns: ${this.patterns.map(p => p.description).join('; ')}

Provide 3-5 actionable insights in JSON format:
\`\`\`json
{
  "insights": [
    "Insight about improving performance",
    "Insight about avoiding errors"
  ]
}
\`\`\``;

    try {
      const response = await this.llmAdapter.chat([{
        role: 'user',
        content: prompt,
        timestamp: Date.now(),
        id: `insights-${Date.now()}`
      }]);

      const result = this.parseJsonFromResponse(response.content);
      return result.insights || [];
    } catch (error) {
      return [];
    }
  }

  private searchMemoriesKeyword(query: string, limit: number): Memory[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    
    return this.memories
      .map(memory => {
        const contentWords = memory.content.toLowerCase().split(/\s+/);
        const score = queryWords.reduce((acc, word) => 
          acc + (contentWords.includes(word) ? 1 : 0), 0
        ) / queryWords.length;
        
        return { memory, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.memory);
  }

  private cleanupMemories(): void {
    // Remove old, low-importance memories
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
    this.memories = this.memories.filter(memory => 
      memory.importance > 0.3 || memory.created > cutoff
    );
    
    // Limit total memory count
    if (this.memories.length > 1000) {
      this.memories.sort((a, b) => b.importance - a.importance);
      this.memories = this.memories.slice(0, 1000);
    }
  }

  private parseJsonFromResponse(content: string): any {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    throw new Error('No JSON found in response');
  }
}
