# Testing Guide

LlamaCLI 采用现代化的测试策略，确保代码质量和系统稳定性。

## 测试框架

### 主要工具

- **Vitest** - 主要测试框架，快速且现代化
- **@testing-library/react** - React 组件测试
- **MSW (Mock Service Worker)** - API 模拟
- **Happy DOM** - 轻量级 DOM 环境

### 测试类型

1. **单元测试** - 测试独立组件和函数
2. **集成测试** - 测试模块间交互
3. **端到端测试** - 测试完整用户流程

## 运行测试

### 基本命令

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行测试（非监视模式）
npm test -- --run

# 运行特定测试文件
npm test -- packages/core/src/config/__tests__/config.test.ts

# 运行测试并显示详细输出
npm test -- --reporter=verbose
```

### 包级别测试

```bash
# 仅测试核心包
npm test --workspace=@llamacli/core

# 仅测试 CLI 包
npm test --workspace=@llamacli/cli
```

### 集成测试

```bash
# 基础集成测试
npm run test:integration

# 完整集成测试
npm run test:integration:full

# CLI 功能测试
npm run test:features

# 错误处理测试
npm run test:error
```

## 测试结构

### 目录组织

```
packages/
├── core/src/
│   ├── config/__tests__/          # 配置管理测试
│   ├── mcp/__tests__/             # MCP 客户端测试
│   ├── session/__tests__/         # 会话管理测试
│   ├── adapters/__tests__/        # LLM 适配器测试
│   ├── tools/*/tests__/          # 工具测试
│   └── test-utils/               # 测试工具集
└── cli/src/
    └── __tests__/                # CLI 测试
```

### 测试工具集

位于 `packages/core/src/test-utils/`：

- **factories.ts** - 测试数据工厂
- **mock-adapters.ts** - LLM 适配器模拟
- **mock-filesystem.ts** - 文件系统模拟
- **msw-handlers.ts** - API 请求模拟
- **test-helpers.ts** - 测试辅助函数

## 编写测试

### 基本测试结构

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("ComponentName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should perform expected behavior", () => {
    // Arrange
    const input = "test input";

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe("expected output");
  });
});
```

### 使用测试工具

```typescript
import {
  createMockLLMAdapter,
  createMockSession,
  mockFs,
  setupMockProject,
} from "../test-utils/index.js";

describe("SessionManager", () => {
  beforeEach(() => {
    mockFs.clear();
    setupMockProject();
  });

  it("should create session", async () => {
    const adapter = createMockLLMAdapter();
    const session = createMockSession();

    // Test implementation
  });
});
```

### 异步测试

```typescript
it("should handle async operations", async () => {
  const promise = asyncFunction();
  await expect(promise).resolves.toBe("expected result");
});

it("should handle errors", async () => {
  const promise = failingAsyncFunction();
  await expect(promise).rejects.toThrow("Expected error");
});
```

### 模拟和间谍

```typescript
import { vi } from "vitest";

// 模拟函数
const mockFn = vi.fn();
mockFn.mockReturnValue("mocked result");

// 间谍函数
const spy = vi.spyOn(object, "method");
expect(spy).toHaveBeenCalledWith("expected argument");

// 模拟模块
vi.mock("fs/promises", () => ({
  readFile: vi.fn().mockResolvedValue("file content"),
}));
```

## 覆盖率要求

### 阈值设置

- **Core 包**: 85% (分支、函数、行、语句)
- **CLI 包**: 80% (分支、函数、行、语句)

### 查看覆盖率报告

```bash
# 生成覆盖率报告
npm run test:coverage

# 查看 HTML 报告
open packages/core/coverage/index.html
open packages/cli/coverage/index.html
```

## 最佳实践

### 测试命名

- 使用描述性的测试名称
- 遵循 "should [expected behavior] when [condition]" 格式

### 测试组织

- 每个源文件对应一个测试文件
- 使用 `describe` 块组织相关测试
- 使用 `beforeEach`/`afterEach` 进行设置和清理

### 模拟策略

- 模拟外部依赖（API、文件系统、数据库）
- 避免模拟被测试的代码
- 使用工厂函数创建测试数据

### 断言

- 使用具体的断言而非通用的 `toBeTruthy()`
- 测试边界条件和错误情况
- 验证副作用（函数调用、状态变化）

## 调试测试

### 调试技巧

```bash
# 运行单个测试文件
npm test -- --run packages/core/src/config/__tests__/config.test.ts

# 使用调试器
npm test -- --inspect-brk

# 显示控制台输出
npm test -- --reporter=verbose
```

### 常见问题

1. **测试超时** - 增加 `testTimeout` 配置
2. **模拟不工作** - 检查模拟路径和时机
3. **异步测试失败** - 确保正确使用 `await`

## 持续集成

测试在以下情况自动运行：

- 每次 `git push`
- Pull Request 创建和更新
- 定期构建

确保所有测试通过后再合并代码。
