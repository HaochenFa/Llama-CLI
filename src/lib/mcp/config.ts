// src/lib/mcp/config.ts
// MCP configuration management

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { McpServerConfig } from './types';

export interface McpConfigEntry {
  id: string;
  name: string;
  description?: string;
  config: McpServerConfig;
  enabled: boolean;
  autoConnect: boolean;
}

export interface McpConfig {
  servers: Record<string, McpConfigEntry>;
  globalSettings: {
    autoConnectOnStartup: boolean;
    connectionTimeout: number;
    maxRetries: number;
  };
}

export class McpConfigManager {
  private configPath: string;
  private config: McpConfig;

  constructor() {
    const configDir = path.join(os.homedir(), '.llamacli');
    this.configPath = path.join(configDir, 'mcp-config.json');
    this.config = this.loadConfig();
  }

  /**
   * Load MCP configuration from file
   */
  private loadConfig(): McpConfig {
    const defaultConfig: McpConfig = {
      servers: {},
      globalSettings: {
        autoConnectOnStartup: true,
        connectionTimeout: 30000,
        maxRetries: 3
      }
    };

    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(configData);
        return { ...defaultConfig, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load MCP config, using defaults:', error);
    }

    return defaultConfig;
  }

  /**
   * Save MCP configuration to file
   */
  private saveConfig(): void {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save MCP config: ${(error as Error).message}`);
    }
  }

  /**
   * Add a new MCP server configuration
   */
  public addServer(entry: Omit<McpConfigEntry, 'id'>): string {
    const id = this.generateServerId(entry.name);
    
    if (this.config.servers[id]) {
      throw new Error(`MCP server with id "${id}" already exists`);
    }

    this.config.servers[id] = { ...entry, id };
    this.saveConfig();
    return id;
  }

  /**
   * Update an existing MCP server configuration
   */
  public updateServer(id: string, updates: Partial<Omit<McpConfigEntry, 'id'>>): void {
    if (!this.config.servers[id]) {
      throw new Error(`MCP server with id "${id}" not found`);
    }

    this.config.servers[id] = { ...this.config.servers[id], ...updates };
    this.saveConfig();
  }

  /**
   * Remove an MCP server configuration
   */
  public removeServer(id: string): void {
    if (!this.config.servers[id]) {
      throw new Error(`MCP server with id "${id}" not found`);
    }

    delete this.config.servers[id];
    this.saveConfig();
  }

  /**
   * Get all server configurations
   */
  public getServers(): McpConfigEntry[] {
    return Object.values(this.config.servers);
  }

  /**
   * Get enabled server configurations
   */
  public getEnabledServers(): McpConfigEntry[] {
    return this.getServers().filter(server => server.enabled);
  }

  /**
   * Get auto-connect server configurations
   */
  public getAutoConnectServers(): McpConfigEntry[] {
    return this.getServers().filter(server => server.enabled && server.autoConnect);
  }

  /**
   * Get a specific server configuration
   */
  public getServer(id: string): McpConfigEntry | undefined {
    return this.config.servers[id];
  }

  /**
   * Enable/disable a server
   */
  public setServerEnabled(id: string, enabled: boolean): void {
    if (!this.config.servers[id]) {
      throw new Error(`MCP server with id "${id}" not found`);
    }

    this.config.servers[id].enabled = enabled;
    this.saveConfig();
  }

  /**
   * Set auto-connect for a server
   */
  public setServerAutoConnect(id: string, autoConnect: boolean): void {
    if (!this.config.servers[id]) {
      throw new Error(`MCP server with id "${id}" not found`);
    }

    this.config.servers[id].autoConnect = autoConnect;
    this.saveConfig();
  }

  /**
   * Get global settings
   */
  public getGlobalSettings(): McpConfig['globalSettings'] {
    return this.config.globalSettings;
  }

  /**
   * Update global settings
   */
  public updateGlobalSettings(updates: Partial<McpConfig['globalSettings']>): void {
    this.config.globalSettings = { ...this.config.globalSettings, ...updates };
    this.saveConfig();
  }

  /**
   * Generate a unique server ID
   */
  private generateServerId(name: string): string {
    const baseId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    let id = baseId;
    let counter = 1;

    while (this.config.servers[id]) {
      id = `${baseId}-${counter}`;
      counter++;
    }

    return id;
  }

  /**
   * Validate server configuration
   */
  public validateServerConfig(config: McpServerConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.command || !config.command.trim()) {
      errors.push('Command is required and cannot be empty');
    }

    // Validate command format
    if (config.command && config.command.includes(' ')) {
      errors.push('Command should not contain spaces - use args array for arguments');
    }

    // Check if working directory exists
    if (config.cwd && !fs.existsSync(config.cwd)) {
      errors.push(`Working directory does not exist: ${config.cwd}`);
    }

    // Validate environment variables
    if (config.env) {
      for (const [key, value] of Object.entries(config.env)) {
        if (typeof key !== 'string' || typeof value !== 'string') {
          errors.push(`Environment variable ${key} must be a string`);
        }
      }
    }

    // Validate arguments
    if (config.args && !Array.isArray(config.args)) {
      errors.push('Arguments must be an array of strings');
    } else if (config.args) {
      for (let i = 0; i < config.args.length; i++) {
        if (typeof config.args[i] !== 'string') {
          errors.push(`Argument at index ${i} must be a string`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get example configurations for common MCP servers
   */
  public getExampleConfigs(): Array<{ name: string; description: string; config: McpServerConfig }> {
    return [
      {
        name: 'File System',
        description: 'Access local file system operations',
        config: {
          command: 'npx',
          args: ['@modelcontextprotocol/server-filesystem', '/path/to/allowed/directory'],
          env: {}
        }
      },
      {
        name: 'Git',
        description: 'Git repository operations',
        config: {
          command: 'npx',
          args: ['@modelcontextprotocol/server-git', '--repository', '/path/to/git/repo'],
          env: {}
        }
      },
      {
        name: 'SQLite',
        description: 'SQLite database operations',
        config: {
          command: 'npx',
          args: ['@modelcontextprotocol/server-sqlite', '/path/to/database.db'],
          env: {}
        }
      },
      {
        name: 'Web Search',
        description: 'Web search capabilities',
        config: {
          command: 'npx',
          args: ['@modelcontextprotocol/server-brave-search'],
          env: {
            BRAVE_API_KEY: 'your-api-key-here'
          }
        }
      }
    ];
  }

  /**
   * Import configuration from JSON
   */
  public importConfig(configJson: string): void {
    try {
      const imported = JSON.parse(configJson);
      
      // Validate the imported config structure
      if (!imported.servers || typeof imported.servers !== 'object') {
        throw new Error('Invalid config format: missing servers object');
      }

      // Merge with existing config
      this.config = {
        ...this.config,
        ...imported,
        servers: { ...this.config.servers, ...imported.servers }
      };

      this.saveConfig();
    } catch (error) {
      throw new Error(`Failed to import config: ${(error as Error).message}`);
    }
  }

  /**
   * Export configuration to JSON
   */
  public exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Reset configuration to defaults
   */
  public resetConfig(): void {
    this.config = {
      servers: {},
      globalSettings: {
        autoConnectOnStartup: true,
        connectionTimeout: 30000,
        maxRetries: 3
      }
    };
    this.saveConfig();
  }
}
