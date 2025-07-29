/**
 * HTTP Request Tool for LlamaCLI
 * Provides secure HTTP request capabilities with validation and safety checks
 */

import { BaseTool, ToolParams, ToolContext } from '../base.js';
import {
  MCPToolCallResult,
  MCPTextContent,
} from '../../types/mcp.js';

/**
 * HTTP request parameters
 */
export interface HttpRequestParams extends ToolParams {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
  followRedirects?: boolean;
  maxRedirects?: number;
  validateSSL?: boolean;
}

/**
 * HTTP response data
 */
interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  url: string;
  redirected: boolean;
  size: number;
  timing: {
    start: number;
    end: number;
    duration: number;
  };
}

/**
 * URL validation result
 */
interface UrlValidation {
  valid: boolean;
  reason?: string;
  sanitized?: string;
}

/**
 * HTTP Request Tool implementation
 */
export class HttpRequestTool extends BaseTool {
  readonly name = 'http_request';
  readonly description = 'Make HTTP requests to web APIs and services with security validation';
  readonly schema = {
    type: 'object' as const,
    properties: {
      url: {
        type: 'string',
        description: 'The URL to make the request to',
        pattern: '^https?://.+',
        minLength: 10,
        maxLength: 2000,
      },
      method: {
        type: 'string',
        description: 'HTTP method to use',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
        default: 'GET',
      },
      headers: {
        type: 'object',
        description: 'HTTP headers to include',
        additionalProperties: {
          type: 'string',
        },
      },
      body: {
        type: 'string',
        description: 'Request body (for POST, PUT, PATCH methods)',
        maxLength: 1048576, // 1MB limit
      },
      timeout: {
        type: 'number',
        description: 'Request timeout in milliseconds',
        minimum: 1000,
        maximum: 60000,
        default: 30000,
      },
      followRedirects: {
        type: 'boolean',
        description: 'Whether to follow HTTP redirects',
        default: true,
      },
      maxRedirects: {
        type: 'number',
        description: 'Maximum number of redirects to follow',
        minimum: 0,
        maximum: 10,
        default: 5,
      },
      validateSSL: {
        type: 'boolean',
        description: 'Whether to validate SSL certificates',
        default: true,
      },
    },
    required: ['url'],
    additionalProperties: false,
  };

  // Security configuration
  private readonly blockedDomains = new Set([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    'metadata.google.internal',
    '169.254.169.254', // AWS metadata
  ]);

  private readonly blockedPorts = new Set([
    22,   // SSH
    23,   // Telnet
    25,   // SMTP
    53,   // DNS
    110,  // POP3
    143,  // IMAP
    993,  // IMAPS
    995,  // POP3S
    1433, // SQL Server
    3306, // MySQL
    5432, // PostgreSQL
    6379, // Redis
    27017, // MongoDB
  ]);

  private readonly allowedSchemes = new Set(['http', 'https']);
  private readonly maxResponseSize = 10 * 1024 * 1024; // 10MB
  private readonly dangerousHeaders = new Set([
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
  ]);

