# LlamaCLI 技术设计与实现规约

版本: 1.0

文档目的: 本文档为LlamaCLI项目的开发、测试、维护和未来扩展提供一份统一、明确和详尽的技术指导。它是所有开发工作的权威参考。

## 核心架构

LlamaCLI采用一种结合了Agentic Loop、结构化内部上下文、上下文编译器和多后端适配器的混合架构。

## 构建与打包 (Build & Packaging)

为获得极致的开发效率，本项目采用 **esbuild** 作为核心的 TypeScript 编译器和打包工具，而非传统的 `tsc`。`esbuild` 提供了近乎瞬时的重新构建能力。

- **开发模式:** `npm run build:watch` 命令将启动 `esbuild` 的监视模式，任何 `src/` 目录下的文件变更都会在毫秒级内完成增量编译。
- **生产构建:** `npm run build` 将生成用于发布的、经过优化的单一可执行文件。

### 结构化内部上下文 (The Structured Internal Context)

- CLI在会话中维护一个核心的InternalContext对象，用于清晰地组织所有信息。

```plaintext
// src/types/context.ts
interface ToolDefinition {
type: 'native' | 'openapi' | 'mcp';
name: string;
description: string; // 工具的描述
schema: any; // 工具的参数定义，对于 'openapi' 类型，这里是 OpenAPI Schema
endpoint?: string; // for openapi & mcp tools
}

interface FileContext {
path: string;
content: string;
}

interface ChatMessage {
role: 'system' | 'user' | 'assistant' | 'tool';
content: string;
tool_call_id?: string; // for linking tool results
}

interface InternalContext {
long_term_memory: string[];
available_tools: ToolDefinition[];
file_context: FileContext[];
chat_history: ChatMessage[];
}
```

### 上下文编译器 (The Context Compiler)

- 位置: `src/lib/context-compiler.ts`
- 职责: 在每次调用LLM前，读取`InternalContext`对象，并将其**压平 (Flatten)** 成一个为当前LLM优化过的、单一的字符串系统提示。这是连接结构化内部状态与无状态LLM
  API的桥梁。

### Agentic循环 (The Agentic Loop)

这是我们实现智能交互的核心循环，流程如下：

- 用户输入: CLI接收用户输入，并根据`@`语法更新`InternalContext`。
- 上下文编译: `Context Compiler`生成系统提示。
- LLM决策: 将系统提示和对话历史发送给LLM。LLM返回普通文本或一个请求调用工具的JSON指令。
- 工具调度: 如果是工具调用请求，工具调度器 (Tool Dispatcher) 会解析JSON，并执行相应的工具。
- 结果反馈: 工具的执行结果被封装成`role: 'tool'`消息，追加到历史中，返回步骤3，进行再次推理。
- 最终答案: 如果LLM返回普通文本，则将其渲染给用户，循环结束，等待下一次输入。

### 多后端适配器 (Multi-Backend Adapter Pattern)

- 位置: src/lib/adapters/
- 目的: 解耦核心逻辑与具体的LLM后端API。
- 实现:
- 定义一个LLMAdapter接口 (`base.adapter.ts`)，包含 `chatStream(messages: ChatMessage[]): AsyncIterable<string>` 方法。该方法必须返回一个异步可迭代对象，允许上层调用者以流式方式消费LLM生成的文本片段。
- 为每个后端（Ollama, vLLM）创建具体的实现类，处理其独特的**流式API协议（如 NDJSON 或 SSE）**、数据结构和认证方式。
- 一个工厂函数根据用户激活的配置文件，动态实例化并提供正确的适配器。

## 模块实现规约

### 项目结构

```plaintext
   llamacli/
   ├── dist/ # 编译后的 JavaScript
   ├── src/
   │ ├── commands/ # CLI 命令实现 (get, chat, config)
   │ ├── lib/
   │ │ ├── adapters/ # Ollama, vLLM 等后端适配器
   │ │ ├── tools/ # 内置工具 (filesystem, web_search)
   │ │ ├── api-client.ts
   │ │ ├── config-store.ts
   │ │ ├── context-compiler.ts
   │ │ └── tool-dispatcher.ts
   │ ├── types/ # 全局类型定义 (context.ts)
   │ └── index.ts # 程序入口
   ├── test/ # 测试目录
   └── package.json
```

### 配置存储 (`config-store.ts`)

- **位置:** 所有用户级别的配置（如后端profiles）都应由 `ConfigStore` 模块统一管理，并存储在用户主目录下的特定文件夹中，即 `~/.llama-cli/config.json`。
- **职责:** `ConfigStore` 负责配置文件的读取、写入、验证和迁移。程序启动时应能自动创建该目录和文件。

### 工具箱与工具协议 (Toolbox & Tooling Protocols)

- 工具调度器 (`tool-dispatcher.ts`): 当LLM请求调用工具时，调度器根据`InternalContext.available_tools`中定义的工具type来执行：
    - `native`: 调用本地TypeScript函数（例如文件操作）。
- `mcp`: 构造并发送MCP协议的JSON对象。
- `openapi`: 调用符合 OpenAPI 规范的外部 RESTful API。调度器会根据 `ToolDefinition.schema` 中定义的 OpenAPI 规范，构造并发送 HTTP 请求到 `ToolDefinition.endpoint`。这使得 LlamaCLI 能够与广泛的现有 Web 服务生态系统集成。
- 内置工具 (`tools/`):
    - 文件系统: `searchFiles`, `readFile`, `writeFile`, `deleteFile`。
    - 互联网搜索: `webSearch`。

### 安全规约

- 任何破坏性操作（`writeFile`, `deleteFile`）或调用新的外部工具时，必须使用`inquirer`的`confirm`
  提示，获得用户明确的“是/否”授权后方可执行。此为最高安全优先级。

## 开发与贡献

### 环境设置

- 依赖: Node.js v18+, npm/yarn, Git, Ollama/vLLM。
- 步骤: git clone -> npm install -> npm run build (启动TS监视编译) -> npm link (创建全局命令)。

### 贡献指南

- 遵循Conventional Commits规范。
- 代码风格由ESLint和Prettier强制统一。
- 所有新功能需附带单元测试。
- PR提交至develop分支。

### 测试策略 (Testing Strategy)

- **单元测试:** 所有核心业务逻辑（如 `ContextCompiler`, `ToolDispatcher`）和工具函数都必须有单元测试覆盖。
- **集成测试:** 对核心的 Agentic Loop 和命令进行集成测试。
- **模拟LLM服务 (Mocking):** 在测试中，**严禁**对真实的LLM API进行网络调用。必须使用测试框架（如 `vitest`, `jest`）的模拟功能，伪造 `LLMAdapter` 的 `chatStream` 方法的返回值。这能确保测试的快速、稳定和低成本，并允许我们精确地测试CLI如何响应各种预设的LLM输出（例如，纯文本、工具调用指令、错误等）。

## 参考项目：

- [Gemini CLI](https://github.com/google-gemini/gemini-cli)
- [MCP Protocol](https://modelcontextprotocol.io/introduction)