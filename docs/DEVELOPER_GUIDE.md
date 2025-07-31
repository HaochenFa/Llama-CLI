# LlamaCLI Developer Guide

**Version**: 0.9.0  
**Last Updated**: 2025-08-01

## 🏗️ Project Architecture

LlamaCLI uses a monorepo structure with two core packages based on the actual implementation:

```text
packages/
├── core/                           # Core functionality library (@llamacli/core)
│   ├── src/
│   │   ├── adapters/              # LLM adapters (Ollama, OpenAI, Claude, Gemini)
│   │   ├── config/                # Configuration management (ConfigStore, UserPreferences)
│   │   ├── context/               # Context and session management
│   │   ├── core/                  # Core systems (AgenticLoop, ToolScheduler)
│   │   ├── error/                 # Enhanced error handling system
│   │   ├── mcp/                   # Model Context Protocol implementation
│   │   ├── performance/           # Performance monitoring and benchmarking
│   │   ├── session/               # Session management system
│   │   ├── tools/                 # Tool system and registry
│   │   ├── types/                 # TypeScript type definitions
│   │   └── utils/                 # Utility functions
└── cli/                           # Command line interface (@llamacli/cli)
    ├── src/
    │   ├── commands/              # CLI commands (chat, config, session, preferences)
    │   ├── ui/                    # User interface components
    │   │   ├── components/        # React components for terminal UI
    │   │   ├── completion.ts      # Auto-completion engine
    │   │   ├── interactive-cli.ts # Interactive CLI interface
    │   │   ├── syntax-highlighting.ts # Code syntax highlighting
    │   │   └── theme-manager.ts   # Theme management system
    │   ├── types/                 # CLI-specific type definitions
    │   └── utils/                 # CLI utility functions
```

## 🚀 Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/HaochenFa/Llama-CLI.git
cd Llama-CLI

# Install dependencies
npm install

# Build the project
npm run build

# Link for development
npm link packages/cli
```

### Development Scripts

```bash
# Build all packages
npm run build

# Build JavaScript only
npm run build:js

# Build TypeScript declarations
npm run build:types

# Development mode with watch
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format

# Type checking
npm run typecheck

# Clean build artifacts
npm run clean
```

## 🏗️ Core Components

### Configuration System

#### ConfigStore

The main configuration management system:

```typescript
// packages/core/src/config/store.ts
export class ConfigStore {
  async addProfile(name: string, config: LLMProfile): Promise<void>;
  async removeProfile(name: string): Promise<void>;
  async setDefaultProfile(name: string): Promise<void>;
  getProfiles(): Record<string, LLMProfile>;
  getProfile(name: string): LLMProfile | undefined;
}
```

#### UserPreferencesManager

Manages user preferences across 6 categories:

```typescript
// packages/core/src/config/user-preferences.ts
export class UserPreferencesManager {
  async initialize(): Promise<void>;
  getCLIPreferences(): CLIPreferences;
  getEditorPreferences(): EditorPreferences;
  getDisplayPreferences(): DisplayPreferences;
  getBehaviorPreferences(): BehaviorPreferences;
  getShortcutPreferences(): ShortcutPreferences;
  getHistoryPreferences(): HistoryPreferences;

  async updateCLIPreferences(updates: Partial<CLIPreferences>): Promise<void>;
  onPreferencesChange(callback: (prefs: UserPreferences) => void): () => void;
}
```

### LLM Adapters

All adapters implement the `BaseLLMAdapter` interface:

```typescript
// packages/core/src/adapters/base.ts
export abstract class BaseLLMAdapter {
  abstract generate(messages: LLMMessage[], options?: LLMGenerationOptions): Promise<LLMResponse>;

