# LlamaCLI Documentation

**Version**: 1.0.0 | **Last Updated**: 2025-08-03

Welcome to the LlamaCLI documentation! This guide will help you get started and make the most of your AI-powered command-line experience with modern UI, intelligent features, and comprehensive customization options.

## 📚 Documentation Structure

### 🚀 Getting Started

| Document                                           | Description                    | Audience            |
| -------------------------------------------------- | ------------------------------ | ------------------- |
| **[Quick Start Guide](../QUICK_START.md)**         | 5-minute setup and basic usage | New users           |
| **[Quick Start Guide (EN)](../QUICK_START_EN.md)** | English version of quick start | International users |

### 📖 User Documentation

| Document                              | Description                     | Audience      |
| ------------------------------------- | ------------------------------- | ------------- |
| **[User Guide](USER_GUIDE.md)**       | Advanced features and workflows | Regular users |
| **[API Reference](API_REFERENCE.md)** | Technical API documentation     | Developers    |
| **[Features Overview](FEATURES.md)**  | Comprehensive feature list      | All users     |

### 🛠️ Developer Resources

| Document                                  | Description                    | Audience         |
| ----------------------------------------- | ------------------------------ | ---------------- |
| **[Developer Guide](DEVELOPER_GUIDE.md)** | Contributing and architecture  | Contributors     |
| **[Project Roadmap](ROADMAP.md)**         | Development plans and progress | All stakeholders |

### 📋 Examples & Configuration

| Document                                                         | Description                   | Use Case      |
| ---------------------------------------------------------------- | ----------------------------- | ------------- |
| **[Adapter Configurations](examples/adapter-configurations.md)** | LLM provider setup examples   | Configuration |
| **[CLI Usage Examples](examples/cli-usage-examples.md)**         | Command-line usage patterns   | Learning      |
| **[Configuration Examples](examples/configuration-examples.md)** | Advanced configuration setups | Customization |

## 🎯 Quick Navigation

### For New Users

1. **Start Here**: [Quick Start Guide](../QUICK_START.md)
2. **Learn More**: [User Guide](USER_GUIDE.md)
3. **Get Help**: [Troubleshooting](#-troubleshooting)

### For Developers

1. **Architecture**: [Developer Guide](DEVELOPER_GUIDE.md)
2. **API Details**: [API Reference](API_REFERENCE.md)
3. **Contributing**: [Developer Guide - Contributing](DEVELOPER_GUIDE.md#contributing)

### For Advanced Users

1. **Advanced Features**: [User Guide - Advanced Features](USER_GUIDE.md#advanced-tool-integration)
2. **Customization**: [User Guide - Customization](USER_GUIDE.md#customization--preferences)
3. **Performance**: [User Guide - Performance](USER_GUIDE.md#performance--security)

## 🔍 Find What You Need

### Common Tasks

| Task                       | Documentation                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------- |
| **Install LlamaCLI**       | [Quick Start - Installation](../QUICK_START.md#installation-steps)                 |
| **Configure LLM Provider** | [User Guide - Configuration](USER_GUIDE.md#advanced-configuration)                 |
| **Use Interactive Mode**   | [User Guide - Interactive Features](USER_GUIDE.md#advanced-interactive-features)   |
| **Manage Sessions**        | [User Guide - Session Management](USER_GUIDE.md#advanced-chat--session-management) |
| **Customize Themes**       | [User Guide - Themes](USER_GUIDE.md#built-in-themes)                               |
| **Contribute Code**        | [Developer Guide - Contributing](DEVELOPER_GUIDE.md#contributing)                  |
| **Report Issues**          | [GitHub Issues](https://github.com/HaochenFa/Llama-CLI/issues)                     |

### By Feature Category

#### 🤖 AI & LLM Features

- [Supported Providers](USER_GUIDE.md#llm-provider-support)
- [Model Configuration](examples/adapter-configurations.md)
- [Tool Integration](USER_GUIDE.md#advanced-tool-integration)

#### 🖥️ CLI Experience

- [Interactive Mode](USER_GUIDE.md#advanced-interactive-features)
- [Auto-completion](USER_GUIDE.md#keyboard-shortcuts)
- [Syntax Highlighting](API_REFERENCE.md#syntax-highlighting)
- [Theme System](USER_GUIDE.md#built-in-themes)

#### ⚙️ Configuration & Customization

- [User Preferences](USER_GUIDE.md#customization--preferences)
- [Profile Management](USER_GUIDE.md#quick-profile-setup)
- [Session Management](USER_GUIDE.md#advanced-chat--session-management)

#### 🛠️ Development & Extension

- [Architecture Overview](DEVELOPER_GUIDE.md#architecture-overview)
- [Adding LLM Adapters](DEVELOPER_GUIDE.md#extension-points)
- [Creating Tools](DEVELOPER_GUIDE.md#extension-points)
- [API Reference](API_REFERENCE.md)

## 🆘 Troubleshooting

### Quick Fixes

| Issue                | Solution                                                      | Documentation                                     |
| -------------------- | ------------------------------------------------------------- | ------------------------------------------------- |
| Command not found    | `npm run build && npm link packages/cli`                      | [Quick Start](../QUICK_START.md#troubleshooting)  |
| API connection error | Check configuration: `llamacli config list`                   | [User Guide](USER_GUIDE.md#quick-troubleshooting) |
| Slow performance     | Switch profile: `llamacli config use <profile>`               | [User Guide](USER_GUIDE.md#quick-troubleshooting) |
| Display issues       | Reset preferences: `llamacli preferences reset --section cli` | [User Guide](USER_GUIDE.md#quick-troubleshooting) |

### Getting Help

- **Documentation**: Browse this documentation
- **GitHub Issues**: [Report bugs or request features](https://github.com/HaochenFa/Llama-CLI/issues)
- **Discussions**: [Community discussions](https://github.com/HaochenFa/Llama-CLI/discussions)

## 📝 Documentation Versions

- **Current Version**: 1.0.0
- **Last Updated**: 2025-08-03
- **Language Support**: Chinese (primary), English (core documents)

## 🤝 Contributing to Documentation

Found an error or want to improve the documentation? We welcome contributions!

1. **Quick Fixes**: Edit files directly on GitHub
2. **Major Changes**: Follow the [Developer Guide](DEVELOPER_GUIDE.md#contributing)
3. **Translations**: Help us translate documentation to more languages

---

**Need immediate help?** Start with the [Quick Start Guide](../QUICK_START.md) or check [Troubleshooting](#-troubleshooting).
