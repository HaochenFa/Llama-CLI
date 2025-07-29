/**
 * Network Tools Module for LlamaCLI
 * Provides comprehensive network-related tools for web interaction
 */

export { WebSearchTool } from './web-search.js';
export { HttpRequestTool } from './http-request.js';
export { DownloadFileTool } from './download-file.js';

// Re-export types for convenience
export type {
  WebSearchParams,
  SearchResult,
} from './web-search.js';

export type {
  HttpRequestParams,
} from './http-request.js';

export type {
  DownloadParams,
} from './download-file.js';

/**
 * Register all network tools with the global registry
 */
import { globalToolRegistry } from '../base.js';
import { WebSearchTool } from './web-search.js';
import { HttpRequestTool } from './http-request.js';
import { DownloadFileTool } from './download-file.js';

// Auto-register network tools
const networkTools = [
  new WebSearchTool(),
  new HttpRequestTool(),
  new DownloadFileTool(),
];

networkTools.forEach(tool => {
  globalToolRegistry.register(tool);
});

export { networkTools };

/**
 * Network tools configuration
 */
export const NETWORK_TOOLS_CONFIG = {
  // Default timeouts
  DEFAULT_TIMEOUT: 30000,
  DOWNLOAD_TIMEOUT: 60000,
  SEARCH_TIMEOUT: 15000,
  
  // Rate limiting
  MAX_CONCURRENT_REQUESTS: 5,
  REQUEST_DELAY: 1000,
  
  // Security settings
  BLOCKED_DOMAINS: [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
  ],
  
  BLOCKED_PORTS: [
    22,   // SSH
    23,   // Telnet
    25,   // SMTP
    53,   // DNS
    110,  // POP3
    143,  // IMAP
    993,  // IMAPS
    995,  // POP3S
  ],
  
  // File download limits
  MAX_DOWNLOAD_SIZE: 1073741824, // 1GB
  DEFAULT_DOWNLOAD_SIZE: 10485760, // 10MB
  
  // Search limits
  MAX_SEARCH_RESULTS: 20,
  DEFAULT_SEARCH_RESULTS: 10,
} as const;