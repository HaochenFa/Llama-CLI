# LlamaCLI 功能与用户工作流规约

版本: 1.0

文档目的: 本文档从最终用户的角度，详细定义LlamaCLI的界面、功能、交互工作流和用户体验。它以业界顶尖工具 (Gemini CLI, kubectl,
Git) 为设计标杆，是产品开发、功能验收和用户手册撰写的核心依据。

## 设计哲学与指导原则: LlamaCLI不仅是一个工具，更是一位嵌入在终端里的AI开发伙伴。

1. 效率优先 (Efficiency-First): 每一个交互都应以最少的按键和最低的心智负担完成最常见的任务。
2. 流程透明 (Transparent Workflow): 用户应始终清楚地知道CLI正在做什么——是在思考、调用工具，还是在综合答案。绝不让用户面对一个无响应的黑盒子。
3. 渐进式引导 (Progressive Guidance): 工具应对新手友好，通过清晰的指引和友好的错误提示帮助用户上手；同时为专家提供强大、可定制的高级功能。
4. 环境感知 (Context-Aware Environment): CLI应像一个优秀的IDE，能敏锐地感知当前的工作环境（加载的文件、激活的配置），并通过UI变化直观地反馈给用户。

## 核心用户旅程 (User Journeys): 我们通过几个核心的用户旅程来定义LlamaCLI的功能。

### 首次运行与引导 (First-Run & Onboarding)

- 初次运行: 用户首次运行`llama-cli`时，系统会检测到`config.json`不存在。
- 欢迎与引导: CLI不会报错退出，而是会显示欢迎信息，并启动一个交互式的配置向导：`
  欢迎使用LlamaCLI！看起来您是第一次使用。让我们来设置您的第一个LLM连接吧。`
- 交互式配置: 使用inquirer引导用户创建第一个后端配置（profile），询问类型（Ollama/vLLM）、Endpoint地址等。
- 成功反馈: 配置成功后，CLI会尝试连接后端并拉取模型列表，以验证配置的有效性，并给出成功提示，随后自动进入聊天会话模式。

### 日常编码与重构 (Daily Coding & Refactoring)

- 启动会话: 用户在项目根目录下运行 `llama-cli`。
- 注入上下文: 用户输入：`❯ 帮我重构 @src/main.ts，我想让其中的 \processData (函数支持批量处理。同时参考一下 @docs/api-spec.md 中定义的v2数据结构。)`
- UI反馈: 用户输入`@`时，文件自动补全启动。当文件被选中后，提示符会发生变化，以直观地反映上下文状态，例如：`❯ [@+2]`
  。这明确地告诉用户，已有两个文件被加载到了上下文中。
- Agentic工作流: CLI开始工作，并向用户直播其思考过程：

```plaintext
❯ [@+2] 请帮我重构...
[加载指示器] LlamaCLI 正在思考...
[工具图标] LlamaCLI 已阅读文件: src/main.ts, docs/api-spec.md
[加载指示器] LlamaCLI 正在根据文件内容生成重构方案...
```

- 最终输出: CLI以格式化的Markdown和语法高亮的代码块给出最终的重构建议。

### 调试与问题诊断 (Debugging & Problem-Solving)

- 启动会话: `llama-cli chat`
- 描述问题: `❯ 我的npm run build失败了，错误日志在 build-error.log 里。`
- Agentic工作流:

```plaintext
❯ 我的npm run build失败了...
[一个加载指示器] LlamaCLI 正在思考...
[一个工具图标] LlamaCLI 正在使用工具 [readFile] 分析: build-error.log
[一个加载指示器] LlamaCLI 正在分析日志...
[一个工具图标] LlamaCLI 正在使用工具 [readFile] 分析: package.json
[一个加载指示器] LlamaCLI 正在交叉引用依赖...
[一个工具图标] LlamaCLI 正在使用工具 [webSearch] 搜索: "error TS2345 in library 'some-lib'"
[一个加载指示器] LlamaCLI 正在综合所有信息...
```

- 给出解决方案: "分析了您的错误日志、package.json和网络上的信息后，问题很可能出在some-lib的版本兼容性上。建议您尝试..."

## UI与交互模型详细规约

### 命令行模式 (Command-Line Mode)

- 技术栈: commander
- 主要命令:

1. `llama-cli get "<prompt>"`: 快速获取一次性回答。
2. `llama-cli config <list|add|use|remove>`: 管理后端连接配置。
3. `llama-cli history <list|view|clear>`: 管理历史记录。
4. `llama-cli`: 启动并进入聊天会话模式。

### 聊天会话模式 (Chat Session Mode)

- 多行输入: 支持通过`Shift+Enter`或`Alt+Enter`进行换行输入。
- **流式响应 (Streaming Response):** 为最大程度降低用户等待的焦虑感，并符合“流程透明”的设计哲学，LLM的任何文本回答都**必须**以流式（token-by-token）的方式逐字打印到终端。用户应能实时看到文字生成的过程，而不是等待数十秒后看到完整的一大段回答。
- 动态提示符: 提示符❯ 会根据会话状态附加指示器：
    - `❯ [@+N]`: 表示有N个文件已加载到上下文中。
    - `❯ [mem]`: 表示长期记忆正在影响当前会话。
    - `❯ [pure]`: 表示处于纯聊天模式。
- 命令历史: 支持使用上下箭头浏览本次会话中已发送的命令历史。
- 自动补全: 除了`@`文件补全，所有斜杠命令（`/`）及其子命令也应支持Tab自动补全。

### 斜杠命令 (/)

- 斜杠命令是高级用户管理会话的窗口。
- 命令 & 用法
    - `/context view [files|history|memory|tools]`: 核心调试工具。查看当前会话的完整上下文状态，或只查看特定部分。
    - `/context clear <files|history|memory>`: 清空指定的上下文部分。
    - `/tool <list|add|remove>`: 管理标准工具（内置、OpenAPI）。
    - `/mcp <list|add|remove>`: 管理兼容MCP的高级工具。
    - `/memory <add|list|clear>`: 管理长期记忆。`/memory add`会进入一个安全的多行输入模式以方便添加长文本。
    - `/mode <agent|pure>`: 切换工作模式。`agent`是默认模式，`pure`模式下LLM不会调用任何工具。
    - `/compress`: 指示LLM总结压缩当前的对话历史。
    - `/help`: 显示所有可用的斜杠命令及其用法。
    - `/exit`: 退出当前的聊天会话。

### 视觉风格与错误处理

- 加载指示器: 使用 ora 库，在等待时显示优雅的文本微调器。
- 颜色: 使用 chalk 库对不同类型的信息进行着色。
- Markdown渲染: 使用 marked 和 marked-terminal 渲染结构清晰的终端输出。
- 代码语法高亮: 所有代码块都必须进行对应语言的语法高亮。
- **错误处理原则:** CLI绝不能在出错时崩溃。错误信息必须清晰、友好，**并总是提供可行的下一步建议**。避免直接暴露原始的堆栈跟踪信息给最终用户。

  - **优化后示例:**
    ```
    ❌ Error: Connection to 'ollama' profile (http://localhost:8000) failed.
    💡 Tip: Please ensure the Ollama service is running and the endpoint in your config is correct. You can check your configuration with 'llama-cli config list'.
    ```