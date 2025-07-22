# LlamaCLI

**一个为开发者打造的、数据安全且高度可扩展的 AI 命令行开发伙伴。**

[![NPM 版本](https://img.shields.io/npm/v/llamacli.svg)](https://www.npmjs.com/package/llamacli)
[![构建状态](https://img.shields.io/github/actions/workflow/status/HaochenFa/Llama-CLI/ci.yml?branch=main)](https://github.com/HaochenFa/Llama-CLI/actions)
[![许可证](https://img.shields.io/github/license/HaochenFa/Llama-CLI.svg)](https://github.com/HaochenFa/Llama-CLI/blob/main/LICENSE)

## 项目简介

LlamaCLI 是一款旨在将现代 AI 能力深度集成到开发工作流中的命令行工具。

本项目受到了业界顶尖工具，特别是 Google [Gemini CLI](https://github.com/google-gemini/gemini-cli) 的深刻启发，并将其作为学习和实践的标杆。我们并非简单复刻，而是在借鉴其优秀设计思想的基础上，探索构建一个拥有清晰架构、专注开发者体验（DX）、并具备高度可扩展性的 AI 助手。

## 设计亮点与核心功能

我们相信，一个优秀的 AI 工具应该像一位有能力的伙伴。LlamaCLI 的设计围绕以下核心亮点展开：

### 1. 数据安全优先，默认本地执行

这是 LlamaCLI 的核心承诺。通过连接多种 LLM 后端（本地的 Ollama、vLLM，或云端的 OpenAI、Claude 等），您可以根据需求选择最适合的模型。对于隐私敏感的场景，我们支持完全本地运行，**确保您的代码、提示和业务数据永远不会离开您的个人电脑**。对于任何可能修改文件的破坏性操作，我们都会请求您的明确授权，给予您完全的控制权和安全感。

### 2. 智能的 Agentic 内核

LlamaCLI 的核心不仅仅是传递提示，它能够理解复杂任务、拆解目标，并自主调用一系列工具（文件读写、网络搜索等）来协同完成工作流。它通过一个内部的“上下文编译器”，智能地将您的文件、历史对话和工具状态整合成对 LLM 最优的提示。

### 3. 专注开发者体验 (DX)

我们为开发者的日常工作流优化了每一个交互细节。

- **无缝文件上下文:** 通过直观的 `@` 语法，可以轻松地将多个文件的内容作为对话背景，让 AI 精准理解您的代码。
- **即时流式响应:** 告别漫长等待，模型的回答会以 token-by-token 的方式实时呈现在您眼前。
- **智能思维处理:** 自动识别和优化显示模型的思考过程，支持折叠/展开，让您深入了解 AI 的推理逻辑。
- **动态环境感知:** 提示符会动态变化 (`❯ [@+2]`)，实时反馈当前会话加载的上下文数量，让您对 AI 的“所知”一目了然。
- **优化的终端输出:** 所有输出都经过精心格式化，使用 Markdown 和语法高亮，提供清晰、美观的阅读体验。

### 4. 强大的会话管理与内省

通过简单的斜杠命令 (`/`)，您可以完全掌控会话。

- `/context view`: 查看 AI 当前掌握的所有上下文信息，核心的调试工具。
- `/mode <agent|pure>`: 在可以调用工具的“代理模式”和纯聊天之间一键切换。
- `/memory`: 管理工具的长期记忆，让它记住您的偏好和项目规范。
- `/think`: 查看和管理 AI 的思考过程，支持历史回顾和显示控制。
- `/help`: 查看所有可用的高级命令。

### 5. 统一的 MCP 架构

LlamaCLI 采用了**统一的 MCP (Model Context Protocol) 架构**，这是一个重大的架构创新：

- **消除工具类型区分:** 所有工具（内置、外部、API）都通过相同的 MCP 协议处理，架构更加简洁统一。
- **内置 MCP 服务器:** 将传统的"原生工具"重构为内置 MCP 服务器，提供一致的工具调用体验。
- **极简的工具调度器:** 核心调度逻辑从 185 行简化到 50 行，大幅降低复杂性。
- **完美的扩展性:** 添加新工具只需实现标准的 `ToolHandler` 接口，无需修改核心代码。

### 6. 灵活、可扩展的架构

良好的架构是项目生命力的保证。

- **多后端适配器:** 通过解耦的适配器模式，LlamaCLI 可以轻松支持不同的 LLM 后端，您可以自由选择或切换。
- **模块化工具系统:** 基于 MCP 协议的工具系统，清晰、易于扩展，支持热插拔和动态加载。

## 安装与使用

本项目尚在早期开发阶段，推荐通过克隆仓库的方式进行本地体验。

```bash
# 1. 克隆仓库
git clone https://github.com/HaochenFa/Llama-CLI.git
cd llamacli

# 2. 安装依赖
npm install

# 3. 启动开发模式 (esbuild 会监视文件变更并即时编译)
npm run build:watch

# 4. (在另一个终端) 创建全局软链接
npm link
```

现在，您可以在任何路径下通过 `llama-cli` 命令来使用它了。

## 架构文档

想了解 LlamaCLI 的技术细节？查看我们的详细架构文档：

- **[LLM 适配器支持](docs/LLM_ADAPTERS.md)** - 支持的 LLM 类型和配置指南
- **[统一 MCP 架构](docs/UNIFIED_MCP_ARCHITECTURE.md)** - 深入了解我们的创新架构设计
- **工具开发指南** - 如何为 LlamaCLI 开发新工具（即将推出）
- **MCP 集成指南** - 如何集成外部 MCP 服务器（即将推出）

## 贡献与交流

本项目目前主要由我个人进行开发和维护。如果您对这个项目感兴趣，或有任何想法和建议，非常欢迎通过 [Issues](https://github.com/HaochenFa/Llama-CLI/issues) 与我交流。

## 许可证

本项目采用 ISC 许可证。
