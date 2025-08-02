# LlamaCLI User Guide

**Version**: 1.0.0
**Last Updated**: 2025-08-02

> 💡 **New to LlamaCLI?** Check out our [Quick Start Guide](../QUICK_START.md) for installation and basic setup.

## 📋 Overview

This guide covers advanced features and usage patterns for LlamaCLI. For basic installation and setup, see the Quick Start Guide.

## 🖥️ Advanced Interactive Features

### Keyboard Shortcuts

| Shortcut              | Action                |
| --------------------- | --------------------- |
| `Ctrl+D` (double-tap) | Exit application      |
| `Ctrl+T`              | Open theme selector   |
| `ESC`                 | Cancel/Close dialogs  |
| `Tab`                 | Auto-completion       |
| `↑/↓`                 | Navigate in selectors |
| `Enter`               | Confirm selection     |

### Command Reference

| Command                  | Description                 | Example                           |
| ------------------------ | --------------------------- | --------------------------------- |
| `help`                   | Show help information       | `help`                            |
| `chat [message]`         | Start/continue conversation | `chat "Review this code"`         |
| `get <query>`            | Quick one-off questions     | `get "Python list comprehension"` |
| `config list/use`        | Manage LLM profiles         | `config use my-ollama`            |
| `theme <name>`           | Change visual theme         | `theme dracula`                   |
| `session list/save/load` | Manage sessions             | `session save my-project`         |
| `preferences list/set`   | Manage settings             | `preferences set cli.theme light` |

## ⚙️ Advanced Configuration

### LLM Provider Support

| Provider              | Models                                                                    | Type        | Configuration             |
| --------------------- | ------------------------------------------------------------------------- | ----------- | ------------------------- |
| **Ollama**            | llama3.2, codellama, etc.                                                 | Local       | Endpoint URL              |
| **OpenAI**            | gpt-4, gpt-4-turbo, gpt-3.5-turbo                                         | Cloud       | API Key                   |
| **Claude**            | claude-3-opus-20240229, claude-3-sonnet-20240229, claude-3-haiku-20240307 | Cloud       | API Key                   |
| **Gemini**            | gemini-1.5-pro, gemini-1.5-flash, gemini-1.0-pro                          | Cloud       | API Key                   |
| **OpenAI-Compatible** | local-model, custom models                                                | Local/Cloud | Custom endpoint + API Key |

### Quick Profile Setup

```bash
# Interactive profile creation
llamacli config add <profile-name>

# Common configurations
llamacli config add ollama-local    # Local Ollama setup
llamacli config add openai-gpt4     # OpenAI GPT-4
llamacli config add claude-sonnet   # Claude Sonnet
```

## 🎨 Customization & Preferences

### Built-in Themes

| Theme     | Description                  | Best For            |
| --------- | ---------------------------- | ------------------- |
| `default` | Dark theme with blue accents | General use         |
| `light`   | Clean light theme            | Bright environments |
| `dracula` | Purple accents               | Popular dark theme  |
| `github`  | GitHub-inspired              | Familiar interface  |
| `monokai` | Vibrant colors               | Code-focused work   |

```bash
# Quick theme switching
llamacli preferences set cli.theme <theme-name>
```

### Key Preference Categories

#### Essential Settings

```bash
# Core CLI behavior
llamacli preferences set cli.autoComplete true
llamacli preferences set cli.syntaxHighlighting true
llamacli preferences set cli.theme dracula

# Performance tuning
llamacli preferences set performance.maxMemory 100MB
llamacli preferences set performance.timeout 30s
```

#### Backup & Restore

```bash
# Export all settings
llamacli preferences export backup-$(date +%Y%m%d).json

# Import settings
llamacli preferences import backup.json

# Reset to defaults
llamacli preferences reset --confirm
```

## 💬 Advanced Chat & Session Management

### Context-Aware Conversations

```bash
# Include file context
llamacli chat "Review this code" --file src/index.ts

# Multi-file analysis
llamacli chat "Compare these implementations" --file old.js --file new.js

# Directory context
llamacli chat "Analyze project structure" --directory src/
```

### Session Workflows

