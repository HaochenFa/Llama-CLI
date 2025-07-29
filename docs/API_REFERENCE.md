# LlamaCLI API 参考文档

## 概述

LlamaCLI 提供了丰富的API和工具系统，本文档详细介绍了各个组件的使用方法。

## 核心组件

### 1. 工具系统 (Tools)

LlamaCLI 的工具系统基于统一的接口设计，所有工具都实现了 `BaseTool` 抽象类。

#### 文件系统工具

##### ReadFileTool

安全地读取文件内容。

```typescript
import { ReadFileTool } from "@llamacli/core";

const tool = new ReadFileTool();
const result = await tool.execute({
  filePath: "./example.txt",
  encoding: "utf8",
  startLine: 1,
  endLine: 10,
});
```

**参数：**

- `filePath` (string, 必需): 要读取的文件路径
- `encoding` (string, 可选): 文件编码，默认 'utf8'
- `startLine` (number, 可选): 起始行号（1-based）
- `endLine` (number, 可选): 结束行号（1-based）
- `maxSize` (number, 可选): 最大文件大小限制

**安全特性：**

- 阻止访问系统敏感路径（/etc/passwd 等）
- 阻止读取可执行文件
- 自动检测二进制文件并警告
- 文件大小限制保护

##### WriteFileTool

安全地写入文件内容。

```typescript
import { WriteFileTool } from "@llamacli/core";

const tool = new WriteFileTool();
const result = await tool.execute({
  filePath: "./output.txt",
  content: "Hello, World!",
  createDirectories: true,
  backup: true,
});
```

**参数：**

- `filePath` (string, 必需): 目标文件路径
- `content` (string, 必需): 要写入的内容
- `encoding` (string, 可选): 文件编码，默认 'utf8'
- `createDirectories` (boolean, 可选): 是否创建父目录，默认 true
- `backup` (boolean, 可选): 是否创建备份，默认 false
- `mode` (number, 可选): 文件权限，默认 0o644

##### ListDirectoryTool

列出目录内容。

```typescript
import { ListDirectoryTool } from "@llamacli/core";

const tool = new ListDirectoryTool();
const result = await tool.execute({
  directoryPath: "./src",
  recursive: true,
  includeHidden: false,
  sortBy: "name",
  sortOrder: "asc",
});
```

**参数：**

- `directoryPath` (string, 必需): 目录路径
- `recursive` (boolean, 可选): 是否递归列出子目录，默认 false
- `includeHidden` (boolean, 可选): 是否包含隐藏文件，默认 false
- `sortBy` (string, 可选): 排序字段 ('name'|'size'|'modified'|'type')
- `sortOrder` (string, 可选): 排序顺序 ('asc'|'desc')
- `maxEntries` (number, 可选): 最大条目数限制
- `excludePatterns` (string[], 可选): 排除模式

##### SearchFilesTool

在文件中搜索文本模式。

```typescript
import { SearchFilesTool } from "@llamacli/core";

const tool = new SearchFilesTool();
const result = await tool.execute({
  pattern: "function",
  directoryPath: "./src",
  filePattern: "*.ts",
  recursive: true,
  caseSensitive: false,
  useRegex: false,
});
```

**参数：**

- `pattern` (string, 必需): 搜索模式
- `directoryPath` (string, 可选): 搜索目录，默认当前目录
- `filePattern` (string, 可选): 文件名模式，默认 '\*'
- `recursive` (boolean, 可选): 是否递归搜索，默认 true
- `caseSensitive` (boolean, 可选): 是否大小写敏感，默认 false
- `wholeWord` (boolean, 可选): 是否匹配整词，默认 false
- `useRegex` (boolean, 可选): 是否使用正则表达式，默认 false
- `maxResults` (number, 可选): 最大结果数，默认 100
- `contextLines` (number, 可选): 上下文行数，默认 2

#### Shell工具

##### ShellExecuteTool

安全地执行Shell命令。

```typescript
import { ShellExecuteTool } from "@llamacli/core";

const tool = new ShellExecuteTool();
const result = await tool.execute({
  command: 'echo "Hello, World!"',
  workingDirectory: "/tmp",
  timeout: 30000,
  environment: { NODE_ENV: "development" },
});
```

**参数：**

