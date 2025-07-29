/**
 * Web Search Tool for LlamaCLI
 * Provides web search capabilities using multiple search engines
 */

import { BaseTool, ToolParams, ToolContext } from '../base.js';
import {
  MCPToolCallResult,
  MCPTextContent,
} from '../../types/mcp.js';

/**
 * Search result interface
 */
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  timestamp?: string;
  relevanceScore?: number;
}

/**
 * Web search parameters
 */
export interface WebSearchParams extends ToolParams {
  query: string;
  maxResults?: number;
  language?: string;
  region?: string;
  safeSearch?: boolean;
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
}

/**
 * Search engine interface
 */
interface SearchEngine {
  name: string;
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
  isAvailable(): Promise<boolean>;
}

/**
 * Search options
 */
interface SearchOptions {
  maxResults: number;
  language: string;
  region: string;
  safeSearch: boolean;
  timeRange: string;
}

/**
 * DuckDuckGo search engine implementation
 */
class DuckDuckGoEngine implements SearchEngine {
  name = 'DuckDuckGo';

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    try {
      // DuckDuckGo Instant Answer API
      const url = new URL('https://api.duckduckgo.com/');
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('no_html', '1');
      url.searchParams.set('skip_disambig', '1');
      
      if (options.safeSearch) {
        url.searchParams.set('safe_search', 'strict');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'LlamaCLI/1.0 (https://github.com/llamacli/llamacli)',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`DuckDuckGo API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const results: SearchResult[] = [];

      // Process instant answer
      if (data.AbstractText) {
        results.push({
          title: data.Heading || 'Instant Answer',
          url: data.AbstractURL || '',
          snippet: data.AbstractText,
          source: data.AbstractSource || 'DuckDuckGo',
          relevanceScore: 1.0,
        });
      }

      // Process related topics
      if (data.RelatedTopics) {
        for (const topic of data.RelatedTopics.slice(0, options.maxResults - results.length)) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || 'Related Topic',
              url: topic.FirstURL,
              snippet: topic.Text,
              source: 'DuckDuckGo',
              relevanceScore: 0.8,
            });
          }
        }
      }

      return results.slice(0, options.maxResults);
    } catch (error) {
      console.error('DuckDuckGo search error:', error);
      return [];
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://api.duckduckgo.com/', {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Searx search engine implementation (open source metasearch)
 */
class SearxEngine implements SearchEngine {
  name = 'Searx';
  private baseUrl = 'https://searx.org';

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    try {
      const url = new URL(`${this.baseUrl}/search`);
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('categories', 'general');
      
      if (options.language !== 'en') {
        url.searchParams.set('lang', options.language);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'LlamaCLI/1.0',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Searx API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const results: SearchResult[] = [];

      if (data.results && Array.isArray(data.results)) {
        for (const result of data.results.slice(0, options.maxResults)) {
          results.push({
            title: result.title || 'No Title',
            url: result.url || '',
            snippet: result.content || result.title || '',
            source: result.engine || 'Searx',
            relevanceScore: 0.7,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Searx search error:', error);
      return [];
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}/search?q=test&format=json`, {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Web Search Tool implementation
 */
export class WebSearchTool extends BaseTool {
  readonly name = 'web_search';
  readonly description = 'Search the web for information using multiple search engines';
  readonly schema = {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'The search query',
        minLength: 1,
        maxLength: 500,
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return',
        minimum: 1,
        maximum: 20,
        default: 5,
      },
      language: {
        type: 'string',
        description: 'Language code for search results',
        default: 'en',
        pattern: '^[a-z]{2}$',
      },
      region: {
        type: 'string',
        description: 'Region code for search results',
        default: 'us',
        pattern: '^[a-z]{2}$',
      },
      safeSearch: {
        type: 'boolean',
        description: 'Enable safe search filtering',
        default: true,
      },
      timeRange: {
        type: 'string',
        description: 'Time range for search results',
        enum: ['day', 'week', 'month', 'year', 'all'],
        default: 'all',
      },
    },
    required: ['query'],
    additionalProperties: false,
  };

  private engines: SearchEngine[];
  private cache: Map<string, { results: SearchResult[]; timestamp: number }> = new Map();
  private readonly cacheTimeout = 300000; // 5 minutes

  constructor() {
    super();
    this.engines = [
      new DuckDuckGoEngine(),
      new SearxEngine(),
    ];
  }

  async execute(params: WebSearchParams, context?: ToolContext): Promise<MCPToolCallResult> {
    const validation = this.validate(params);
    if (!validation.valid) {
      return this.createErrorResult(
        `Invalid parameters: ${validation.errors.join(', ')}`,
        validation.errors
      );
    }

    const {
      query,
      maxResults = 5,
      language = 'en',
      region = 'us',
      safeSearch = true,
      timeRange = 'all',
    } = params;

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(params);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return this.formatResults(cached, true);
      }

      // Perform search
      const searchOptions: SearchOptions = {
        maxResults,
        language,
        region,
        safeSearch,
        timeRange,
      };

      const results = await this.performSearch(query, searchOptions);
      
      if (results.length === 0) {
        return this.createErrorResult(
          'No search results found. Please try a different query or check your internet connection.',
          { query, searchOptions }
        );
      }

      // Cache results
      this.cacheResults(cacheKey, results);

      return this.formatResults(results, false);
    } catch (error) {
      return this.createErrorResult(
        `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { query, error: error instanceof Error ? error.stack : error }
      );
    }
  }

  /**
   * Perform search using available engines
   */
  private async performSearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];
    const errors: string[] = [];

    for (const engine of this.engines) {
      try {
        const isAvailable = await engine.isAvailable();
        if (!isAvailable) {
          continue;
        }

        const results = await engine.search(query, options);
        allResults.push(...results);

        // If we have enough results, break early
        if (allResults.length >= options.maxResults) {
          break;
        }
      } catch (error) {
        errors.push(`${engine.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        continue;
      }
    }

    if (allResults.length === 0 && errors.length > 0) {
      throw new Error(`All search engines failed: ${errors.join('; ')}`);
    }

    // Remove duplicates and sort by relevance
    const uniqueResults = this.deduplicateResults(allResults);
    return uniqueResults
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, options.maxResults);
  }