```bash
# Project-based sessions
llamacli session save "feature-auth-$(date +%Y%m%d)"
llamacli session load feature-auth-20250801

# Session templates
llamacli session export template-code-review.json
llamacli session import template-code-review.json

# Batch operations
llamacli session list --filter "project:auth"
llamacli session cleanup --older-than 30d
```

## 🛠️ Advanced Tool Integration

### Intelligent File Operations

```bash
# Smart file analysis
llamacli chat "Analyze package.json and suggest dependency updates"
llamacli chat "Find security vulnerabilities in dependencies"
llamacli chat "Generate TypeScript definitions for this JavaScript file"

# Batch file operations
llamacli chat "Convert all .js files in src/ to TypeScript"
llamacli chat "Add JSDoc comments to all functions in utils/"
```

### Development Workflows

```bash
# Code review automation
llamacli chat "Review last commit for code quality issues"
llamacli chat "Generate unit tests for changed files"
llamacli chat "Check if new code follows project conventions"

# Project maintenance
llamacli chat "Update all outdated dependencies safely"
llamacli chat "Generate changelog from recent commits"
llamacli chat "Optimize build configuration for production"
```

## 🚨 Smart Error Recovery

### Intelligent Error Classification

LlamaCLI automatically categorizes errors and provides specific solutions:

| Error Type         | Auto-Recovery      | User Action        |
| ------------------ | ------------------ | ------------------ |
| Network Issues     | Retry with backoff | Check connection   |
| API Authentication | Prompt for new key | Update credentials |
| Configuration      | Suggest fixes      | Run config wizard  |
| File Permissions   | Alternative paths  | Check file access  |

### Debug Mode

```bash
# Enable detailed debugging
LLAMACLI_DEBUG=1 llamacli your-command

# Performance profiling
llamacli --profile your-command
```

## 📊 Performance & Security

### Performance Metrics

- **Startup**: <350ms (65% faster than target)
- **Memory**: <30MB (85% better than target)
- **Auto-completion**: <10ms response time
- **Theme switching**: <5ms transition time

### Security Features

- **Local-first**: Data stays on your device
- **Encrypted storage**: Secure credential management
- **Permission system**: Granular tool execution controls
- **Audit trail**: Track security-sensitive operations

## 🆘 Quick Troubleshooting

| Issue             | Quick Fix            | Command                                    |
| ----------------- | -------------------- | ------------------------------------------ |
| Command not found | Rebuild project      | `npm run build && npm link packages/cli`   |
| API errors        | Check configuration  | `llamacli config list`                     |
| Slow responses    | Switch model/profile | `llamacli config use <faster-profile>`     |
| Display issues    | Reset preferences    | `llamacli preferences reset --section cli` |

### Getting Help

- `llamacli --help` - Command-line help
- `help` - Interactive mode help
- [API Reference](API_REFERENCE.md) - Technical details
- [Developer Guide](DEVELOPER_GUIDE.md) - Contributing

## 📚 Professional Workflows

### Code Review Workflow

```bash
# Automated code review
llamacli session save "review-$(git rev-parse --short HEAD)"
llamacli chat "Review last commit for security, performance, and maintainability"
llamacli chat "Generate test cases for new functions"
llamacli chat "Check if code follows project style guide"
```

### Feature Development Workflow

```bash
# Feature planning
llamacli session save "feature-auth-system"
llamacli chat "Design authentication system architecture"
llamacli chat "Create implementation checklist"
llamacli chat "Identify potential security considerations"

# Implementation support
llamacli chat "Generate boilerplate code for JWT authentication"
llamacli chat "Review implementation against security best practices"
```

### Learning & Documentation

```bash
# Technology exploration
llamacli get "Compare React Server Components vs Client Components"
llamacli chat "Show me production-ready Next.js 14 patterns"

# Documentation generation
llamacli chat "Generate API documentation from TypeScript interfaces"
llamacli chat "Create user guide from code comments"
```

---

**Next Steps**: [Developer Guide](DEVELOPER_GUIDE.md) • [API Reference](API_REFERENCE.md) • [Examples](examples/)