  async execute(params: HttpRequestParams, context?: ToolContext): Promise<MCPToolCallResult> {
    const validation = this.validate(params);
    if (!validation.valid) {
      return this.createErrorResult(
        `Invalid parameters: ${validation.errors.join(', ')}`,
        validation.errors
      );
    }

    const {
      url,
      method = 'GET',
      headers = {},
      body,
      timeout = 30000,
      followRedirects = true,
      maxRedirects = 5,
      validateSSL = true,
    } = params;

    try {
      // Validate and sanitize URL
      const urlValidation = this.validateUrl(url);
      if (!urlValidation.valid) {
        return this.createErrorResult(
          `Invalid URL: ${urlValidation.reason}`,
          { url, reason: urlValidation.reason }
        );
      }

      // Sanitize headers
      const sanitizedHeaders = this.sanitizeHeaders(headers);

      // Validate request body
      if (body && !['POST', 'PUT', 'PATCH'].includes(method)) {
        return this.createErrorResult(
          `Request body not allowed for ${method} method`,
          { method, hasBody: !!body }
        );
      }

      // Make the HTTP request
      const response = await this.makeRequest({
        url: urlValidation.sanitized || url,
        method,
        headers: sanitizedHeaders,
        body,
        timeout,
        followRedirects,
        maxRedirects,
        validateSSL,
      });

      return this.formatResponse(response);
    } catch (error) {
      return this.createErrorResult(
        `HTTP request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          url,
          method,
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          } : error,
        }
      );
    }
  }

  /**
   * Validate URL for security
   */
  private validateUrl(url: string): UrlValidation {
    try {
      const parsed = new URL(url);

      // Check scheme
      if (!this.allowedSchemes.has(parsed.protocol.slice(0, -1))) {
        return {
          valid: false,
          reason: `Unsupported protocol: ${parsed.protocol}`,
        };
      }

      // Check for blocked domains
      const hostname = parsed.hostname.toLowerCase();
      if (this.blockedDomains.has(hostname)) {
        return {
          valid: false,
          reason: `Blocked domain: ${hostname}`,
        };
      }

      // Check for private IP ranges
      if (this.isPrivateIP(hostname)) {
        return {
          valid: false,
          reason: `Private IP address not allowed: ${hostname}`,
        };
      }

      // Check for blocked ports
      const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80);
      if (this.blockedPorts.has(port)) {
        return {
          valid: false,
          reason: `Blocked port: ${port}`,
        };
      }

      // Sanitize URL (remove fragments, normalize)
      const sanitized = new URL(parsed.href);
      sanitized.hash = ''; // Remove fragment

      return {
        valid: true,
        sanitized: sanitized.href,
      };
    } catch (error) {
      return {
        valid: false,
        reason: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check if hostname is a private IP address
   */
  private isPrivateIP(hostname: string): boolean {
    // IPv4 private ranges
    const ipv4Patterns = [
      /^10\./,                    // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.0.0/12
      /^192\.168\./,              // 192.168.0.0/16
      /^127\./,                   // 127.0.0.0/8 (loopback)
      /^169\.254\./,              // 169.254.0.0/16 (link-local)
    ];

    for (const pattern of ipv4Patterns) {
      if (pattern.test(hostname)) {
        return true;
      }
    }

    // IPv6 private ranges (simplified check)
    if (hostname.includes(':')) {
      const ipv6Patterns = [
        /^::1$/,                    // loopback
        /^fe80:/,                   // link-local
        /^fc00:/,                   // unique local
        /^fd00:/,                   // unique local
      ];

      for (const pattern of ipv6Patterns) {
        if (pattern.test(hostname)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Sanitize HTTP headers
   */
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();

      // Block dangerous headers
      if (this.dangerousHeaders.has(lowerKey)) {
        continue;
      }

      // Validate header name
      if (!/^[a-zA-Z0-9-_]+$/.test(key)) {
        continue;
      }

      // Validate header value (basic sanitization)
      if (typeof value === 'string' && value.length <= 1000) {
        sanitized[key] = value.replace(/[\r\n]/g, '');
      }
    }

    // Add default headers
    sanitized['User-Agent'] = sanitized['User-Agent'] || 'LlamaCLI/1.0 (HTTP Request Tool)';
    
    return sanitized;
  }

  /**
   * Make the actual HTTP request
   */
  private async makeRequest(params: HttpRequestParams): Promise<HttpResponse> {
    const startTime = Date.now();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), params.timeout);

    try {
      const fetchOptions: RequestInit = {
        method: params.method,
        headers: params.headers,
        body: params.body,
        signal: controller.signal,
        redirect: params.followRedirects ? 'follow' : 'manual',
      };

      const response = await fetch(params.url!, fetchOptions);
      
      // Check response size
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > this.maxResponseSize) {
        throw new Error(`Response too large: ${contentLength} bytes (max: ${this.maxResponseSize})`);
      }

      // Read response body with size limit
      const body = await this.readResponseBody(response);
      const endTime = Date.now();

      // Convert headers to object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body,
        url: response.url,
        redirected: response.redirected,
        size: body.length,
        timing: {
          start: startTime,
          end: endTime,
          duration: endTime - startTime,
        },
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Read response body with size limit
   */
  private async readResponseBody(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      return '';
    }

    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalSize += value.length;
        if (totalSize > this.maxResponseSize) {
          throw new Error(`Response too large: ${totalSize} bytes (max: ${this.maxResponseSize})`);
        }

        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    // Combine chunks and decode
    const combined = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    return new TextDecoder().decode(combined);
  }

  /**
   * Format HTTP response for output
   */
  private formatResponse(response: HttpResponse): MCPToolCallResult {
    const content: MCPTextContent[] = [];

    // Add response summary
    const statusEmoji = response.status >= 200 && response.status < 300 ? '✅' : 
                       response.status >= 400 ? '❌' : '⚠️';
    
    content.push(this.createTextContent(
      `${statusEmoji} HTTP ${response.status} ${response.statusText}\n`
    ));

    // Add request details
    content.push(this.createTextContent([
      `🔗 **URL:** ${response.url}`,
      `📊 **Size:** ${this.formatBytes(response.size)}`,
      `⏱️ **Duration:** ${response.timing.duration}ms`,
      response.redirected ? '🔄 **Redirected:** Yes' : '',
      '',
    ].filter(Boolean).join('\n')));

    // Add response headers
    if (Object.keys(response.headers).length > 0) {
      content.push(this.createTextContent('📋 **Response Headers:**\n'));
      
      const headerText = Object.entries(response.headers)
        .map(([key, value]) => `  ${key}: ${value}`)
        .join('\n');
      
      content.push(this.createTextContent(`\`\`\`\n${headerText}\n\`\`\`\n`));
    }

    // Add response body
    if (response.body) {
      content.push(this.createTextContent('📄 **Response Body:**\n'));
      
      // Try to format as JSON if possible
      let formattedBody = response.body;
      try {
        const parsed = JSON.parse(response.body);
        formattedBody = JSON.stringify(parsed, null, 2);
      } catch {
        // Not JSON, use as-is
      }

      // Truncate if too long
      if (formattedBody.length > 5000) {
        formattedBody = formattedBody.substring(0, 5000) + '\n\n... (truncated)';
      }

      content.push(this.createTextContent(`\`\`\`\n${formattedBody}\n\`\`\``));
    }

    return this.createSuccessResult(content);
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  requiresConfirmation(params: ToolParams): boolean {
    const httpParams = params as HttpRequestParams;
    // Require confirmation for non-GET requests
    return httpParams.method !== 'GET' && httpParams.method !== 'HEAD';
  }

  getTags(): string[] {
    return ['network', 'http', 'api', 'web'];
  }

  getRequiredPermissions(): string[] {
    return ['network.http'];
  }

  getExamples() {
    return [
      {
        description: 'Get JSON data from an API',
        params: {
          url: 'https://api.github.com/users/octocat',
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        },
      },
      {
        description: 'Post data to an API',
        params: {
          url: 'https://httpbin.org/post',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: 'Hello, World!' }),
        },
      },
    ];
  }
}