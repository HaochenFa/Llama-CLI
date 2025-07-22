# LlamaCLI 专业完整开发方案

## 项目概述

基于对 Gemini CLI 的深入分析和我们的设计文档，LlamaCLI 将采用现代化的架构设计，实现一个数据安全、高度可扩展的 AI 命令行开发伙伴。

## 核心架构设计

### 1. 项目结构

```
llamacli/
├── packages/
│   ├── core/                    # 核心逻辑包
│   │   ├── src/
│   │   │   ├── adapters/         # LLM 后端适配器
│   │   │   │   ├── base.ts       # 基础适配器接口
│   │   │   │   ├── ollama.ts     # Ollama 适配器
│   │   │   │   ├── vllm.ts       # vLLM 适配器
│   │   │   │   └── openai.ts     # OpenAI 适配器
│   │   │   ├── config/           # 配置管理
│   │   │   │   ├── config.ts     # 主配置类
│   │   │   │   └── models.ts     # 模型定义
│   │   │   ├── core/             # 核心逻辑
│   │   │   │   ├── context-compiler.ts  # 上下文编译器
│   │   │   │   ├── agentic-loop.ts      # Agentic 循环
│   │   │   │   └── tool-scheduler.ts    # 工具调度器
│   │   │   ├── mcp/              # MCP 协议实现
│   │   │   │   ├── client.ts     # MCP 客户端
│   │   │   │   ├── server.ts     # 内置 MCP 服务器
│   │   │   │   └── types.ts      # MCP 类型定义
│   │   │   ├── tools/            # 工具系统
│   │   │   │   ├── base.ts       # 基础工具类
│   │   │   │   ├── registry.ts   # 工具注册表
│   │   │   │   ├── filesystem/   # 文件系统工具
│   │   │   │   ├── web/          # 网络工具
│   │   │   │   └── builtin/      # 内置工具
│   │   │   ├── types/            # 类型定义
│   │   │   │   ├── context.ts    # 上下文类型
│   │   │   │   ├── tools.ts      # 工具类型
│   │   │   │   └── adapters.ts   # 适配器类型
│   │   │   ├── utils/            # 工具函数
│   │   │   └── index.ts          # 导出入口
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── cli/                      # CLI 界面包
│       ├── src/
│       │   ├── commands/         # CLI 命令
│       │   │   ├── chat.ts       # 聊天命令
│       │   │   ├── config.ts     # 配置命令
│       │   │   └── get.ts        # 快速查询命令
│       │   ├── ui/               # 用户界面
│       │   │   ├── components/   # UI 组件
│       │   │   ├── hooks/        # React Hooks
│       │   │   └── themes/       # 主题系统
│       │   ├── utils/            # CLI 工具函数
│       │   └── index.ts          # CLI 入口
│       ├── package.json
│       └── tsconfig.json
├── scripts/                      # 构建脚本
├── tests/                        # 测试文件
├── docs/                         # 文档
├── esbuild.config.js            # 构建配置
├── package.json                 # 根包配置
└── tsconfig.json               # TypeScript 配置
```

### 2. 核心技术栈

- **构建工具**: esbuild (极速编译)
- **包管理**: npm workspaces (monorepo)
- **UI 框架**: React + Ink (终端 UI)
- **类型系统**: TypeScript
- **测试框架**: Vitest
- **代码规范**: ESLint + Prettier

## 详细实现计划

### 阶段一：核心架构搭建 (Week 1-2)

#### 1.1 项目初始化

- [ ] 创建 monorepo 结构
- [ ] 配置 esbuild 构建系统
- [ ] 设置 TypeScript 配置
- [ ] 配置 ESLint 和 Prettier
- [ ] 设置测试环境

#### 1.2 核心类型定义

```typescript
// packages/core/src/types/context.ts
interface ToolDefinition {
  type: "native" | "mcp";
  name: string;
  description: string;
  schema: any;
  endpoint?: string;
}

interface FileContext {
  path: string;
  content: string;
  lastModified?: number;
}

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  timestamp?: number;
}

interface InternalContext {
  long_term_memory: string[];
  available_tools: ToolDefinition[];
  file_context: FileContext[];
  chat_history: ChatMessage[];
  session_metadata: {
    session_id: string;
    created_at: number;
    last_activity: number;
  };
}
```

#### 1.3 配置系统实现

```typescript
// packages/core/src/config/config.ts
export class ConfigStore {
  private configPath: string;
  private config: ConfigData;

  constructor() {
    this.configPath = path.join(os.homedir(), ".llama-cli", "config.json");
    this.ensureConfigDir();
    this.loadConfig();
  }

  // 配置管理方法
  addProfile(profile: LLMProfile): void;
  removeProfile(name: string): void;
  setActiveProfile(name: string): void;
  getActiveProfile(): LLMProfile | null;
}
```