  /**
   * Remove duplicate results
   */
  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = `${result.url}|${result.title}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Format search results for output
   */
  private formatResults(results: SearchResult[], fromCache: boolean): MCPToolCallResult {
    const content: MCPTextContent[] = [];

    // Add header
    content.push(this.createTextContent(
      `🔍 Web Search Results${fromCache ? ' (cached)' : ''} (${results.length} results)\n`
    ));

    // Add results
    results.forEach((result, index) => {
      const resultText = [
        `**${index + 1}. ${result.title}**`,
        `🔗 ${result.url}`,
        `📝 ${result.snippet}`,
        `🏷️ Source: ${result.source}`,
        '',
      ].join('\n');

      content.push(this.createTextContent(resultText));
    });

    // Add summary
    const summary = `Found ${results.length} relevant results for your search query.`;
    content.push(this.createTextContent(`\n📊 ${summary}`));

    return this.createSuccessResult(content);
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(params: WebSearchParams): string {
    const { query, maxResults, language, region, safeSearch, timeRange } = params;
    return `${query}|${maxResults}|${language}|${region}|${safeSearch}|${timeRange}`;
  }

  /**
   * Get results from cache
   */
  private getFromCache(key: string): SearchResult[] | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.results;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Cache search results
   */
  private cacheResults(key: string, results: SearchResult[]): void {
    this.cache.set(key, {
      results,
      timestamp: Date.now(),
    });

    // Clean old cache entries
    if (this.cache.size > 100) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }
  }

  getTags(): string[] {
    return ['network', 'search', 'web', 'information'];
  }

  getRequiredPermissions(): string[] {
    return ['network.http'];
  }

  getExamples() {
    return [
      {
        description: 'Search for recent news about AI',
        params: {
          query: 'artificial intelligence news',
          maxResults: 5,
          timeRange: 'week',
        },
      },
      {
        description: 'Search for programming tutorials',
        params: {
          query: 'TypeScript tutorial beginners',
          maxResults: 3,
          safeSearch: true,
        },
      },
    ];
  }

  async cleanup(): Promise<void> {
    this.cache.clear();
  }
}