/**
 * CLI-specific type definitions for LlamaCLI
 */

import { LlamaCLIConfig } from '@llamacli/core';
import { Logger } from '../utils/logger.js';
import { ErrorHandler } from '../utils/error-handler.js';

/**
 * CLI context interface
 */
export interface CLIContext {
  config: LlamaCLIConfig;
  workingDirectory: string;
  logger: Logger;
  errorHandler: ErrorHandler;
  startTime: number;
}

/**
 * CLI output format options
 */
export type OutputFormat = 'text' | 'json' | 'yaml' | 'table';

/**
 * CLI theme options
 */
export interface CLITheme {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  muted: string;
}

/**
 * Default CLI theme
 */
export const DEFAULT_CLI_THEME: CLITheme = {
  primary: '#3b82f6',
  secondary: '#6b7280',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#06b6d4',
  muted: '#9ca3af',
};

/**
 * CLI progress indicator options
 */
export interface ProgressOptions {
  message: string;
  total?: number;
  current?: number;
  showPercentage?: boolean;
  showETA?: boolean;
}

/**
 * CLI table column definition
 */
export interface TableColumn {
  key: string;
  title: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  formatter?: (value: any) => string;
}

/**
 * CLI interactive prompt types
 */
export type PromptType = 
  | 'input'
  | 'password'
  | 'confirm'
  | 'list'
  | 'checkbox'
  | 'editor';

/**
 * CLI prompt configuration
 */
export interface PromptConfig {
  type: PromptType;
  name: string;
  message: string;
  default?: any;
  choices?: string[] | { name: string; value: any }[];
  validate?: (input: any) => boolean | string;
  filter?: (input: any) => any;
  when?: (answers: any) => boolean;
}

/**
 * CLI command result
 */
export interface CommandResult {
  success: boolean;
  data?: any;
  error?: Error;
  duration: number;
  metadata?: Record<string, any>;
}

/**
 * CLI session information
 */
export interface CLISession {
  id: string;
  startTime: number;
  command: string;
  args: string[];
  workingDirectory: string;
  user?: string;
  environment: Record<string, string>;
}

/**
 * CLI configuration options
 */
export interface CLIOptions {
  theme?: Partial<CLITheme>;
  outputFormat?: OutputFormat;
  interactive?: boolean;
  colors?: boolean;
  unicode?: boolean;
  timestamps?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'quiet';
}

/**
 * CLI error types
 */
export enum CLIErrorType {
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  EXECUTION_ERROR = 'EXECUTION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  FILE_ERROR = 'FILE_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  USER_ABORT = 'USER_ABORT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * CLI error interface
 */
export interface CLIError extends Error {
  type: CLIErrorType;
  code?: string;
  context?: Record<string, any>;
  suggestions?: string[];
  recoverable?: boolean;
}

/**
 * CLI event types
 */
export enum CLIEventType {
  COMMAND_START = 'command_start',
  COMMAND_END = 'command_end',
  COMMAND_ERROR = 'command_error',
  CONFIG_LOADED = 'config_loaded',
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  USER_INPUT = 'user_input',
  OUTPUT_GENERATED = 'output_generated',
}

/**
 * CLI event interface
 */
export interface CLIEvent {
  type: CLIEventType;
  timestamp: number;
  data?: any;
  sessionId?: string;
}

/**
 * CLI metrics interface
 */
export interface CLIMetrics {
  commandsExecuted: number;
  totalDuration: number;
  averageDuration: number;
  errorsEncountered: number;
  successRate: number;
  lastExecuted?: number;
}

/**
 * CLI history entry
 */
export interface CLIHistoryEntry {
  id: string;
  command: string;
  args: string[];
  timestamp: number;
  duration: number;
  success: boolean;
  workingDirectory: string;
  error?: string;
}

/**
 * CLI autocomplete suggestion
 */
export interface AutocompleteSuggestion {
  value: string;
  description?: string;
  type: 'command' | 'option' | 'argument' | 'file' | 'directory';
  priority?: number;
}

/**
 * CLI help section
 */
export interface HelpSection {
  title: string;
  content: string;
  order?: number;
}

/**
 * CLI command metadata
 */
export interface CommandMetadata {
  name: string;
  description: string;
  category?: string;
  examples?: string[];
  aliases?: string[];
  hidden?: boolean;
  experimental?: boolean;
  deprecated?: boolean;
  since?: string;
  helpSections?: HelpSection[];
}

/**
 * CLI plugin interface
 */
export interface CLIPlugin {
  name: string;
  version: string;
  description: string;
  commands?: CommandMetadata[];
  hooks?: {
    beforeCommand?: (context: CLIContext) => Promise<void>;
    afterCommand?: (context: CLIContext, result: CommandResult) => Promise<void>;
    onError?: (context: CLIContext, error: CLIError) => Promise<void>;
  };
  initialize?: (context: CLIContext) => Promise<void>;
  dispose?: () => Promise<void>;
}

/**
 * CLI middleware function
 */
export type CLIMiddleware = (
  context: CLIContext,
  next: () => Promise<CommandResult>
) => Promise<CommandResult>;

/**
 * CLI output stream interface
 */
export interface OutputStream {
  write(data: string): void;
  writeLine(data: string): void;
  writeError(data: string): void;
  clear(): void;
  moveCursor(dx: number, dy: number): void;
  clearLine(): void;
  showCursor(): void;
  hideCursor(): void;
}

/**
 * CLI input stream interface
 */
export interface InputStream {
  read(): Promise<string>;
  readLine(): Promise<string>;
  readKey(): Promise<string>;
  setRawMode(enabled: boolean): void;
}

/**
 * CLI terminal interface
 */
export interface Terminal {
  width: number;
  height: number;
  isTTY: boolean;
  supportsColor: boolean;
  supportsUnicode: boolean;
  output: OutputStream;
  input: InputStream;
}

/**
 * CLI configuration file structure
 */
export interface CLIConfigFile {
  version: string;
  options: CLIOptions;
  aliases?: Record<string, string>;
  plugins?: string[];
  profiles?: Record<string, any>;
  history?: {
    enabled: boolean;
    maxEntries: number;
    file?: string;
  };
  autocomplete?: {
    enabled: boolean;
    cache: boolean;
    sources: string[];
  };
}

/**
 * CLI state interface
 */
export interface CLIState {
  session: CLISession;
  metrics: CLIMetrics;
  history: CLIHistoryEntry[];
  plugins: CLIPlugin[];
  middleware: CLIMiddleware[];
  terminal: Terminal;
  options: CLIOptions;
}