### 阶段二：LLM 适配器系统 (Week 3-4)

#### 2.1 基础适配器接口

```typescript
// packages/core/src/adapters/base.ts
export interface LLMAdapter {
  name: string;
  chatStream(messages: ChatMessage[]): AsyncIterable<string>;
  validateConfig(config: any): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export abstract class BaseLLMAdapter implements LLMAdapter {
  abstract name: string;
  abstract chatStream(messages: ChatMessage[]): AsyncIterable<string>;
  abstract validateConfig(config: any): boolean;

  async connect(): Promise<void> {
    // 默认实现
  }

  async disconnect(): Promise<void> {
    // 默认实现
  }
}
```

#### 2.2 具体适配器实现

- **Ollama 适配器**: 支持本地 Ollama 服务
- **vLLM 适配器**: 支持 vLLM 服务器
- **OpenAI 适配器**: 支持 OpenAI API
- **Claude 适配器**: 支持 Anthropic Claude API

### 阶段三：统一 MCP 架构 (Week 5-6)

#### 3.1 MCP 协议实现

```typescript
// packages/core/src/mcp/types.ts
export interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: MCPError;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}
```

#### 3.2 内置 MCP 服务器

```typescript
// packages/core/src/mcp/server.ts
export class BuiltinMCPServer {
  private tools: Map<string, ToolHandler> = new Map();

  registerTool(name: string, handler: ToolHandler): void {
    this.tools.set(name, handler);
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    // 处理 MCP 请求
  }
}
```

#### 3.3 工具调度器简化

```typescript
// packages/core/src/core/tool-scheduler.ts
export class ToolScheduler {
  private mcpClient: MCPClient;
  private builtinServer: BuiltinMCPServer;

  async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    // 统一通过 MCP 协议调用工具
    const request: MCPRequest = {
      jsonrpc: "2.0",
      id: toolCall.id,
      method: "tools/call",
      params: {
        name: toolCall.name,
        arguments: toolCall.arguments,
      },
    };

    return await this.mcpClient.sendRequest(request);
  }
}
```

### 阶段四：核心工具系统 (Week 7-8)

#### 4.1 基础工具接口

```typescript
// packages/core/src/tools/base.ts
export interface ToolHandler {
  name: string;
  description: string;
  schema: any;
  execute(params: any, signal: AbortSignal): Promise<ToolResult>;
  shouldConfirm?(params: any): Promise<boolean>;
}

export abstract class BaseTool implements ToolHandler {
  abstract name: string;
  abstract description: string;
  abstract schema: any;
  abstract execute(params: any, signal: AbortSignal): Promise<ToolResult>;

  async shouldConfirm(params: any): Promise<boolean> {
    return false; // 默认不需要确认
  }
}
```

#### 4.2 内置工具实现

- **文件系统工具**: `readFile`, `writeFile`, `searchFiles`, `deleteFile`
- **网络工具**: `webSearch`, `httpRequest`
- **系统工具**: `shellCommand`, `processInfo`

### 阶段五：Agentic 循环实现 (Week 9-10)

#### 5.1 上下文编译器

```typescript
// packages/core/src/core/context-compiler.ts
export class ContextCompiler {
  compile(context: InternalContext, adapter: LLMAdapter): string {
    const sections = [];

    // 系统提示
    sections.push(this.buildSystemPrompt());

    // 工具定义
    if (context.available_tools.length > 0) {
      sections.push(this.buildToolsSection(context.available_tools));
    }

    // 文件上下文
    if (context.file_context.length > 0) {
      sections.push(this.buildFileContextSection(context.file_context));
    }

    // 长期记忆
    if (context.long_term_memory.length > 0) {
      sections.push(this.buildMemorySection(context.long_term_memory));
    }

    return sections.join("\n\n");
  }
}
```

#### 5.2 Agentic 循环

```typescript
// packages/core/src/core/agentic-loop.ts
export class AgenticLoop {
  private contextCompiler: ContextCompiler;
  private toolScheduler: ToolScheduler;
  private adapter: LLMAdapter;

  async processUserInput(input: string, context: InternalContext): Promise<string> {
    // 1. 更新上下文
    this.updateContextFromInput(input, context);

    // 2. 编译系统提示
    const systemPrompt = this.contextCompiler.compile(context, this.adapter);

    // 3. 调用 LLM
    const response = await this.callLLM(systemPrompt, context.chat_history);

    // 4. 处理响应
    return await this.processLLMResponse(response, context);
  }

  private async processLLMResponse(response: string, context: InternalContext): Promise<string> {
    // 检查是否包含工具调用
    const toolCalls = this.extractToolCalls(response);

    if (toolCalls.length > 0) {
      // 执行工具调用
      const results = await this.toolScheduler.executeTools(toolCalls);

      // 将结果添加到历史
      this.addToolResultsToHistory(results, context);

      // 递归调用以获取最终响应
      return await this.processUserInput("", context);
    }

    return response;
  }
}
```

