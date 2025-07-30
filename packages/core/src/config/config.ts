/**
 * Configuration management for LlamaCLI
 */

import { MCPServerConfig, MCPClientConfig } from "../types/mcp.js";
import { ContextSettings } from "../types/context.js";

/**
 * Main configuration interface
 */
export interface LlamaCLIConfig {
  version: string;
  llm: LLMConfig;
  mcp: MCPConfig;
  context: ContextSettings;
  cli: CLIConfig;
  security: SecurityConfig;
  performance: PerformanceConfig;
  logging: LoggingConfig;
  experimental: ExperimentalConfig;
}

/**
 * Adapter configuration for the config system
 */
export interface ConfigAdapterConfig {
  type: string;
  baseUrl: string;
  timeout: number;
  retries: number;
  headers: Record<string, string>;
  models: string[];
  healthCheck: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };
}

/**
 * LLM configuration
 */
export interface LLMConfig {
  defaultAdapter: string;
  adapters: Record<string, ConfigAdapterConfig>;
  profiles: LLMProfile[];
  defaultProfile?: string;
  timeout: number;
  retries: number;
  streaming: boolean;
}

export interface LLMProfile {
  id: string;
  name: string;
  description?: string;
  adapter: string;
  model: string;
  parameters: Record<string, any>;
  systemPrompt?: string;
  tools?: string[];
  enabled: boolean;
}

/**
 * MCP configuration
 */
export interface MCPConfig {
  client: MCPClientConfig;
  servers: MCPServerConfig[];
  autoConnect: boolean;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  enabledServers: string[];
}

/**
 * CLI configuration
 */
export interface CLIConfig {
  theme: "light" | "dark" | "auto";
  colors: boolean;
  interactive: boolean;
  historySize: number;
  autoSave: boolean;
  shortcuts: Record<string, string>;
  defaultCommand: string;
  verbosity: "silent" | "error" | "warn" | "info" | "debug";
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  allowFileAccess: boolean;
  allowNetworkAccess: boolean;
  allowShellCommands: boolean;
  trustedDomains: string[];
  maxFileSize: number;
  sandboxMode: boolean;
  encryptSecrets: boolean;
}

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  maxConcurrentRequests: number;
  requestTimeout: number;
  cacheSize: number;
  enableCaching: boolean;
  compressionLevel: number;
  memoryLimit: number;
  gcInterval: number;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  level: "debug" | "info" | "warn" | "error" | "silent";
  file?: string;
  maxFileSize: number;
  maxFiles: number;
  format: "json" | "text";
  enableConsole: boolean;
  enableFile: boolean;
  enableMetrics: boolean;
}

/**
 * Experimental features configuration
 */
export interface ExperimentalConfig {
  enableBetaFeatures: boolean;
  features: Record<string, boolean>;
  telemetry: boolean;
  analytics: boolean;
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
}

export interface ConfigValidationError {
  path: string;
  message: string;
  value?: any;
}

