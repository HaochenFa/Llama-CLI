# LlamaCLI API Reference

**Version**: 0.9.0  
**Last Updated**: 2025-08-01

## Overview

LlamaCLI provides a comprehensive API for building AI-powered command-line applications. This document covers the main APIs based on the actual implementation.

## Core Package (@llamacli/core)

### Configuration Management

#### ConfigStore

Type-safe configuration storage and management.

```typescript
import { ConfigStore } from "@llamacli/core";

const configStore = new ConfigStore();

// Profile management
await configStore.addProfile("my-ollama", {
  adapter: "ollama",
  model: "llama2",
  endpoint: "http://localhost:11434",
});

await configStore.setDefaultProfile("my-ollama");
const profiles = configStore.getProfiles();
```

#### UserPreferencesManager

Comprehensive user preferences system with 50+ configurable options.

```typescript
import { userPreferencesManager } from "@llamacli/core";

// Initialize
await userPreferencesManager.initialize();

// Get preferences by category
const cliPrefs = userPreferencesManager.getCLIPreferences();
const editorPrefs = userPreferencesManager.getEditorPreferences();
const displayPrefs = userPreferencesManager.getDisplayPreferences();

// Update preferences
await userPreferencesManager.updateCLIPreferences({
  theme: "dracula",
  autoComplete: true,
  syntaxHighlighting: true,
});

// Watch for changes
const unwatch = userPreferencesManager.onPreferencesChange((prefs) => {
  console.log("Preferences updated:", prefs.cli.theme);
});
```

### LLM Adapters

#### Supported Adapters

- **OllamaAdapter** - Local Ollama models
- **OpenAIAdapter** - OpenAI GPT models
- **ClaudeAdapter** - Anthropic Claude models
- **GeminiAdapter** - Google Gemini models
- **OpenAICompatibleAdapter** - OpenAI-compatible services

```typescript
import { OllamaAdapter, OpenAIAdapter } from "@llamacli/core";

// Ollama adapter
const ollama = new OllamaAdapter({
  type: "ollama",
  baseUrl: "http://localhost:11434",
  model: "llama2",
  timeout: 30000,
});

// OpenAI adapter
const openai = new OpenAIAdapter({
  type: "openai",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4",
  apiKey: process.env.OPENAI_API_KEY,
});
```

### Session Management

#### SessionManager

Comprehensive session lifecycle management.

```typescript
import { SessionManager } from "@llamacli/core";

const sessionManager = new SessionManager();

// Create and manage sessions
const session = await sessionManager.createSession("my-session");
await sessionManager.saveSession(session);
const sessions = await sessionManager.listSessions();

// Session operations
await sessionManager.switchToSession("session-id");
await sessionManager.exportSession("session-id", "/path/to/export.json");
```

### Performance Monitoring

#### PerformanceMonitor

Real-time performance tracking and metrics collection.

```typescript
import { performanceMonitor, benchmark } from "@llamacli/core";

// Start monitoring
performanceMonitor.start();

// Track operations
performanceMonitor.startOperation("command-execution");
// ... do work ...
const metrics = performanceMonitor.endOperation("command-execution");

// Benchmarking
benchmark.start("startup");
// ... initialization code ...
const duration = benchmark.end("startup");
```

### Error Handling

#### Enhanced Error System

Intelligent error processing with user-friendly messages.

```typescript
import { enhancedErrorHandler, errorDisplayManager, errorMiddleware } from "@llamacli/core";

// Process errors
const enhancedError = enhancedErrorHandler.processError(error, {
  command: "chat",
  operation: "send-message",
  sessionId: "session-123",
});

// Display errors
await errorDisplayManager.displayError(enhancedError, true);

// Wrap functions
const safeFunction = errorMiddleware.wrapFunction(riskyFunction);
```

### Tool System

#### Tool Registry and Execution

```typescript
import { ToolRegistry, ToolExecutor } from "@llamacli/core";

const registry = new ToolRegistry();
const executor = new ToolExecutor(registry);

// Execute tools
const result = await executor.executeTool("ReadFileTool", {
  filePath: "./example.txt",
});
```

## CLI Package (@llamacli/cli)

### Interactive CLI

#### InteractiveCLI

Enhanced command-line interface with modern features.