- `command` (string, 必需): 要执行的命令
- `workingDirectory` (string, 可选): 工作目录
- `timeout` (number, 可选): 超时时间（毫秒），默认 30000
- `shell` (string, 可选): Shell路径，默认 '/bin/bash'
- `environment` (object, 可选): 环境变量
- `input` (string, 可选): 标准输入内容

**安全特性：**

- 阻止危险命令（rm -rf /、fork bomb等）
- 限制允许的Shell路径
- 限制工作目录访问
- 命令执行超时保护
- 输出大小限制

### 2. MCP协议支持

#### BuiltinMCPServer

内置的MCP服务器实现，自动注册所有工具。

```typescript
import { BuiltinMCPServer } from "@llamacli/core";

const server = new BuiltinMCPServer({
  name: "llamacli-server",
  version: "1.0.0",
  maxConcurrentRequests: 10,
  requestTimeout: 30000,
  enableLogging: true,
});

await server.start();

// 获取注册的工具
const tools = server.getTools();
console.log(
  "Available tools:",
  tools.map((t) => t.name)
);

await server.stop();
```

#### MCPClient

MCP客户端实现，用于连接外部MCP服务器。

```typescript
import { MCPClient } from "@llamacli/core";

const client = new MCPClient({
  serverCommand: "node",
  serverArgs: ["mcp-server.js"],
  timeout: 30000,
});

await client.connect();
const tools = await client.listTools();
const result = await client.callTool("tool_name", { param: "value" });
await client.disconnect();
```

### 3. LLM适配器

#### OllamaAdapter

Ollama本地模型适配器。

```typescript
import { OllamaAdapter } from "@llamacli/core";

const adapter = new OllamaAdapter({
  baseUrl: "http://localhost:11434",
  model: "llama2",
  timeout: 60000,
});

const response = await adapter.generateResponse({
  messages: [{ role: "user", content: "Hello, how are you?" }],
  temperature: 0.7,
  maxTokens: 1000,
});
```

### 4. 配置系统

#### ConfigStore

类型安全的配置管理。

```typescript
import { ConfigStore } from "@llamacli/core";

const configStore = new ConfigStore();

// 获取配置
const config = configStore.getConfig();

// 添加LLM配置文件
configStore.addProfile({
  id: "local-llama",
  name: "Local Llama",
  type: "ollama",
  model: "llama2",
  baseUrl: "http://localhost:11434",
});

// 设置默认配置文件
configStore.setDefaultProfile("local-llama");

// 保存配置
configStore.save();
```

## 错误处理

所有工具和组件都返回统一的结果格式：

```typescript
interface MCPToolCallResult {
  content: MCPContent[];
  isError: boolean;
}

interface MCPContent {
  type: "text" | "image" | "resource";
  text?: string;
  data?: string;
  mimeType?: string;
}
```

## 安全考虑

LlamaCLI 在设计时充分考虑了安全性：

1. **路径验证**: 所有文件操作都会验证路径安全性
2. **命令过滤**: Shell工具会过滤危险命令
3. **用户确认**: 危险操作需要用户明确确认
4. **资源限制**: 文件大小、执行时间等都有合理限制
5. **沙箱环境**: 工具在受限环境中执行

## 扩展开发

### 创建自定义工具

```typescript
import { BaseTool, ToolParams, ToolContext } from "@llamacli/core";

interface MyToolParams extends ToolParams {
  input: string;
}

class MyCustomTool extends BaseTool {
  readonly name = "my_tool";
  readonly description = "My custom tool";
  readonly schema = {
    type: "object" as const,
    properties: {
      input: { type: "string", description: "Input parameter" },
    },
    required: ["input"],
  };

  getTags(): string[] {
    return ["custom", "example"];
  }

  isAvailable(context?: ToolContext): boolean {
    return true;
  }

  async execute(params: MyToolParams, context?: ToolContext) {
    // 实现工具逻辑
    return this.createSuccessResult([
      {
        type: "text",
        text: `Processed: ${params.input}`,
      },
    ]);
  }
}
```

### 注册自定义工具

```typescript
import { globalToolRegistry } from "@llamacli/core";

const myTool = new MyCustomTool();
globalToolRegistry.register(myTool);
```

## 最佳实践

1. **错误处理**: 始终检查工具执行结果的 `isError` 字段
2. **参数验证**: 使用工具的 `validate()` 方法验证参数
3. **安全意识**: 对用户输入进行适当的验证和清理
4. **资源管理**: 及时释放不需要的资源
5. **日志记录**: 使用适当的日志级别记录操作