export interface ConfigValidationWarning {
  path: string;
  message: string;
  value?: any;
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: LlamaCLIConfig = {
  version: "1.0.0",
  llm: {
    defaultAdapter: "ollama",
    adapters: {
      ollama: {
        type: "ollama",
        baseUrl: "http://localhost:11434",
        timeout: 30000,
        retries: 3,
        headers: {},
        models: [],
        healthCheck: {
          enabled: true,
          interval: 60000,
          timeout: 5000,
        },
      },
      openai: {
        type: "openai",
        baseUrl: "https://api.openai.com/v1",
        timeout: 30000,
        retries: 3,
        headers: {},
        models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
        healthCheck: {
          enabled: true,
          interval: 60000,
          timeout: 5000,
        },
      },
      claude: {
        type: "claude",
        baseUrl: "https://api.anthropic.com/v1",
        timeout: 30000,
        retries: 3,
        headers: {},
        models: ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
        healthCheck: {
          enabled: true,
          interval: 60000,
          timeout: 5000,
        },
      },
      gemini: {
        type: "gemini",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        timeout: 30000,
        retries: 3,
        headers: {},
        models: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"],
        healthCheck: {
          enabled: true,
          interval: 60000,
          timeout: 5000,
        },
      },
      "openai-compatible": {
        type: "openai-compatible",
        baseUrl: "http://localhost:1234/v1",
        timeout: 30000,
        retries: 3,
        headers: {},
        models: ["local-model"],
        healthCheck: {
          enabled: true,
          interval: 60000,
          timeout: 5000,
        },
      },
    },
    profiles: [
      {
        id: "default",
        name: "Default Profile",
        description: "Default LLM profile for general use",
        adapter: "ollama",
        model: "llama3.2",
        parameters: {
          temperature: 0.7,
          max_tokens: 2048,
          top_p: 0.9,
          frequency_penalty: 0,
          presence_penalty: 0,
        },
        enabled: true,
      },
    ],
    defaultProfile: "default",
    timeout: 30000,
    retries: 3,
    streaming: true,
  },
  mcp: {
    client: {
      name: "LlamaCLI",
      version: "1.0.0",
      capabilities: {
        roots: {
          listChanged: true,
        },
        sampling: {
          maxTokens: 4096,
          temperature: 0.7,
          topP: 0.9,
        },
      },
      timeout: 30000,
      retries: 3,
      logLevel: "info",
    },
    servers: [],
    autoConnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 5,
    enabledServers: [],
  },
  context: {
    maxHistoryLength: 100,
    maxFileContextSize: 1024 * 1024, // 1MB
    autoSaveInterval: 30000,
    confirmDestructiveActions: true,
    enableToolCalls: true,
    maxConcurrentTools: 3,
    toolTimeout: 30000,
    contextCompressionThreshold: 8192,
    autoApproveTools: false,
    maxTokens: 8192,
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    contextWindow: 128000,
    systemPrompt: "You are a helpful AI assistant.",
  },
  cli: {
    theme: "auto",
    colors: true,
    interactive: true,
    historySize: 1000,
    autoSave: true,
    shortcuts: {
      "ctrl+c": "interrupt",
      "ctrl+d": "exit",
      "ctrl+l": "clear",
      "ctrl+r": "search_history",
    },
    defaultCommand: "chat",
    verbosity: "info",
  },
  security: {
    allowFileAccess: true,
    allowNetworkAccess: false,
    allowShellCommands: false,
    trustedDomains: ["localhost", "127.0.0.1"],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    sandboxMode: false,
    encryptSecrets: true,
  },
  performance: {
    maxConcurrentRequests: 5,
    requestTimeout: 30000,
    cacheSize: 100,
    enableCaching: true,
    compressionLevel: 6,
    memoryLimit: 512 * 1024 * 1024, // 512MB
    gcInterval: 60000,
  },
  logging: {
    level: "info",
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    format: "text",
    enableConsole: true,
    enableFile: false,
    enableMetrics: false,
  },
  experimental: {
    enableBetaFeatures: false,
    features: {},
    telemetry: false,
    analytics: false,
  },
};

/**
 * Configuration paths
 */
export const CONFIG_PATHS = {
  global: "~/.llamacli/config.json",
  local: ".llamacli/config.json",
  env: "LLAMACLI_CONFIG",
} as const;

/**
 * Environment variable mappings
 */
export const ENV_MAPPINGS = {
  LLAMACLI_LLM_ADAPTER: "llm.defaultAdapter",
  LLAMACLI_LLM_MODEL: "llm.defaultProfile",
  LLAMACLI_OLLAMA_URL: "llm.adapters.ollama.baseUrl",
  LLAMACLI_LOG_LEVEL: "logging.level",
  LLAMACLI_THEME: "cli.theme",
  LLAMACLI_COLORS: "cli.colors",
  LLAMACLI_INTERACTIVE: "cli.interactive",
  LLAMACLI_SANDBOX: "security.sandboxMode",
  LLAMACLI_FILE_ACCESS: "security.allowFileAccess",
  LLAMACLI_NETWORK_ACCESS: "security.allowNetworkAccess",
  LLAMACLI_SHELL_ACCESS: "security.allowShellCommands",
} as const;

/**
 * Configuration validation schema
 */
export const CONFIG_SCHEMA = {
  type: "object",
  required: ["version", "llm", "mcp", "context", "cli", "security", "performance", "logging"],
  properties: {
    version: { type: "string" },
    llm: {
      type: "object",
      required: ["defaultAdapter", "adapters", "profiles"],
      properties: {
        defaultAdapter: { type: "string" },
        adapters: { type: "object" },
        profiles: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "name", "adapter", "model"],
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              adapter: { type: "string" },
              model: { type: "string" },
              enabled: { type: "boolean" },
            },
          },
        },
        timeout: { type: "number", minimum: 1000 },
        retries: { type: "number", minimum: 0, maximum: 10 },
        streaming: { type: "boolean" },
      },
    },
    mcp: {
      type: "object",
      required: ["client", "servers"],
      properties: {
        client: { type: "object" },
        servers: { type: "array" },
        autoConnect: { type: "boolean" },
        reconnectInterval: { type: "number", minimum: 1000 },
        maxReconnectAttempts: { type: "number", minimum: 0 },
      },
    },
    context: {
      type: "object",
      properties: {
        maxTokens: { type: "number", minimum: 1024 },
        maxFiles: { type: "number", minimum: 1 },
        maxFileSize: { type: "number", minimum: 1024 },
      },
    },
    cli: {
      type: "object",
      properties: {
        theme: { type: "string", enum: ["light", "dark", "auto"] },
        colors: { type: "boolean" },
        interactive: { type: "boolean" },
        historySize: { type: "number", minimum: 0 },
        verbosity: { type: "string", enum: ["silent", "error", "warn", "info", "debug"] },
      },
    },
    security: {
      type: "object",
      properties: {
        allowFileAccess: { type: "boolean" },
        allowNetworkAccess: { type: "boolean" },
        allowShellCommands: { type: "boolean" },
        maxFileSize: { type: "number", minimum: 1024 },
        sandboxMode: { type: "boolean" },
      },
    },
    performance: {
      type: "object",
      properties: {
        maxConcurrentRequests: { type: "number", minimum: 1 },
        requestTimeout: { type: "number", minimum: 1000 },
        cacheSize: { type: "number", minimum: 0 },
        memoryLimit: { type: "number", minimum: 1024 * 1024 },
      },
    },
    logging: {
      type: "object",
      properties: {
        level: { type: "string", enum: ["debug", "info", "warn", "error", "silent"] },
        maxFileSize: { type: "number", minimum: 1024 },
        maxFiles: { type: "number", minimum: 1 },
        format: { type: "string", enum: ["json", "text"] },
      },
    },
    experimental: {
      type: "object",
      properties: {
        enableBetaFeatures: { type: "boolean" },
        features: { type: "object" },
        telemetry: { type: "boolean" },
        analytics: { type: "boolean" },
      },
    },
  },
} as const;

