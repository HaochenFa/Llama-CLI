# LlamaCLI 开发者指南

## 🏗️ 项目架构

LlamaCLI 采用 monorepo 结构，主要包含两个核心包：

```
packages/
├── core/           # 核心功能库
│   ├── src/
│   │   ├── tools/     # 工具系统
│   │   ├── adapters/  # LLM 适配器
│   │   ├── mcp/       # MCP 协议实现
│   │   └── config/    # 配置管理
└── cli/            # 命令行界面
    ├── src/
    │   ├── commands/  # CLI 命令
    │   ├── ui/        # 用户界面组件
    │   └── utils/     # 工具函数
```

## 🚀 开发环境设置

### 前置要求

- Node.js 18+
- npm 或 yarn
- TypeScript 5+

### 安装和构建

```bash
# 克隆项目
git clone https://github.com/HaochenFa/Llama-CLI.git
cd Llama-CLI

# 安装依赖
npm install

# 构建项目
npm run build

# 开发模式（监听文件变化）
npm run build:watch

# 运行测试
npm test

# 代码检查
npm run lint

# 格式化代码
npm run format
```

### 开发工作流

1. **创建功能分支**: `git checkout -b feature/your-feature`
2. **开发和测试**: 使用 `npm run build:watch` 进行开发
3. **运行测试**: `npm test` 确保所有测试通过
4. **代码检查**: `npm run lint` 修复代码风格问题
5. **提交代码**: 使用清晰的提交信息
6. **创建 PR**: 提交 Pull Request 进行代码审查

## 🔧 核心组件开发

### 创建新工具

工具是 LlamaCLI 的核心功能。创建新工具需要实现 `BaseTool` 抽象类：

```typescript
import { BaseTool, ToolParams, ToolContext } from "@llamacli/core";

interface MyToolParams extends ToolParams {
  input: string;
  options?: string[];
}

export class MyCustomTool extends BaseTool {
  readonly name = "my_tool";
  readonly description = "Description of what this tool does";
  readonly schema = {
    type: "object" as const,
    properties: {
      input: {
        type: "string",
        description: "Input parameter description",
      },
      options: {
        type: "array",
        items: { type: "string" },
        description: "Optional parameters",
      },
    },
    required: ["input"],
  };

  getTags(): string[] {
    return ["custom", "example"];
  }

  isAvailable(context?: ToolContext): boolean {
    // 检查工具是否可用
    return true;
  }

  async execute(params: MyToolParams, context?: ToolContext) {
    try {
      // 验证参数
      const validation = this.validate(params);
      if (!validation.isValid) {
        return this.createErrorResult(validation.errors);
      }

      // 实现工具逻辑
      const result = await this.performOperation(params);

      return this.createSuccessResult([
        {
          type: "text",
          text: `操作完成: ${result}`,
        },
      ]);
    } catch (error) {
      return this.createErrorResult([`执行失败: ${error.message}`]);
    }
  }

  private async performOperation(params: MyToolParams): Promise<string> {
    // 具体的工具实现逻辑
    return `处理了输入: ${params.input}`;
  }
}
```

### 注册工具

在 `packages/core/src/tools/index.ts` 中注册新工具：

```typescript
import { MyCustomTool } from "./custom/my-tool.js";

// 在 getAllTools 函数中添加
export function getAllTools(): BaseTool[] {
  return [
    // ... 现有工具
    new MyCustomTool(),
  ];
}
```

### 创建 LLM 适配器

实现新的 LLM 适配器需要实现 `LLMAdapter` 接口：

```typescript
import { LLMAdapter, LLMMessage, LLMResponse } from "@llamacli/core";

export class MyLLMAdapter implements LLMAdapter {
  constructor(private config: MyLLMConfig) {}

  async generateResponse(
    messages: LLMMessage[],
    options?: LLMGenerationOptions
  ): Promise<LLMResponse> {
    // 实现与 LLM 的通信逻辑
    const response = await this.callLLMAPI(messages, options);

    return {
      content: response.text,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.total_tokens,
      },
    };
  }

  async validateConnection(): Promise<boolean> {
    // 验证连接是否正常
    try {
      await this.callHealthCheck();
      return true;
    } catch {
      return false;
    }
  }
}
```

