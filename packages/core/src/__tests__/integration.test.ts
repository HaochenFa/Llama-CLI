/**
 * Integration tests for LlamaCLI core functionality
 */

import { describe, it, expect } from 'vitest';
import { OllamaAdapter } from '../adapters/ollama.js';
import { createDefaultConfig } from '../config/config.js';
import { createDefaultContext } from '../context/context.js';

describe('Core Integration Tests', () => {
  describe('Configuration', () => {
    it('should create default configuration', () => {
      const config = createDefaultConfig();
      
      expect(config).toBeDefined();
      expect(config.llm).toBeDefined();
      expect(config.llm.profiles).toHaveLength(1);
      expect(config.llm.profiles[0].type).toBe('ollama');
    });
  });

  describe('Context Management', () => {
    it('should create default context', () => {
      const context = createDefaultContext('test-session', 'default');
      
      expect(context).toBeDefined();
      expect(context.sessionId).toBe('test-session');
      expect(context.activeProfile).toBe('default');
      expect(context.chatHistory).toEqual([]);
      expect(context.fileContext).toEqual([]);
      expect(context.settings).toBeDefined();
    });
  });

  describe('Ollama Adapter', () => {
    it('should create Ollama adapter with default config', () => {
      const config = createDefaultConfig();
      const ollamaConfig = config.llm.profiles.find(p => p.type === 'ollama');
      
      expect(ollamaConfig).toBeDefined();
      
      if (ollamaConfig) {
        const adapter = new OllamaAdapter(ollamaConfig);
        
        expect(adapter).toBeDefined();
        expect(adapter.getConfig()).toEqual(ollamaConfig);
      }
    });

    it('should have proper health check methods', async () => {
      const config = createDefaultConfig();
      const ollamaConfig = config.llm.profiles.find(p => p.type === 'ollama');
      
      if (ollamaConfig) {
        const adapter = new OllamaAdapter(ollamaConfig);
        
        // Health check should be callable (though it may fail if Ollama isn't running)
        expect(typeof adapter.getHealth).toBe('function');
        
        // Should have usage stats
        const stats = adapter.getUsageStats();
        expect(stats).toBeDefined();
        expect(stats.requestCount).toBe(0);
        expect(stats.totalTokens).toBe(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle adapter errors gracefully', () => {
      const config = createDefaultConfig();
      const ollamaConfig = config.llm.profiles.find(p => p.type === 'ollama');
      
      if (ollamaConfig) {
        const adapter = new OllamaAdapter(ollamaConfig);
        
        // Should not throw when getting stats
        expect(() => adapter.getUsageStats()).not.toThrow();
        
        // Should not throw when getting config
        expect(() => adapter.getConfig()).not.toThrow();
      }
    });
  });
});
