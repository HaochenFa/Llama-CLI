/**
 * File Download Tool for LlamaCLI
 * Provides secure file download capabilities with progress tracking and validation
 */

import { BaseTool, ToolParams, ToolContext } from '../base.js';
import {
  MCPToolCallResult,
  MCPTextContent,
} from '../../types/mcp.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createWriteStream, existsSync } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pipelineAsync = promisify(pipeline);

/**
 * Download parameters
 */
export interface DownloadParams extends ToolParams {
  url: string;
  destination: string;
  maxSize?: number;
  allowedTypes?: string[];
  overwrite?: boolean;
  createDirectories?: boolean;
  resumeDownload?: boolean;
  timeout?: number;
  validateChecksum?: string;
  checksumType?: 'md5' | 'sha1' | 'sha256';
}

/**
 * Download progress information
 */
interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
  eta: number; // estimated time remaining in seconds
}

/**
 * Download result
 */
interface DownloadResult {
  success: boolean;
  filePath: string;
  fileSize: number;
  downloadTime: number;
  averageSpeed: number;
  checksum?: string;
  mimeType?: string;
}

/**
 * File Download Tool implementation
 */
export class DownloadFileTool extends BaseTool {
  readonly name = 'download_file';
  readonly description = 'Download files from URLs with progress tracking and security validation';
  readonly schema = {
    type: 'object' as const,
    properties: {
      url: {
        type: 'string',
        description: 'URL of the file to download',
        pattern: '^https?://.+',
        minLength: 10,
        maxLength: 2000,
      },
      destination: {
        type: 'string',
        description: 'Local file path where the file should be saved',
        minLength: 1,
        maxLength: 500,
      },
      maxSize: {
        type: 'number',
        description: 'Maximum file size in bytes',
        minimum: 1,
        maximum: 1073741824, // 1GB
        default: 10485760, // 10MB
      },
      allowedTypes: {
        type: 'array',
        description: 'Allowed MIME types for the file',
        items: {
          type: 'string',
        },
        default: [
          'text/plain',
          'text/csv',
          'application/json',
          'application/xml',
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/zip',
          'application/gzip',
        ],
      },
      overwrite: {
        type: 'boolean',
        description: 'Whether to overwrite existing files',
        default: false,
      },
      createDirectories: {
        type: 'boolean',
        description: 'Whether to create parent directories if they don\'t exist',
        default: true,
      },
      resumeDownload: {
        type: 'boolean',
        description: 'Whether to resume partial downloads',
        default: true,
      },
      timeout: {
        type: 'number',
        description: 'Download timeout in milliseconds',
        minimum: 5000,
        maximum: 300000,
        default: 60000,
      },
      validateChecksum: {
        type: 'string',
        description: 'Expected checksum to validate the downloaded file',
        pattern: '^[a-fA-F0-9]+$',
      },
      checksumType: {
        type: 'string',
        description: 'Type of checksum to use for validation',
        enum: ['md5', 'sha1', 'sha256'],
        default: 'sha256',
      },
    },
    required: ['url', 'destination'],
    additionalProperties: false,
  };

  // Security configuration
  private readonly blockedExtensions = new Set([
    '.exe', '.bat', '.cmd', '.com', '.scr', '.pif',
    '.msi', '.dll', '.sys', '.vbs', '.js', '.jar',
    '.sh', '.ps1', '.app', '.dmg', '.pkg',
  ]);

  private readonly maxConcurrentDownloads = 3;
  private activeDownloads = 0;

