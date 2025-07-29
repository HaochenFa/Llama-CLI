# LlamaCLI

一个现代化的 AI 命令行工具，专为开发者设计。

## ✨ 核心特性

- 🔒 **隐私优先**: 支持完全本地运行，数据不离开您的设备
- 🛠️ **智能工具**: 内置文件操作、Shell执行、网络搜索等丰富工具
- 🎯 **开发者友好**: 专为编程工作流优化的交互体验
- 🔧 **高度可配置**: 支持多种 LLM 后端和自定义配置
- 🚀 **现代架构**: 基于 TypeScript 和 React 的模块化设计
- 🛡️ **安全机制**: 完整的工具确认和权限管理系统

## 🚀 快速开始

### 安装

```bash
# 克隆项目
git clone https://github.com/HaochenFa/Llama-CLI.git
cd Llama-CLI

# 安装依赖并构建
npm install
npm run build

# 创建全局链接（可选）
npm link packages/cli
```

### 首次使用

```bash
# 启动聊天界面（会自动引导配置）
llamacli chat

# 或者使用 node 直接运行
node packages/cli/dist/index.js chat
```

首次运行时，系统会自动启动配置向导，帮助您配置 LLM 连接。

### 基本命令

```bash
# 开始聊天会话
llamacli chat

# 查看配置
llamacli config list

# 获取帮助
llamacli --help
```

## 📖 文档

- **[用户指南](docs/USER_GUIDE.md)** - 完整的使用说明和最佳实践
- **[开发者指南](docs/DEVELOPER_GUIDE.md)** - 贡献代码和扩展开发
- **[API 参考](docs/API_REFERENCE.md)** - 详细的 API 文档
- **[项目路线图](docs/ROADMAP.md)** - 功能规划和开发进度

## 🔧 当前状态

**开发进度：约 70% 完成**

### ✅ 已实现

- 完整的工具系统（文件操作、Shell执行）
- 现代化的 CLI 界面和安全确认机制
- MCP 协议支持和 Ollama 适配器
- 类型安全的配置管理系统

### 🚧 开发中

- 网络工具和搜索功能
- 更多 LLM 适配器（OpenAI、Claude）
- 智能任务分解和执行流程
- 测试覆盖和文档完善

## 🤝 贡献

欢迎贡献代码！请查看 [开发者指南](docs/DEVELOPER_GUIDE.md) 了解如何参与项目开发。

## 📄 许可证

本项目采用 ISC 许可证。详见 [LICENSE](LICENSE) 文件。

---

> 本项目受到 [Gemini CLI](https://github.com/google-gemini/gemini-cli) 的启发，致力于为开发者提供更好的 AI 命令行体验。