  abstract generateStream(
    messages: LLMMessage[],
    options?: LLMGenerationOptions
  ): AsyncGenerator<LLMStreamChunk>;
}
```

#### Implemented Adapters

- **OllamaAdapter**: Local Ollama models
- **OpenAIAdapter**: OpenAI GPT models
- **ClaudeAdapter**: Anthropic Claude models
- **GeminiAdapter**: Google Gemini models
- **OpenAICompatibleAdapter**: OpenAI-compatible services

### Session Management

#### SessionManager

Handles session lifecycle:

```typescript
// packages/core/src/session/session-manager.ts
export class SessionManager {
  async createSession(name?: string): Promise<SessionData>;
  async saveSession(session: SessionData): Promise<void>;
  async loadSession(sessionId: string): Promise<SessionData>;
  async listSessions(): Promise<SessionData[]>;
  async deleteSession(sessionId: string): Promise<void>;
  async exportSession(sessionId: string, filePath: string): Promise<void>;
}
```

### Performance Monitoring

#### PerformanceMonitor

Real-time performance tracking:

```typescript
// packages/core/src/performance/monitor.ts
export class PerformanceMonitor {
  start(): void;
  startOperation(name: string): void;
  endOperation(name: string): PerformanceMetrics;
  getSystemMetrics(): SystemMetrics;
}
```

### Error Handling

#### Enhanced Error System

Intelligent error processing:

```typescript
// packages/core/src/error/enhanced-error-handler.ts
export class EnhancedErrorHandler {
  processError(error: Error, context: ErrorContext): EnhancedError;
  classifyError(error: Error): ErrorType;
  generateSuggestions(error: EnhancedError): ErrorSuggestion[];
}
```

## 🖥️ CLI Components

### Interactive CLI

#### InteractiveCLI

Main interactive interface:

```typescript
// packages/cli/src/ui/interactive-cli.ts
export class InteractiveCLI extends EventEmitter {
  constructor(options: InteractiveCLIOptions);
  async start(): Promise<void>;
  on(event: "command", listener: (command: string, args: string[]) => void): this;
  on(event: "completion", listener: (input: string) => void): this;
}
```

#### CompletionEngine

Auto-completion system:

```typescript
// packages/cli/src/ui/completion.ts
export class CompletionEngine {
  async getCompletions(input: string, context: CompletionContext): Promise<string[]>;
  registerCommandCompletions(command: string, completions: string[]): void;
}
```

#### ThemeManager

Theme management:

```typescript
// packages/cli/src/ui/theme-manager.ts
export class ThemeManager {
  async setTheme(themeName: string): Promise<void>;
  getCurrentTheme(): CLITheme;
  getAvailableThemes(): string[];
}
```

### Commands

All commands extend the base command class:

```typescript
// packages/cli/src/commands/base.ts
export abstract class BaseCommand {
  constructor(protected configStore: ConfigStore)
  abstract run(options: any): Promise<void>
}
```

#### Implemented Commands

- **ChatCommand**: Interactive chat sessions
- **ConfigCommand**: Profile management
- **GetCommand**: Quick queries
- **SessionCommand**: Session management
- **PreferencesCommand**: User preferences

## 🧪 Testing

### Test Structure

```text
packages/
├── core/src/__tests__/
│   ├── integration.test.ts
│   └── adapters/
│       └── adapters.test.ts
└── cli/src/__tests__/
    └── cli.test.ts
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npx vitest packages/core/src/__tests__/integration.test.ts
```

### Writing Tests

```typescript
import { describe, it, expect } from "vitest";
import { ConfigStore } from "../config/store.js";

describe("ConfigStore", () => {
  it("should add and retrieve profiles", async () => {
    const store = new ConfigStore();
    await store.addProfile("test", {
      adapter: "ollama",
      model: "llama2",
    });

    const profile = store.getProfile("test");
    expect(profile).toBeDefined();
    expect(profile?.model).toBe("llama2");
  });
});
```

## 🔧 Build System

### esbuild Configuration

The project uses esbuild for fast compilation:

```javascript
// esbuild.config.js
const packages = [
  {
    name: "core",
    entryPoints: ["packages/core/src/index.ts"],
    outfile: "packages/core/dist/index.js",
  },
  {
    name: "cli",
    entryPoints: ["packages/cli/src/index.ts"],
    outfile: "packages/cli/dist/index.js",
    banner: { js: "#!/usr/bin/env node" },
  },
];
```

### TypeScript Configuration

Each package has its own TypeScript configuration:

```json
// packages/core/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": []
}
```

## 🚀 Adding New Features

### Adding a New LLM Adapter

1. Create adapter class:

```typescript
// packages/core/src/adapters/my-adapter.ts
import { BaseLLMAdapter } from "./base.js";

export class MyAdapter extends BaseLLMAdapter {
  async generate(messages: LLMMessage[]): Promise<LLMResponse> {
    // Implementation
  }
}
```

2. Export from index:

```typescript
// packages/core/src/index.ts
export * from "./adapters/my-adapter.js";
```

3. Add to adapter factory:

```typescript
// packages/cli/src/utils/adapter-factory.ts
case 'my-adapter':
  return new MyAdapter(config);
```

### Adding a New CLI Command

1. Create command class:

```typescript
// packages/cli/src/commands/my-command.ts
import { BaseCommand } from "./base.js";

export class MyCommand extends BaseCommand {
  async run(options: any): Promise<void> {
    // Implementation
  }
}
```

2. Register in main CLI:

```typescript
// packages/cli/src/index.ts
program
  .command("my-command")
  .description("My new command")
  .action(async (options) => {
    const command = new MyCommand(configStore);
    await command.run(options);
  });
```

## 📝 Code Style

### ESLint Configuration

```json
{
  "extends": ["@typescript-eslint/recommended"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## 🐛 Debugging

### Debug Mode

Enable debug logging:

```bash
LLAMACLI_DEBUG=1 llamacli your-command
```

### Performance Analysis

Run performance analysis:

```bash
npm run perf
```

### Memory Profiling

```bash
node --inspect packages/cli/dist/index.js
```

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and add tests
4. Run tests: `npm test`
5. Run linting: `npm run lint`
6. Commit changes: `git commit -m "feat: add my feature"`
7. Push to branch: `git push origin feature/my-feature`
8. Create a Pull Request

### Commit Convention

Use conventional commits:

```
feat: add new feature
fix: fix bug
docs: update documentation
style: formatting changes
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

---

For API details and usage examples, see the [API Reference](API_REFERENCE.md) and [User Guide](USER_GUIDE.md).
