# LlamaCLI Quick Start Guide

## 🚀 Get Started in 5 Minutes

### System Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0
- OS: Windows, macOS, Linux

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/HaochenFa/Llama-CLI.git
cd Llama-CLI

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Create global link (optional)
npm link packages/cli
```

### First-Time Setup

```bash
# Start LlamaCLI with modern UI
llamacli

# First run will automatically launch configuration wizard
# Choose your LLM provider:
# - Ollama (local) - Privacy-first, runs on your machine
# - OpenAI (cloud) - GPT-4, GPT-3.5-turbo models
# - Claude (cloud) - Anthropic's Claude models
# - Gemini (cloud) - Google's Gemini models
# - OpenAI-Compatible (local/cloud) - Custom endpoints
```

### Basic Usage

```bash
# Interactive mode with modern UI (recommended)
llamacli

# Quick Q&A
llamacli get "How to implement deep copy in JavaScript?"

# Chat with file references
llamacli chat "Review @src/app.js for potential issues"

# Non-interactive mode for automation
echo "Analyze this code" | llamacli --format json

# Start conversation
llamacli chat "Hello, please help me analyze this code"

# View configuration
llamacli config list

# Change theme
llamacli preferences set cli.theme dracula
```

### Common Features

#### 1. Smart Completion

- Press `Tab` for command suggestions
- File path auto-completion support
- Context-aware option completion

#### 2. Syntax Highlighting

- Automatic code language detection
- Supports JavaScript, Python, JSON, Shell, etc.
- Customizable highlighting themes

#### 3. Theme Switching

```bash
# Available themes: default, light, dracula, github, monokai
llamacli preferences set cli.theme <theme-name>
```

#### 4. Session Management

```bash
llamacli session list          # View all sessions
llamacli session save my-work  # Save current session
llamacli session load my-work  # Load session
```

### Troubleshooting

#### Command Not Found

```bash
# Ensure project is built
npm run build

# Check global link
npm link packages/cli

# Or run directly
node packages/cli/dist/index.js
```

#### API Connection Error

```bash
# Check configuration
llamacli config list

# Reconfigure
llamacli config add my-config
```

#### Performance Issues

```bash
# Check system resources
llamacli preferences get performance

# Enable debug mode
LLAMACLI_DEBUG=1 llamacli
```

### Next Steps

- Read [User Guide](docs/USER_GUIDE.md) for advanced features
- Check [API Reference](docs/API_REFERENCE.md) for technical details
- Contribute to [Development](docs/DEVELOPER_GUIDE.md)

---

## 🌟 Common Use Cases

### Development Assistant

```bash
llamacli chat "Help me review this code for security issues"
llamacli chat "Explain this error message and provide solutions"
```

### Learning New Technologies

```bash
llamacli get "React Hooks best practices"
llamacli chat "Teach me how to use TypeScript generics"
```

### Project Management

```bash
llamacli chat "Analyze project structure and suggest improvements"
llamacli chat "Generate test cases for this feature"
```

Need help? Run `llamacli --help` or check the complete documentation.