### 添加 CLI 命令

在 `packages/cli/src/commands/` 中创建新命令：

```typescript
import { Command } from "commander";
import { ConfigStore } from "@llamacli/core";

export class MyCommand {
  constructor(private configStore: ConfigStore) {}

  register(program: Command): void {
    program
      .command("my-command")
      .description("My custom command description")
      .option("-o, --option <value>", "Command option")
      .action(async (options) => {
        await this.run(options);
      });
  }

  async run(options: any): Promise<void> {
    // 实现命令逻辑
    console.log("执行自定义命令", options);
  }
}
```

## 🧪 测试

### 单元测试

为新功能编写测试：

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { MyCustomTool } from "../my-tool.js";

describe("MyCustomTool", () => {
  let tool: MyCustomTool;

  beforeEach(() => {
    tool = new MyCustomTool();
  });

  it("should have correct name and description", () => {
    expect(tool.name).toBe("my_tool");
    expect(tool.description).toBeTruthy();
  });

  it("should execute successfully with valid params", async () => {
    const result = await tool.execute({ input: "test" });

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toContain("test");
  });

  it("should handle invalid params", async () => {
    const result = await tool.execute({} as any);

    expect(result.isError).toBe(true);
  });
});
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- my-tool.test.ts

# 监听模式
npm test -- --watch

# 生成覆盖率报告
npm test -- --coverage
```

## 📝 代码规范

### TypeScript 规范

- 使用严格的 TypeScript 配置
- 为所有公共 API 提供类型定义
- 避免使用 `any`，优先使用具体类型
- 使用接口定义复杂对象结构

### 命名规范

- **文件名**: kebab-case (`my-tool.ts`)
- **类名**: PascalCase (`MyCustomTool`)
- **函数/变量**: camelCase (`executeCommand`)
- **常量**: UPPER_SNAKE_CASE (`MAX_RETRIES`)

### 错误处理

- 使用统一的错误处理机制
- 提供有意义的错误信息
- 记录适当的日志级别

### 文档

- 为所有公共 API 编写 JSDoc 注释
- 在 README 中更新功能说明
- 为复杂功能提供使用示例

## 🔄 发布流程

### 版本管理

项目使用语义化版本控制：

- **主版本号**: 不兼容的 API 修改
- **次版本号**: 向下兼容的功能性新增
- **修订号**: 向下兼容的问题修正

### 发布步骤

1. **更新版本号**: 在 `package.json` 中更新版本
2. **更新 CHANGELOG**: 记录本次发布的变更
3. **运行测试**: 确保所有测试通过
4. **构建项目**: `npm run build`
5. **创建标签**: `git tag v1.0.0`
6. **推送代码**: `git push origin main --tags`

## 🤝 贡献指南

### 提交规范

使用约定式提交格式：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

类型包括：

- `feat`: 新功能
- `fix`: 修复问题
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### Pull Request

1. Fork 项目到您的 GitHub 账户
2. 创建功能分支
3. 进行开发和测试
4. 提交 Pull Request
5. 等待代码审查和合并

### 问题报告

报告问题时请包含：

- 详细的问题描述
- 重现步骤
- 期望行为
- 实际行为
- 环境信息（操作系统、Node.js 版本等）

## 📚 有用资源

- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Vitest 测试框架](https://vitest.dev/)
- [Ink React 终端 UI](https://github.com/vadimdemedes/ink)
- [MCP 协议规范](https://modelcontextprotocol.io/)
- [esbuild 构建工具](https://esbuild.github.io/)

## 💬 获取帮助

- **GitHub Issues**: 报告问题和功能请求
- **GitHub Discussions**: 技术讨论和问答
- **代码审查**: 通过 Pull Request 获取反馈

感谢您对 LlamaCLI 项目的贡献！