  async execute(params: DownloadParams, context?: ToolContext): Promise<MCPToolCallResult> {
    const validation = this.validate(params);
    if (!validation.valid) {
      return this.createErrorResult(
        `Invalid parameters: ${validation.errors.join(', ')}`,
        validation.errors
      );
    }

    const {
      url,
      destination,
      maxSize = 10485760,
      allowedTypes = [],
      overwrite = false,
      createDirectories = true,
      resumeDownload = true,
      timeout = 60000,
      validateChecksum,
      checksumType = 'sha256',
    } = params;

    // Check concurrent download limit
    if (this.activeDownloads >= this.maxConcurrentDownloads) {
      return this.createErrorResult(
        'Too many concurrent downloads. Please wait for existing downloads to complete.',
        { activeDownloads: this.activeDownloads, maxConcurrent: this.maxConcurrentDownloads }
      );
    }

    this.activeDownloads++;

    try {
      // Validate URL
      const urlValidation = this.validateUrl(url);
      if (!urlValidation.valid) {
        return this.createErrorResult(
          `Invalid URL: ${urlValidation.reason}`,
          { url, reason: urlValidation.reason }
        );
      }

      // Validate destination path
      const pathValidation = this.validateDestinationPath(destination);
      if (!pathValidation.valid) {
        return this.createErrorResult(
          `Invalid destination path: ${pathValidation.reason}`,
          { destination, reason: pathValidation.reason }
        );
      }

      // Check if file exists and handle overwrite
      if (existsSync(destination) && !overwrite) {
        return this.createErrorResult(
          'File already exists. Set overwrite=true to replace it.',
          { destination, exists: true }
        );
      }

      // Create directories if needed
      if (createDirectories) {
        const dir = path.dirname(destination);
        await fs.mkdir(dir, { recursive: true });
      }

      // Perform the download
      const result = await this.performDownload({
        url,
        destination,
        maxSize,
        allowedTypes,
        resumeDownload,
        timeout,
        validateChecksum,
        checksumType,
      });

      return this.formatDownloadResult(result);
    } catch (error) {
      return this.createErrorResult(
        `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          url,
          destination,
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          } : error,
        }
      );
    } finally {
      this.activeDownloads--;
    }
  }

  /**
   * Validate URL for security
   */
  private validateUrl(url: string): { valid: boolean; reason?: string } {
    try {
      const parsed = new URL(url);

      // Only allow HTTP/HTTPS
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return {
          valid: false,
          reason: `Unsupported protocol: ${parsed.protocol}`,
        };
      }

      // Block localhost and private IPs
      const hostname = parsed.hostname.toLowerCase();
      if (this.isPrivateOrLocalhost(hostname)) {
        return {
          valid: false,
          reason: `Private or localhost URLs not allowed: ${hostname}`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        reason: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Validate destination path
   */
  private validateDestinationPath(destination: string): { valid: boolean; reason?: string } {
    // Check for path traversal
    const normalized = path.normalize(destination);
    if (normalized.includes('..')) {
      return {
        valid: false,
        reason: 'Path traversal not allowed',
      };
    }

    // Check file extension
    const ext = path.extname(destination).toLowerCase();
    if (this.blockedExtensions.has(ext)) {
      return {
        valid: false,
        reason: `Blocked file extension: ${ext}`,
      };
    }

    // Check if path is absolute (for security)
    if (!path.isAbsolute(destination)) {
      return {
        valid: false,
        reason: 'Destination must be an absolute path',
      };
    }

    return { valid: true };
  }

  /**
   * Check if hostname is private or localhost
   */
  private isPrivateOrLocalhost(hostname: string): boolean {
    const privatePatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^::1$/,
      /^fe80:/,
      /^fc00:/,
      /^fd00:/,
    ];

    return privatePatterns.some(pattern => pattern.test(hostname));
  }

  /**
   * Perform the actual download
   */
  private async performDownload(params: DownloadParams): Promise<DownloadResult> {
    const startTime = Date.now();
    let downloadedBytes = 0;
    let totalBytes = 0;
    let resumePosition = 0;

    // Check for existing partial file
    if (params.resumeDownload && existsSync(params.destination!)) {
      const stats = await fs.stat(params.destination!);
      resumePosition = stats.size;
    }

    // Prepare request headers
    const headers: Record<string, string> = {
      'User-Agent': 'LlamaCLI/1.0 (File Download Tool)',
    };

    if (resumePosition > 0) {
      headers['Range'] = `bytes=${resumePosition}-`;
    }

    // Make initial request to get file info
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), params.timeout);

    try {
      const response = await fetch(params.url!, {
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Validate content type
      const contentType = response.headers.get('content-type') || '';
      if (params.allowedTypes && params.allowedTypes.length > 0) {
        const isAllowed = params.allowedTypes.some(type => 
          contentType.toLowerCase().includes(type.toLowerCase())
        );
        if (!isAllowed) {
          throw new Error(`File type not allowed: ${contentType}`);
        }
      }

      // Get file size
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        totalBytes = parseInt(contentLength, 10) + resumePosition;
        if (totalBytes > params.maxSize!) {
          throw new Error(`File too large: ${totalBytes} bytes (max: ${params.maxSize})`);
        }
      }

      // Setup progress tracking
      let lastProgressTime = Date.now();
      let lastDownloadedBytes = resumePosition;
      const progressCallback = (bytes: number) => {
        downloadedBytes = resumePosition + bytes;
        const now = Date.now();
        const timeDiff = now - lastProgressTime;
        
        if (timeDiff >= 1000) { // Update every second
          const bytesDiff = downloadedBytes - lastDownloadedBytes;
          const speed = bytesDiff / (timeDiff / 1000);
          const percentage = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;
          const eta = speed > 0 ? (totalBytes - downloadedBytes) / speed : 0;

          this.showProgress({
            downloaded: downloadedBytes,
            total: totalBytes,
            percentage,
            speed,
            eta,
          });

          lastProgressTime = now;
          lastDownloadedBytes = downloadedBytes;
        }
      };

      // Download the file
      await this.downloadWithProgress(
        response,
        params.destination!,
        resumePosition > 0,
        progressCallback
      );

      const endTime = Date.now();
      const downloadTime = endTime - startTime;
      const finalSize = (await fs.stat(params.destination!)).size;
      const averageSpeed = finalSize / (downloadTime / 1000);

      // Validate checksum if provided
      let checksum: string | undefined;
      if (params.validateChecksum) {
        checksum = await this.calculateChecksum(params.destination!, params.checksumType!);
        if (checksum !== params.validateChecksum.toLowerCase()) {
          throw new Error(`Checksum mismatch. Expected: ${params.validateChecksum}, Got: ${checksum}`);
        }
      }

      return {
        success: true,
        filePath: params.destination!,
        fileSize: finalSize,
        downloadTime,
        averageSpeed,
        checksum,
        mimeType: contentType,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Download file with progress tracking
   */
  private async downloadWithProgress(
    response: Response,
    destination: string,
    append: boolean,
    progressCallback: (bytes: number) => void
  ): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const writeStream = createWriteStream(destination, { flags: append ? 'a' : 'w' });
    let downloadedBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        downloadedBytes += value.length;
        progressCallback(downloadedBytes);

        await new Promise<void>((resolve, reject) => {
          writeStream.write(value, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      }
    } finally {
      reader.releaseLock();
      await new Promise<void>((resolve, reject) => {
        writeStream.end((error?: Error | null) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  }

  /**
   * Show download progress
   */
  private showProgress(progress: DownloadProgress): void {
    const { downloaded, total, percentage, speed, eta } = progress;
    
    const downloadedStr = this.formatBytes(downloaded);
    const totalStr = total > 0 ? this.formatBytes(total) : 'Unknown';
    const speedStr = this.formatBytes(speed) + '/s';
    const etaStr = eta > 0 ? this.formatTime(eta) : 'Unknown';
    const percentageStr = total > 0 ? `${percentage.toFixed(1)}%` : 'Unknown';

    console.log(`📥 Downloading: ${downloadedStr}/${totalStr} (${percentageStr}) at ${speedStr}, ETA: ${etaStr}`);
  }

  /**
   * Calculate file checksum
   */
  private async calculateChecksum(filePath: string, type: string): Promise<string> {
    const crypto = await import('crypto');
    const hash = crypto.createHash(type);
    const fileBuffer = await fs.readFile(filePath);
    hash.update(fileBuffer);
    return hash.digest('hex');
  }

  /**
   * Format download result
   */
  private formatDownloadResult(result: DownloadResult): MCPToolCallResult {
    const content: MCPTextContent[] = [];

    // Add success header
    content.push(this.createTextContent(
      `✅ Download completed successfully!\n`
    ));

    // Add file details
    content.push(this.createTextContent([
      `📁 **File:** ${result.filePath}`,
      `📊 **Size:** ${this.formatBytes(result.fileSize)}`,
      `⏱️ **Time:** ${this.formatTime(result.downloadTime / 1000)}`,
      `🚀 **Speed:** ${this.formatBytes(result.averageSpeed)}/s`,
      result.mimeType ? `📄 **Type:** ${result.mimeType}` : '',
      result.checksum ? `🔐 **Checksum:** ${result.checksum}` : '',
      '',
    ].filter(Boolean).join('\n')));

    return this.createSuccessResult(content);
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Format time to human readable string
   */
  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  requiresConfirmation(params: ToolParams): boolean {
    const downloadParams = params as DownloadParams;
    // Require confirmation for large files (>100MB)
    return (downloadParams.maxSize || 0) > 104857600;
  }

  getTags(): string[] {
    return ['network', 'download', 'file', 'transfer'];
  }

  getRequiredPermissions(): string[] {
    return ['network.http', 'filesystem.write'];
  }

  getExamples() {
    return [
      {
        description: 'Download a JSON file',
        params: {
          url: 'https://api.github.com/repos/microsoft/vscode/releases/latest',
          destination: '/tmp/vscode-latest.json',
          allowedTypes: ['application/json'],
          maxSize: 1048576, // 1MB
        },
      },
      {
        description: 'Download an image with checksum validation',
        params: {
          url: 'https://example.com/image.png',
          destination: '/tmp/downloaded-image.png',
          allowedTypes: ['image/png', 'image/jpeg'],
          validateChecksum: 'abc123def456...',
          checksumType: 'sha256',
        },
      },
    ];
  }
}