/**
 * Utility functions
 */
export function createDefaultConfig(): LlamaCLIConfig {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

export function mergeConfigs(
  base: Partial<LlamaCLIConfig>,
  override: Partial<LlamaCLIConfig>
): LlamaCLIConfig {
  const merged = { ...createDefaultConfig(), ...base };

  // Deep merge specific sections
  if (override.llm) {
    merged.llm = { ...merged.llm, ...override.llm };
    if (override.llm.adapters) {
      merged.llm.adapters = { ...merged.llm.adapters, ...override.llm.adapters };
    }
    if (override.llm.profiles) {
      merged.llm.profiles = override.llm.profiles;
    }
  }

  if (override.mcp) {
    merged.mcp = { ...merged.mcp, ...override.mcp };
    if (override.mcp.client) {
      merged.mcp.client = { ...merged.mcp.client, ...override.mcp.client };
    }
    if (override.mcp.servers) {
      merged.mcp.servers = override.mcp.servers;
    }
  }

  if (override.context) {
    merged.context = { ...merged.context, ...override.context };
  }

  if (override.cli) {
    merged.cli = { ...merged.cli, ...override.cli };
  }

  if (override.security) {
    merged.security = { ...merged.security, ...override.security };
  }

  if (override.performance) {
    merged.performance = { ...merged.performance, ...override.performance };
  }

  if (override.logging) {
    merged.logging = { ...merged.logging, ...override.logging };
  }

  if (override.experimental) {
    merged.experimental = { ...merged.experimental, ...override.experimental };
  }

  return merged;
}

export function validateConfig(config: any): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];
  const warnings: ConfigValidationWarning[] = [];

  // Basic structure validation
  if (!config || typeof config !== "object") {
    errors.push({
      path: "root",
      message: "Configuration must be an object",
      value: config,
    });
    return { valid: false, errors, warnings };
  }

  // Version validation
  if (!config.version || typeof config.version !== "string") {
    errors.push({
      path: "version",
      message: "Version is required and must be a string",
      value: config.version,
    });
  }

  // LLM configuration validation
  if (!config.llm) {
    errors.push({
      path: "llm",
      message: "LLM configuration is required",
    });
  } else {
    if (!config.llm.defaultAdapter) {
      errors.push({
        path: "llm.defaultAdapter",
        message: "Default adapter is required",
      });
    }

    if (!config.llm.adapters || typeof config.llm.adapters !== "object") {
      errors.push({
        path: "llm.adapters",
        message: "Adapters configuration is required and must be an object",
      });
    }

    if (!Array.isArray(config.llm.profiles)) {
      errors.push({
        path: "llm.profiles",
        message: "Profiles must be an array",
      });
    } else if (config.llm.profiles.length === 0) {
      warnings.push({
        path: "llm.profiles",
        message: "No LLM profiles defined",
      });
    }
  }

  // MCP configuration validation
  if (!config.mcp) {
    errors.push({
      path: "mcp",
      message: "MCP configuration is required",
    });
  } else {
    if (!config.mcp.client) {
      errors.push({
        path: "mcp.client",
        message: "MCP client configuration is required",
      });
    }

    if (!Array.isArray(config.mcp.servers)) {
      errors.push({
        path: "mcp.servers",
        message: "MCP servers must be an array",
      });
    }
  }

  // Security validation
  if (config.security) {
    if (config.security.allowShellCommands && !config.security.sandboxMode) {
      warnings.push({
        path: "security",
        message: "Shell commands are enabled without sandbox mode - this may be unsafe",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function getConfigValue(config: LlamaCLIConfig, path: string): any {
  const keys = path.split(".");
  let value: any = config;

  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }

  return value;
}

export function setConfigValue(config: LlamaCLIConfig, path: string, value: any): void {
  const keys = path.split(".");
  let current: any = config;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * Load configuration from file or return default
 * TODO: Implement actual file loading logic
 */
export function loadConfig(configPath?: string): LlamaCLIConfig {
  // For now, return default config
  // In a full implementation, this would read from file system
  // and merge with user-specific configuration files
  return createDefaultConfig();
}
