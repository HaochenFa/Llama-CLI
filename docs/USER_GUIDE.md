# LlamaCLI 用户使用指南

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
# 启动聊天界面
llamacli chat
```

首次运行时会自动启动配置向导，帮助您：

1. 选择 LLM 提供商（目前支持 Ollama）
2. 配置模型和连接参数
3. 测试连接是否正常

### 基本命令

```bash
# 开始聊天会话
llamacli chat

# 使用特定配置文件
llamacli chat --profile my-profile

# 包含文件上下文
llamacli chat --file README.md

# 查看配置
llamacli config list

# 获取帮助
llamacli --help
```

## ⚙️ 配置管理

```bash
# 查看所有配置
llamacli config list

# 添加新配置
llamacli config add

# 编辑配置
llamacli config edit my-profile

# 设置默认配置
llamacli config set-default my-profile
```

## 💬 聊天界面

### 基本操作

- **发送消息**: 输入文本并按回车
- **退出**: 按 `Ctrl+C`
- **清屏**: 按 `Ctrl+L`

### 🛡️ 工具确认

当 AI 需要使用工具时，会显示确认对话框：

- **Yes, allow once**: 仅允许这一次执行
- **Yes, allow always for this session**: 会话内总是允许
- **No (esc)**: 拒绝执行

使用 ↑/↓ 导航，Enter 选择，Esc 取消。

## 🔧 可用工具

### 文件系统工具

- **读取文件**: AI 可以读取项目中的文件来理解代码结构
- **写入文件**: AI 可以创建新文件或修改现有文件
- **目录列表**: AI 可以查看目录结构了解项目组织
- **文件搜索**: AI 可以在项目中搜索特定的代码模式

### Shell 工具

- **命令执行**: AI 可以执行 Shell 命令完成各种任务
- **安全限制**: 自动阻止危险命令，限制工作目录访问

## 💡 使用技巧

### 安全使用

1. **仔细审查工具调用**: 始终检查 AI 要执行的操作
2. **谨慎使用自动批准**: `--yolo` 模式会跳过所有确认
3. **定期备份**: 在进行大量文件修改前备份项目

### 提高效率

1. **使用会话级授权**: 对重复操作选择"总是允许"
2. **提供清晰的上下文**: 明确说明您的需求和约束
3. **分步骤操作**: 将复杂任务分解为多个步骤

## 🔧 故障排除

### 连接问题

```bash
# 检查 Ollama 是否运行
curl http://localhost:11434/api/tags

# 重新配置连接
llamacli config edit default
```

### 工具执行失败

1. **检查权限**: 确保有足够的文件系统权限
2. **验证路径**: 确认文件和目录路径正确
3. **查看错误信息**: 仔细阅读错误提示

### 性能问题

1. **减少上下文**: 避免包含过大的文件
2. **调整超时**: 增加网络请求的超时时间
3. **使用本地模型**: Ollama 通常比云端 API 更快

## 🔧 高级配置

### 环境变量

- `LLAMACLI_CONFIG_DIR`: 配置目录路径
- `LLAMACLI_LOG_LEVEL`: 日志级别 (debug, info, warn, error)
- `LLAMACLI_TIMEOUT`: 默认超时时间（毫秒）

### 调试模式

```bash
# 启用详细日志
LLAMACLI_LOG_LEVEL=debug llamacli chat

# 查看配置信息
llamacli config debug
```

## ❓ 常见问题

### Q: 如何更新 LlamaCLI？

A: 目前需要手动更新：

```bash
cd Llama-CLI
git pull
npm install
npm run build
```

### Q: 可以同时连接多个 LLM 吗？

A: 目前每个会话只能使用一个 LLM 配置文件，但可以在不同会话中使用不同的配置。

### Q: 工具调用失败怎么办？

A: 检查错误信息，确认权限和路径，必要时重新配置相关设置。

### Q: 如何备份配置？

A: 复制配置目录：

```bash
cp -r ~/.llamacli ~/.llamacli.backup
```

## 📚 更多资源

- **[开发者指南](DEVELOPER_GUIDE.md)** - 贡献代码和扩展开发
- **[API 参考](API_REFERENCE.md)** - 详细的 API 文档
- **[GitHub Issues](https://github.com/HaochenFa/Llama-CLI/issues)** - 报告问题和功能请求

---

需要帮助？欢迎在 GitHub 上提出问题或参与讨论！
