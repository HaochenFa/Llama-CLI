# LLM Adapter Configuration Guide

LlamaCLI supports multiple LLM providers, including cloud services and local models.

## 🌐 Supported Adapters

### Cloud Services

- **OpenAI** - GPT-4, GPT-3.5, and other models
- **Anthropic** - Claude 3 series models
- **Google** - Gemini 1.5 series models

### Local Services

- **Ollama** - Local open-source models
- **OpenAI-Compatible** - LM Studio, vLLM, LocalAI, and other OpenAI-compatible services

## ⚡ Quick Configuration

### Cloud Service Configuration

#### OpenAI

```bash
llamacli config add openai-gpt4
# Follow the interactive prompts:
# - Adapter type: openai
# - Model: gpt-4
# - API Key: your-openai-api-key
# - Endpoint: https://api.openai.com/v1 (default)
```

#### Anthropic Claude

```bash
llamacli config add claude-sonnet
# Follow the interactive prompts:
# - Adapter type: claude
# - Model: claude-3-5-sonnet-20241022
# - API Key: your-anthropic-api-key
```

#### Google Gemini

```bash
llamacli config add gemini-pro
# Follow the interactive prompts:
# - Adapter type: gemini
# - Model: gemini-1.5-pro
# - API Key: your-google-api-key
```

### Local Service Configuration

#### Ollama

```bash
llamacli config add ollama-llama
# Follow the interactive prompts:
# - Adapter type: ollama
# - Model: llama3.1:8b
# - Endpoint: http://localhost:11434 (default)
```

#### OpenAI-Compatible Services

```bash
# LM Studio
llamacli config add lmstudio-local
# - Adapter type: openai-compatible
# - Endpoint: http://localhost:1234/v1
# - Model: local-model

# vLLM
llamacli config add vllm-server
# - Adapter type: openai-compatible
# - Endpoint: http://localhost:8000/v1
# - Model: your-model-name
```

## 🔧 Configuration File Method

You can also directly edit the configuration file `~/.llamacli/config.json`:

```json
{
  "profiles": {
    "openai-gpt4": {
      "adapter": "openai",
      "endpoint": "https://api.openai.com/v1",
      "model": "gpt-4",
      "apiKey": "your-openai-api-key",
      "timeout": 30000,
      "retries": 3
    },
    "claude-sonnet": {
      "adapter": "claude",
      "model": "claude-3-5-sonnet-20241022",
      "apiKey": "your-anthropic-api-key",
      "timeout": 30000
    },
    "ollama-llama": {
      "adapter": "ollama",
      "endpoint": "http://localhost:11434",
      "model": "llama3.1:8b",
      "timeout": 60000
    },
    "gemini-pro": {
      "adapter": "gemini",
      "model": "gemini-1.5-pro",
      "apiKey": "your-google-api-key"
    }
  },
  "defaultProfile": "openai-gpt4"
}
```

## 📋 Common Commands

### View Configuration

```bash
# List all profiles
llamacli config list

# Show specific profile details
llamacli config show openai-gpt4

# Test profile connection
llamacli config test claude-sonnet
```

### Manage Configuration

```bash
# Set default profile
llamacli config use ollama-llama

# Remove profile
llamacli config remove old-profile

# Switch between profiles
llamacli config use gemini-pro
```

## 🔍 Troubleshooting

### Common Issues

1. **API Key Error**

   ```text
   Error: OpenAI API key is required
   ```

   **Solution**: Check that your API key is correctly set in the profile configuration.

2. **Network Connection Issues**

   ```text
   Error: Network error - Connection timeout
   ```

   **Solution**: Check your network connection and endpoint URL.

3. **Model Not Available**

   ```text
   Error: Model not found
   ```

   **Solution**: Verify that the model name is correct and available for your account.

4. **Local Service Not Running**

   ```text
   Error: Connection refused
   ```

   **Solution**: Ensure your local service (Ollama, LM Studio) is running and accessible.

### Validate Configuration

Use the following command to verify your configuration:

```bash
llamacli config test your-profile-name
```

## 🎯 Recommended Configurations

### Development Environment

- **Primary**: Ollama (local, fast testing)
- **Backup**: OpenAI GPT-4 (complex tasks)

### Production Environment

- **Primary**: Claude 3.5 Sonnet (balanced performance and cost)
- **Backup**: GPT-4 (special requirements)

### Cost Optimization

- **Daily Use**: GPT-3.5 Turbo
- **Complex Tasks**: Claude 3 Haiku
- **Local Processing**: Ollama + Llama 3.1

## 📚 More Information

- [User Guide](../USER_GUIDE.md) - Complete usage guide
- [Developer Guide](../DEVELOPER_GUIDE.md) - Development and extension
- [API Reference](../API_REFERENCE.md) - Detailed API documentation
