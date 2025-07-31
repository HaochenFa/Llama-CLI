# LlamaCLI 快速开始指南

## 🚀 5分钟上手

### 系统要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- 操作系统：Windows、macOS、Linux

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/HaochenFa/Llama-CLI.git
cd Llama-CLI

# 2. 安装依赖
npm install

# 3. 构建项目
npm run build

# 4. 创建全局链接（可选）
npm link packages/cli
```

### 首次配置

```bash
# 启动 LlamaCLI
llamacli

# 首次运行会自动启动配置向导
# 选择您的 LLM 提供商：
# - Ollama (本地)
# - OpenAI (云端)
# - Claude (云端)
# - Gemini (云端)
```

### 基本使用

```bash
# 交互式模式（推荐）
llamacli

# 快速问答
llamacli get "如何在 JavaScript 中实现深拷贝？"

# 开始对话
llamacli chat "你好，请帮我分析这个代码"

# 查看配置
llamacli config list

# 更换主题
llamacli preferences set cli.theme dracula
```

### 常用功能

#### 1. 智能补全

- 按 `Tab` 键获取命令建议
- 支持文件路径自动补全
- 上下文感知的选项补全

#### 2. 语法高亮

- 自动识别代码语言
- 支持 JavaScript、Python、JSON、Shell 等
- 可自定义高亮主题

#### 3. 主题切换

```bash
# 可用主题：default, light, dracula, github, monokai
llamacli preferences set cli.theme <主题名>
```

#### 4. 会话管理

```bash
llamacli session list          # 查看所有会话
llamacli session save my-work  # 保存当前会话
llamacli session load my-work  # 加载会话
```

### 故障排除

#### 命令未找到

```bash
# 确保项目已构建
npm run build

# 检查全局链接
npm link packages/cli

# 或直接运行
node packages/cli/dist/index.js
```

#### API 连接错误

```bash
# 检查配置
llamacli config list

# 重新配置
llamacli config add my-config
```

#### 性能问题

```bash
# 检查系统资源
llamacli preferences get performance

# 启用调试模式
LLAMACLI_DEBUG=1 llamacli
```

### 下一步

- 阅读 [用户指南](docs/USER_GUIDE.md) 了解高级功能
- 查看 [API 参考](docs/API_REFERENCE.md) 了解技术细节
- 参与 [开发贡献](docs/DEVELOPER_GUIDE.md)

---

## 🌟 常见使用场景

### 开发助手

```bash
llamacli chat "帮我审查这段代码的安全性"
llamacli chat "解释这个错误信息并提供解决方案"
```

### 学习新技术

```bash
llamacli get "React Hooks 最佳实践"
llamacli chat "教我如何使用 TypeScript 泛型"
```

### 项目管理

```bash
llamacli chat "分析项目结构并建议改进"
llamacli chat "生成这个功能的测试用例"
```

需要帮助？运行 `llamacli --help` 或查看完整文档。
