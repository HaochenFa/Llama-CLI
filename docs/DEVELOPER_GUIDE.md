# LlamaCLI Developer Guide

**Version**: 1.0.0
**Last Updated**: 2025-08-02

> 🎯 **Quick Start**: New to contributing? Jump to [Contributing](#-contributing) section.

## 🏗️ Architecture Overview

### Monorepo Structure

```
packages/
├── core/           # @llamacli/core - Core functionality
│   ├── adapters/   # LLM providers (Ollama, OpenAI, Claude, Gemini)
│   ├── config/     # Configuration & preferences management
│   ├── core/       # Agentic loop, tool scheduler, context manager
│   ├── tools/      # File, shell, network tools
│   └── session/    # Session & history management
└── cli/            # @llamacli/cli - Command line interface
    ├── commands/   # CLI commands (chat, config, session)
    ├── ui/         # Interactive CLI, themes, completion
    └── utils/      # CLI utilities and helpers
```

### Key Components

| Component               | Purpose                  | Location             |
| ----------------------- | ------------------------ | -------------------- |
| **AgenticLoop**         | AI task orchestration    | `core/core/`         |
| **ConfigStore**         | Configuration management | `core/config/`       |
| **ChatInterface**       | Modern React+Ink UI      | `cli/ui/components/` |
| **ToolRegistry**        | Tool system management   | `core/tools/`        |
| **SessionManager**      | Conversation persistence | `core/session/`      |
| **ConnectionValidator** | LLM connection testing   | `cli/utils/`         |

## 🚀 Quick Development Setup

### Prerequisites

- Node.js 22.17.0 (使用 nvm 管理版本，项目包含 .nvmrc 文件)
- npm >= 10.0.0

### One-Command Setup

```bash
# 确保使用正确的 Node.js 版本
source ~/.nvm/nvm.sh && nvm use

git clone https://github.com/HaochenFa/Llama-CLI.git
cd Llama-CLI && npm install && npm run build && npm link packages/cli
```

### Essential Commands

| Command          | Purpose                     |
| ---------------- | --------------------------- |
| `npm run build`  | Build all packages          |
| `npm run dev`    | Development with watch mode |
| `npm test`       | Run test suite              |
| `npm run lint`   | Code linting                |
| `npm run format` | Code formatting             |

## 🏗️ Core Architecture for Contributors

### Key Interfaces

#### LLM Adapter Interface

```typescript
// All LLM adapters implement this interface
export abstract class BaseLLMAdapter {
  abstract generate(messages: LLMMessage[]): Promise<LLMResponse>;
  abstract generateStream(messages: LLMMessage[]): AsyncGenerator<LLMStreamChunk>;
}
```

#### Tool Interface

```typescript
// All tools implement this interface
export abstract class BaseTool {
  abstract name: string;
  abstract description: string;
  abstract execute(params: any): Promise<any>;
}
```

### Extension Points

| Component        | How to Extend           | Example              |
| ---------------- | ----------------------- | -------------------- |
| **LLM Adapters** | Extend `BaseLLMAdapter` | Add new AI provider  |
| **Tools**        | Extend `BaseTool`       | Add file operations  |
| **Commands**     | Extend `BaseCommand`    | Add CLI commands     |
| **Themes**       | Add to `ThemeManager`   | Custom color schemes |

## 🤝 Contributing

### Quick Start for Contributors

1. **Fork & Clone**

   ```bash
   git clone https://github.com/YOUR_USERNAME/Llama-CLI.git
   cd Llama-CLI
   ```

2. **Setup Development Environment**

   ```bash
   npm install && npm run build && npm link packages/cli
   ```

3. **Create Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make Changes & Test**

   ```bash
   npm test && npm run lint
   ```

5. **Submit Pull Request**
   ```bash
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

### Contribution Areas

| Area              | Skills Needed               | Examples                    |
| ----------------- | --------------------------- | --------------------------- |
| **LLM Adapters**  | TypeScript, API integration | Add Cohere, Mistral support |
| **Tools**         | Node.js, system integration | File operations, git tools  |
| **UI/UX**         | CLI design, React           | Themes, completion, layouts |
| **Documentation** | Technical writing           | Guides, examples, API docs  |
| **Testing**       | Jest, integration testing   | Unit tests, E2E scenarios   |

### Code Standards

#### Commit Convention

```bash
feat: add new feature
fix: fix bug
docs: update documentation
style: formatting changes
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

#### Code Quality

- TypeScript strict mode
- ESLint + Prettier formatting
- 90%+ test coverage
- JSDoc comments for public APIs

### Development Resources

#### Testing

LlamaCLI uses Vitest as the primary testing framework with comprehensive test coverage.

```bash
# Basic testing commands
npm test                    # Run all tests
npm run test:coverage       # Test with coverage report
npm test -- --run          # Run tests without watch mode
npm test -- --ui           # Run tests with UI interface

# Package-specific testing
npm test --workspace=@llamacli/core    # Test core package only
npm test --workspace=@llamacli/cli     # Test CLI package only

# Integration testing
npm run test:integration    # Basic integration tests
npm run test:features       # CLI feature tests
npm run test:error          # Error handling tests
```

**Test Structure:**

- **Unit Tests**: `packages/*/src/**/*.{test,spec}.ts`
- **Integration Tests**: `scripts/test-*.js`
- **Test Utilities**: `packages/core/src/test-utils/`

**Coverage Thresholds:**

- Core package: 85% (branches, functions, lines, statements)
- CLI package: 80% (branches, functions, lines, statements)

**Writing Tests:**

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockLLMAdapter } from "../test-utils/mock-adapters.js";

describe("MyComponent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should work correctly", () => {
    // Test implementation
  });
});
```

#### Debugging

```bash
LLAMACLI_DEBUG=1 llamacli   # Enable debug mode
node --inspect dist/index.js # Memory profiling
```

#### Extension Examples

- **New LLM Adapter**: Extend `BaseLLMAdapter` in `core/adapters/`
- **New Tool**: Extend `BaseTool` in `core/tools/`
- **New Command**: Extend `BaseCommand` in `cli/commands/`

---

**Resources**: [API Reference](API_REFERENCE.md) • [User Guide](USER_GUIDE.md) • [Examples](examples/)
