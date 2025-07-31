# LlamaCLI Configuration Examples

This directory contains comprehensive configuration examples and guides for LlamaCLI.

## 📚 Available Examples

### 🔧 [Adapter Configurations](adapter-configurations.md)
Complete guide for configuring LLM adapters including:
- **Cloud Services**: OpenAI, Anthropic Claude, Google Gemini
- **Local Services**: Ollama, OpenAI-compatible services
- **Configuration Methods**: Interactive setup and JSON configuration
- **Troubleshooting**: Common issues and solutions
- **Recommended Setups**: Development, production, and cost-optimized configurations

### ⚙️ [User Preferences](user-preferences.md)
Comprehensive user preferences configuration covering:
- **CLI Settings**: Themes, prompts, auto-completion, syntax highlighting
- **Editor Settings**: Default editor, tab size, line numbers, fonts
- **Display Settings**: Layout, code blocks, tables, visual elements
- **Behavior Settings**: Confirmations, auto-save, telemetry
- **Keyboard Shortcuts**: Customizable key bindings
- **History Settings**: Command history management and privacy

### 💾 [Session Management](session-management.md)
Complete session management examples including:
- **Basic Operations**: Creating, saving, loading sessions
- **Organization**: Tags, priorities, descriptions, metadata
- **Import/Export**: Backup and sharing sessions
- **Templates**: Reusable session configurations
- **Analytics**: Session statistics and reports
- **Cleanup**: Archiving and deleting old sessions
- **Workflows**: Development, code review, and learning patterns

### 🎨 [Themes and Customization](themes-and-customization.md)
Visual customization and theming guide featuring:
- **Built-in Themes**: Default, Light, Dracula, GitHub, Monokai
- **Theme Characteristics**: Colors, styles, and use cases
- **Advanced Customization**: Color schemes, animations, icons
- **Display Settings**: Layout, fonts, code blocks
- **Custom Prompts**: Dynamic prompt elements and styling
- **Complete Examples**: Setups for different use cases

## 🚀 Quick Start Examples

### Basic Setup

```bash
# Set up your first LLM profile
llamacli config add my-ollama
# Follow interactive prompts

# Customize basic preferences
llamacli preferences set cli.theme dracula
llamacli preferences set cli.autoComplete true
llamacli preferences set cli.syntaxHighlighting true

# Start chatting
llamacli chat "Hello, help me get started with LlamaCLI"
```

### Developer Configuration

```bash
# Configure for development work
llamacli config add dev-claude
llamacli preferences set cli.theme github
llamacli preferences set editor.defaultEditor code
llamacli preferences set display.codeBlockStyle bordered
llamacli preferences set behavior.autoSaveSession true

# Create development session
llamacli session new "project-work" --template development
```

### Minimal Setup

```bash
# Lightweight configuration
llamacli config add minimal-gpt
llamacli preferences set cli.theme light
llamacli preferences set cli.compactMode true
llamacli preferences set cli.showWelcome false
llamacli preferences set display.codeBlockStyle simple
```

## 📋 Configuration File Locations

### Main Configuration Files
- **LLM Profiles**: `~/.llamacli/config.json`
- **User Preferences**: `~/.llamacli/preferences.json`
- **Command History**: `~/.llamacli/history.json`

### Session Data
- **Sessions Directory**: `~/.llamacli/sessions/`
- **Session Templates**: `~/.llamacli/templates/`
- **Session Archives**: `~/.llamacli/archives/`

### Logs and Reports
- **Error Reports**: `~/.llamacli/error-reports/`
- **Performance Logs**: `~/.llamacli/logs/`
- **Analytics Data**: `~/.llamacli/analytics/`

## 🎯 Common Use Cases

### 1. Multi-Model Development
```bash
# Set up multiple LLM profiles
llamacli config add local-ollama    # For quick testing
llamacli config add cloud-claude    # For complex tasks
llamacli config add backup-gpt      # For fallback

# Switch between models easily
llamacli config use local-ollama    # Fast local testing
llamacli config use cloud-claude    # Production work
```

### 2. Team Collaboration
```bash
# Export team configuration
llamacli preferences export team-config.json
llamacli config export team-profiles.json

# Share session templates
llamacli session template export code-review-template template.json

# Import on team member's machine
llamacli preferences import team-config.json
llamacli config import team-profiles.json
llamacli session template import template.json
```

### 3. Environment-Specific Setups
```bash
# Development environment
llamacli preferences set cli.theme github
llamacli preferences set behavior.confirmDangerous true
llamacli preferences set history.maxEntries 5000

# Production environment
llamacli preferences set cli.theme light
llamacli preferences set behavior.autoApproveTools false
llamacli preferences set behavior.sendTelemetry false
```

## 🔧 Management Commands

### Configuration Management
```bash
# View all configurations
llamacli config list
llamacli preferences list
llamacli session list

# Export everything for backup
llamacli config export backup-config.json
llamacli preferences export backup-prefs.json
llamacli session export --all backup-sessions.json

# Reset to defaults
llamacli preferences reset --all
llamacli config reset
```

### Maintenance
```bash
# Clean up old data
llamacli session cleanup --older-than 30d
llamacli history cleanup --max-entries 1000

# Validate configuration
llamacli config validate
llamacli preferences validate

# Performance check
llamacli system check
```

## 📖 Related Documentation

### Core Documentation
- **[User Guide](../USER_GUIDE.md)** - Complete usage guide
- **[Developer Guide](../DEVELOPER_GUIDE.md)** - Development and extension
- **[API Reference](../API_REFERENCE.md)** - Detailed API documentation
- **[Features](../FEATURES.md)** - Complete feature overview
- **[Roadmap](../ROADMAP.md)** - Development roadmap

### Advanced Topics
- **Error Handling**: Intelligent error processing and recovery
- **Performance Monitoring**: Real-time metrics and benchmarking
- **Security**: Privacy settings and data protection
- **Integration**: IDE and tool integrations

## 🆘 Getting Help

### Troubleshooting
1. Check the specific example files for detailed solutions
2. Use `llamacli --help` for command-line help
3. Enable debug mode: `LLAMACLI_DEBUG=1 llamacli your-command`
4. Validate your configuration: `llamacli config validate`

### Support Resources
- **Documentation**: Complete guides in the `docs/` directory
- **Examples**: Real-world configuration examples in this directory
- **Error Messages**: LlamaCLI provides detailed error messages with solutions
- **Community**: GitHub discussions and issues

---

**Note**: All examples in this directory are based on the actual LlamaCLI v0.9.0 implementation and are regularly updated to reflect the latest features and best practices.
