# LlamaCLI

一个现代化的 AI 命令行工具，专为开发者设计。提供专业级的 CLI 体验，包括智能自动补全、语法高亮、主题管理和增强错误处理。

## ✨ 核心特性

### 🎯 AI 能力

- 🔒 **隐私优先**: 支持完全本地运行，数据不离开您的设备
- 🛠️ **智能工具**: 内置文件操作、Shell执行、网络搜索等丰富工具
- 🔧 **多模型支持**: 支持 Ollama、OpenAI、Claude、Gemini 等多种 LLM 后端

### 🖥️ 现代 CLI 体验

- 🎭 **开屏界面**: 精美的ASCII艺术Logo和初始化进度显示
- 🎨 **渐变效果**: 基于Ink框架的专业渐变色彩和动画效果
- 📱 **响应式设计**: 自适应终端尺寸，支持小/中/大屏幕布局
- 🔤 **智能补全**: 命令、选项、文件路径的上下文感知自动补全，支持模糊匹配和历史建议
- 🌈 **主题系统**: 多种内置主题 + 可视化主题选择器（Ctrl+T）
- ⌨️ **统一快捷键**: Ctrl+D双击退出，Ctrl+T主题切换，ESC取消操作
- 📊 **智能状态栏**: 实时显示连接状态、Token使用、操作进度和时间统计
- 📁 **文件引用**: @path/to/file 语法直接引用文件内容，支持智能建议
- 🔧 **斜杠命令**: 元级别的CLI控制（/help, /theme, /config, /status等）
- 🐚 **Shell模式**: 无缝集成shell命令执行和模式切换
- 🚀 **非交互模式**: 完整的管道输入、脚本化和自动化支持
- 🔍 **真实状态检查**: 启动时验证LLM连接、配置有效性和工作环境

### 🛡️ 可靠性与用户体验

- 🚨 **智能错误处理**: 将技术错误转换为用户友好的指导建议
- ⚙️ **个性化配置**: 50+ 可配置选项，支持导入/导出设置
- 🚀 **高性能**: 启动时间 <350ms，内存使用 <30MB
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
# 启动交互式模式（推荐）
llamacli
# 或
llamacli --interactive

# 传统命令模式
llamacli chat "你好"
llamacli get "如何在 JavaScript 中实现深拷贝？"

# 非交互模式（脚本化支持）
echo "分析这段代码" | llamacli
llamacli --prompt "解释这个函数" --format json
llamacli --prompt "分析 @src/main.ts 的代码质量" --output report.md

# 配置管理
llamacli config list              # 查看配置
llamacli config add my-ollama     # 添加新配置
llamacli config use my-ollama     # 使用特定配置

# 个性化设置
llamacli preferences list         # 查看所有偏好设置
llamacli preferences set cli.theme dracula  # 更换主题
llamacli preferences export backup.json     # 导出设置

# 获取帮助
llamacli --help
```

### 🎨 交互式功能

在交互式模式中，您可以享受以下增强功能：

- **Tab 自动补全**: 按 Tab 键获取命令、选项和文件路径建议，支持模糊匹配
- **语法高亮**: 代码自动高亮显示，支持多种编程语言
- **斜杠命令**: 使用 `/help`, `/theme`, `/config`, `/status` 等元级别命令
- **文件引用**: 使用 `@path/to/file` 语法直接引用文件内容
- **Shell模式**: 使用 `!` 命令进入shell模式，执行系统命令
- **状态显示**: 实时查看系统状态、Git信息、内存使用等
- **命令历史**: 使用 ↑/↓ 箭头键浏览历史命令，支持智能建议
- **智能错误**: 错误信息包含具体的解决建议

## 📖 文档

- **[用户指南](docs/USER_GUIDE.md)** - 完整的使用说明和最佳实践
- **[开发者指南](docs/DEVELOPER_GUIDE.md)** - 贡献代码和扩展开发
- **[API 参考](docs/API_REFERENCE.md)** - 详细的 API 文档
- **[项目路线图](docs/ROADMAP.md)** - 功能规划和开发进度

## 🔧 当前状态

### 开发进度：Phase 1.5 完成 ✅

#### LlamaCLI v1.0.0 - CLI界面和用户体验完善阶段已完成

### ✅ 已实现 (Phase 1.5)

**核心 AI 功能**:

- 完整的工具系统（文件操作、Shell执行、网络工具）
- MCP 协议支持和全套 LLM 适配器（Ollama、OpenAI、Claude、Gemini）
- 智能 Agentic 循环系统（任务分解、上下文管理）
- 完整的会话管理系统（持久化、分支、历史管理）

**现代 CLI 体验**:

- 🔤 增强智能补全系统（模糊匹配、历史建议、上下文感知）
- 🎨 多语言语法高亮显示
- 🌈 主题管理系统（5种内置主题）
- ⌨️ 交互式 CLI 界面
- 📚 智能命令历史管理
- 🔧 斜杠命令系统（/help, /theme, /config, /status, /completion等）
- 📁 文件引用语法（@path/to/file 直接引用文件内容）
- 🐚 Shell模式（!命令支持，安全的shell命令执行）
- 📊 状态显示系统（实时系统信息、Git状态、内存使用等）
- 🚀 完整非交互模式（管道输入、脚本化、输出格式控制）

**用户体验优化**:

- ⚙️ 用户偏好设置系统（50+ 配置选项）
- 🚨 增强错误处理（智能错误分类和恢复建议）
- 🚀 高性能优化（启动 <350ms，内存 <30MB）
- 🛡️ 安全确认机制和权限管理

### 🚧 下一阶段 (Phase 2)

- 测试基础设施扩展（90%+ 覆盖率）
- CI/CD 流水线建设
- 性能回归测试系统
- 监控与遥测系统

### 🔮 未来规划 (Phase 3)

- 插件架构系统
- 企业级功能（团队协作、审计合规）
- 云同步和配置共享

## 🤝 贡献

欢迎贡献代码！请查看 [开发者指南](docs/DEVELOPER_GUIDE.md) 了解如何参与项目开发。

## 📄 许可证

本项目采用 ISC 许可证。详见 [LICENSE](LICENSE) 文件。

---

> 本项目受到 [Gemini CLI](https://github.com/google-gemini/gemini-cli) 的启发，致力于为开发者提供更好的 AI 命令行体验。
