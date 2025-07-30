# LLM 适配器配置指南

LlamaCLI 支持多种 LLM 提供商，包括云端服务和本地模型。

## 🌐 支持的适配器

### 云端服务
- **OpenAI** - GPT-4, GPT-3.5 等模型
- **Anthropic** - Claude 3 系列模型
- **Google** - Gemini 1.5 系列模型
- **Azure OpenAI** - Azure 托管的 OpenAI 模型
- **AWS Bedrock** - Amazon 托管的多种模型

### 本地服务
- **Ollama** - 本地运行的开源模型
- **LM Studio** - 本地模型管理和 API 服务
- **LocalAI** - 自托管的 OpenAI 兼容 API
- **vLLM** - 高性能推理服务器

## ⚡ 快速配置

### 云端服务配置

#### OpenAI
```bash
llamacli config add openai-gpt4 \
  --type openai \
  --model gpt-4 \
  --api-key your-openai-api-key
```

#### Anthropic Claude
```bash
llamacli config add claude-sonnet \
  --type claude \
  --model claude-3-5-sonnet-20241022 \
  --api-key your-anthropic-api-key
```

#### Google Gemini
```bash
llamacli config add gemini-pro \
  --type gemini \
  --model gemini-1.5-pro \
  --api-key your-google-api-key
```

### 本地服务配置

#### Ollama
```bash
llamacli config add ollama-llama \
  --type ollama \
  --endpoint http://localhost:11434 \
  --model llama3.1:8b
```

#### LM Studio
```bash
llamacli config add lmstudio-local \
  --type openai-compatible \
  --endpoint http://localhost:1234/v1 \
  --model local-model
```

## 🔧 配置文件方式

您也可以直接编辑配置文件 `~/.llamacli/config.json`：

```json
{
  "adapters": {
    "openai-gpt4": {
      "type": "openai",
      "endpoint": "https://api.openai.com/v1",
      "model": "gpt-4",
      "apiKey": "your-openai-api-key"
    },
    "claude-sonnet": {
      "type": "claude",
      "endpoint": "https://api.anthropic.com/v1",
      "model": "claude-3-5-sonnet-20241022",
      "apiKey": "your-anthropic-api-key"
    },
    "ollama-llama": {
      "type": "ollama",
      "endpoint": "http://localhost:11434",
      "model": "llama3.1:8b"
    }
  },
  "defaultAdapter": "openai-gpt4"
}
```

## 📋 常用命令

### 查看配置
```bash
# 列出所有适配器
llamacli config list

# 查看特定适配器
llamacli config show openai-gpt4

# 测试适配器连接
llamacli config test claude-sonnet
```

### 管理配置
```bash
# 设置默认适配器
llamacli config set-default ollama-llama

# 删除适配器
llamacli config remove old-adapter

# 更新适配器
llamacli config update openai-gpt4 --model gpt-4-turbo
```

## 🔍 故障排除

### 常见问题

1. **API 密钥错误**
   ```
   Error: OpenAI API key is required
   ```
   解决方案：检查 API 密钥是否正确设置

2. **网络连接问题**
   ```
   Error: Network error
   ```
   解决方案：检查网络连接和端点 URL

3. **模型不可用**
   ```
   Error: Model not found
   ```
   解决方案：检查模型名称是否正确

### 验证配置

使用以下命令验证配置是否正确：

```bash
llamacli config test your-adapter-name
```

## 🎯 推荐配置

### 开发环境
- **主要**: Ollama (本地快速测试)
- **备用**: OpenAI GPT-4 (复杂任务)

### 生产环境
- **主要**: Claude 3.5 Sonnet (平衡性能和成本)
- **备用**: GPT-4 (特殊需求)

### 成本优化
- **日常使用**: GPT-3.5 Turbo
- **复杂任务**: Claude 3 Haiku
- **本地处理**: Ollama + Llama 3.1

## 📚 更多信息

- [用户指南](../USER_GUIDE.md) - 完整使用指南
- [开发者指南](../DEVELOPER_GUIDE.md) - 开发和扩展
- [API 参考](../API_REFERENCE.md) - 详细 API 文档