```typescript
import { InteractiveCLI } from "@llamacli/cli";

const cli = new InteractiveCLI({
  enableCompletion: true,
  enableSyntaxHighlighting: true,
  configStore: configStore,
});

// Event handling
cli.on("command", (command, args) => {
  // Handle command execution
});

cli.on("completion", (input) => {
  // Handle auto-completion
});

await cli.start();
```

#### Theme Management

```typescript
import { themeManager } from "@llamacli/cli";

// Available themes: default, light, dracula, github, monokai
await themeManager.setTheme("dracula");
const currentTheme = themeManager.getCurrentTheme();
const themes = themeManager.getAvailableThemes();
```

#### Auto-completion

```typescript
import { completionEngine } from "@llamacli/cli";

const completions = await completionEngine.getCompletions("chat --", {
  command: "chat",
  position: 7,
  workingDirectory: process.cwd(),
});
```

#### Syntax Highlighting

```typescript
import { syntaxHighlighter } from "@llamacli/cli";

// Supported languages: javascript, python, json, shell, typescript
const highlighted = syntaxHighlighter.highlight(code, "javascript");
const autoDetected = syntaxHighlighter.highlightAuto(code);
```

### Commands

#### Available Commands

- **ChatCommand** - Interactive chat sessions
- **ConfigCommand** - Configuration management
- **GetCommand** - Quick queries
- **SessionCommand** - Session management
- **PreferencesCommand** - User preferences

```typescript
import { ChatCommand, ConfigCommand } from "@llamacli/cli";

const chatCommand = new ChatCommand(configStore);
await chatCommand.run({ profile: "my-ollama" });

const configCommand = new ConfigCommand(configStore);
await configCommand.run(["list"]);
```

## Configuration Structure

### User Preferences

```typescript
interface UserPreferences {
  version: string;
  cli: {
    theme: string;
    prompt: string;
    autoComplete: boolean;
    syntaxHighlighting: boolean;
    showWelcome: boolean;
    enableAnimations: boolean;
  };
  editor: {
    defaultEditor: string;
    tabSize: number;
    lineNumbers: boolean;
    wordWrap: boolean;
  };
  display: {
    maxWidth: number;
    codeBlockStyle: string;
    tableStyle: string;
  };
  behavior: {
    confirmExit: boolean;
    autoSaveSession: boolean;
    sendTelemetry: boolean;
  };
  shortcuts: {
    clearScreen: string;
    exitApp: string;
    toggleTheme: string;
  };
  history: {
    enabled: boolean;
    maxEntries: number;
    persistAcrossSessions: boolean;
    excludePatterns: string[];
  };
}
```

### LLM Profile Configuration

```typescript
interface LLMProfile {
  name: string;
  adapter: "ollama" | "openai" | "claude" | "gemini" | "openai-compatible";
  model: string;
  endpoint?: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  temperature?: number;
  maxTokens?: number;
}
```

## CLI Commands

### Interactive Mode Commands

```bash
# Start interactive mode
llamacli

# Available commands in interactive mode:
help                    # Show help
chat [message]         # Start/continue chat
get <query>           # Quick query
config list           # List profiles
config use <profile>  # Switch profile
theme <name>          # Change theme
preferences list      # Show preferences
session list          # List sessions
clear                 # Clear screen
exit                  # Exit application
```

### Command Line Usage

```bash
# Configuration
llamacli config add my-profile
llamacli config list
llamacli config use my-profile

# Chat
llamacli chat "Hello, how can you help?"
llamacli get "What is TypeScript?"

# Sessions
llamacli session list
llamacli session save my-session
llamacli session export my-session.json

# Preferences
llamacli preferences set cli.theme dracula
llamacli preferences export settings.json
```

## Storage Locations

- **Main Config**: `~/.llamacli/config.json`
- **User Preferences**: `~/.llamacli/preferences.json`
- **Command History**: `~/.llamacli/history.json`
- **Sessions**: `~/.llamacli/sessions/`
- **Error Reports**: `~/.llamacli/error-reports/`

## Environment Variables

- `LLAMACLI_DEBUG` - Enable debug mode
- `LLAMACLI_CONFIG` - Custom config file path
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Claude API key
- `GOOGLE_API_KEY` - Gemini API key

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  UserPreferences,
  CLIPreferences,
  LLMProfile,
  SessionData,
  EnhancedError,
  PerformanceMetrics,
} from "@llamacli/core";
```

---

For implementation examples and advanced usage, see the [Developer Guide](DEVELOPER_GUIDE.md) and [User Guide](USER_GUIDE.md).
