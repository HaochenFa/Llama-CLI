# LlamaCLI

A modern AI-powered command-line development partner designed for developers. Provides professional-grade CLI experience with intelligent auto-completion, syntax highlighting, theme management, and enhanced error handling.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/HaochenFa/Llama-CLI)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

## ✨ Core Features

### 🎯 AI Capabilities

- 🔒 **Privacy First**: Supports fully local operation, data never leaves your device
- 🛠️ **Intelligent Tools**: Built-in file operations, shell execution, web search, and more
- 🔧 **Multi-Model Support**: Supports Ollama, OpenAI, Claude, Gemini, and other LLM backends

### 🖥️ Modern CLI Experience

- 🔤 **Smart Completion**: Context-aware auto-completion for commands, options, and file paths
- 🎨 **Syntax Highlighting**: Multi-language code highlighting (JavaScript, Python, JSON, etc.)
- 🌈 **Theme System**: 5 built-in themes + custom theme support
- ⌨️ **Interactive Interface**: Modern interactive CLI with keyboard shortcuts
- 📚 **Command History**: Smart command history management with search and filtering

### 🛡️ Reliability & User Experience

- 🚨 **Smart Error Handling**: Converts technical errors into user-friendly guidance
- ⚙️ **Personalized Configuration**: 50+ configurable options with import/export support
- 🚀 **High Performance**: Startup time <350ms, memory usage <30MB (65% faster than target)
- 🛡️ **Security Mechanisms**: Complete tool confirmation and permission management system

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/HaochenFa/Llama-CLI.git
cd Llama-CLI

# Install dependencies and build
npm install
npm run build

# Create global link (optional)
npm link packages/cli
```

### First Time Setup

```bash
# Start chat interface (will guide you through configuration)
llamacli chat

# Or run directly with node
node packages/cli/dist/index.js chat
```

On first run, the system will automatically launch a configuration wizard to help you set up LLM connections.

### Basic Commands

```bash
# Start interactive mode (recommended)
llamacli
# or
llamacli --interactive

# Traditional command mode
llamacli chat "Hello"
llamacli get "How to implement deep copy in JavaScript?"

# Configuration management
llamacli config list              # View configurations
llamacli config add my-ollama     # Add new configuration
llamacli config use my-ollama     # Use specific configuration

# Personalization settings
llamacli preferences list         # View all preference settings
llamacli preferences set cli.theme dracula  # Change theme
llamacli preferences export backup.json     # Export settings

# Get help
llamacli --help
```

### 🎨 Interactive Features

In interactive mode, you can enjoy these enhanced features:

- **Tab Auto-completion**: Press Tab for command, option, and file path suggestions
- **Syntax Highlighting**: Automatic code highlighting for multiple programming languages
- **Theme Switching**: Use `theme <theme-name>` command to switch themes in real-time
- **Command History**: Use ↑/↓ arrow keys to browse command history
- **Smart Errors**: Error messages include specific solution suggestions

## 📖 Documentation

- **[User Guide](docs/USER_GUIDE.md)** - Complete usage instructions and best practices
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Contributing code and extension development
- **[API Reference](docs/API_REFERENCE.md)** - Detailed API documentation
- **[Project Roadmap](docs/ROADMAP.md)** - Feature planning and development progress

## 🔧 Current Status

### Development Progress: Phase 1 Complete ✅

**LlamaCLI v1.0.0 - User Experience & Performance Optimization Phase Complete**

### ✅ Implemented (Phase 1)

**Core AI Features**:

- Complete tool system (file operations, shell execution, network tools)
- MCP protocol support and full LLM adapter suite (Ollama, OpenAI, Claude, Gemini)
- Intelligent Agentic loop system (task decomposition, context management)
- Complete session management system (persistence, branching, history management)

**Modern CLI Experience**:

- 🔤 Intelligent command auto-completion system
- 🎨 Multi-language syntax highlighting
- 🌈 Theme management system (5 built-in themes)
- ⌨️ Interactive CLI interface
- 📚 Smart command history management

**User Experience Optimization**:

- ⚙️ User preference system (50+ configuration options)
- 🚨 Enhanced error handling (intelligent error classification and recovery suggestions)
- 🚀 High performance optimization (startup <350ms, memory <30MB)
- 🛡️ Security confirmation mechanisms and permission management

### 🚧 Next Phase (Phase 2)

- Testing infrastructure expansion (90%+ coverage)
- CI/CD pipeline construction
- Performance regression testing system
- Monitoring and telemetry systems

### 🔮 Future Plans (Phase 3)

- Plugin architecture system
- Enterprise features (team collaboration, audit compliance)
- Cloud sync and configuration sharing

## 🤝 Contributing

Contributions are welcome! Please check the [Developer Guide](docs/DEVELOPER_GUIDE.md) to learn how to participate in project development.

## 📄 License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.

---

> This project is inspired by [Gemini CLI](https://github.com/google-gemini/gemini-cli), committed to providing developers with a better AI command-line experience.