### 阶段六：CLI 界面实现 (Week 11-12)

#### 6.1 命令行界面

```typescript
// packages/cli/src/commands/chat.ts
export class ChatCommand {
  private agenticLoop: AgenticLoop;
  private context: InternalContext;

  async run(): Promise<void> {
    console.log("🦙 LlamaCLI - Your AI Development Partner");

    while (true) {
      const input = await this.promptUser();

      if (input.startsWith("/")) {
        await this.handleSlashCommand(input);
        continue;
      }

      if (input.startsWith("@")) {
        await this.handleFileContext(input);
        continue;
      }

      const response = await this.agenticLoop.processUserInput(input, this.context);
      this.displayResponse(response);
    }
  }
}
```

#### 6.2 React UI 组件

```typescript
// packages/cli/src/ui/components/ChatInterface.tsx
export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Box flexDirection="column">
      <ChatHistory messages={messages} />
      <ChatInput value={input} onChange={setInput} onSubmit={handleSubmit} isLoading={isLoading} />
    </Box>
  );
};
```

### 阶段七：测试与优化 (Week 13-14)

#### 7.1 单元测试

- 核心逻辑测试
- 适配器测试
- 工具系统测试
- MCP 协议测试

#### 7.2 集成测试

- 端到端工作流测试
- 多后端兼容性测试
- 性能测试

#### 7.3 用户体验优化

- 错误处理改进
- 性能优化
- 文档完善

## 关键技术决策

### 1. 统一 MCP 架构的优势

- **简化架构**: 所有工具通过统一协议处理
- **易于扩展**: 新工具只需实现 MCP 接口
- **标准化**: 遵循行业标准协议
- **互操作性**: 可与其他 MCP 兼容工具集成

### 2. esbuild 构建系统

- **极速编译**: 毫秒级增量编译
- **开发效率**: 实时反馈
- **生产优化**: 高效打包

### 3. Monorepo 架构

- **代码复用**: 核心逻辑与 UI 分离
- **独立发布**: 包可独立版本管理
- **开发效率**: 统一工具链

## 安全与隐私

### 1. 数据安全

- 默认本地执行
- 破坏性操作需用户确认
- 敏感数据不记录日志

### 2. 权限控制

- 工具执行权限管理
- 文件访问权限控制
- 网络请求权限管理

## 性能优化

### 1. 内存管理

- 上下文大小限制
- 历史记录清理
- 流式处理

### 2. 响应速度

- 异步处理
- 缓存机制
- 预加载优化

## 扩展性设计

### 1. 插件系统

- 工具插件接口
- 适配器插件接口
- 主题插件系统

### 2. 配置系统

- 分层配置
- 环境变量支持
- 动态配置更新

## 部署与发布

### 1. 包发布

- npm 包发布
- GitHub Releases
- 自动化 CI/CD

### 2. 文档

- API 文档
- 用户手册
- 开发指南

## 里程碑时间表

| 阶段   | 时间       | 主要交付物         |
| ------ | ---------- | ------------------ |
| 阶段一 | Week 1-2   | 项目架构搭建完成   |
| 阶段二 | Week 3-4   | LLM 适配器系统完成 |
| 阶段三 | Week 5-6   | 统一 MCP 架构完成  |
| 阶段四 | Week 7-8   | 核心工具系统完成   |
| 阶段五 | Week 9-10  | Agentic 循环完成   |
| 阶段六 | Week 11-12 | CLI 界面完成       |
| 阶段七 | Week 13-14 | 测试与优化完成     |

## 风险评估与应对

### 1. 技术风险

- **MCP 协议复杂性**: 分阶段实现，先支持基础功能
- **性能问题**: 早期性能测试，及时优化
- **兼容性问题**: 多环境测试

### 2. 时间风险

- **功能范围控制**: 优先实现核心功能
- **并行开发**: 模块化设计支持并行开发
- **迭代发布**: 分版本发布，逐步完善

## 总结

这个开发方案基于对 Gemini CLI 的深入分析，结合我们的设计理念，提供了一个完整、可执行的实施路径。通过统一的 MCP 架构、现代化的技术栈和模块化的设计，LlamaCLI 将成为一个强大、灵活、易扩展的 AI 开发工具。

关键成功因素：

1. **架构先行**: 良好的架构设计是项目成功的基础
2. **渐进实施**: 分阶段实施，降低风险
3. **质量保证**: 完善的测试体系
4. **用户体验**: 始终以用户体验为中心
5. **社区建设**: 开放的生态系统设计
