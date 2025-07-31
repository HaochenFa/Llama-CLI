# LlamaCLI User Guide

**Version**: 0.9.0  
**Last Updated**: 2025-08-01

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

1. **Start LlamaCLI**:

   ```bash
   llamacli
   ```

2. **Configure your first LLM profile**:

   ```bash
   llamacli config add my-ollama
   ```

   Follow the interactive setup to configure your LLM connection.

3. **Start chatting**:
   ```bash
   llamacli chat "Hello, how can you help me with development?"
   ```

## 🖥️ Interactive Mode

LlamaCLI automatically starts in interactive mode, providing a modern CLI experience with enhanced features.

### Starting Interactive Mode

```bash
# Start interactive mode (default)
llamacli

# Or explicitly
llamacli --interactive
```

### Interactive Features

- **🔤 Auto-completion**: Press `Tab` for intelligent command suggestions
- **🎨 Syntax Highlighting**: Code is automatically highlighted in multiple languages
- **📚 Command History**: Use `↑/↓` arrows to navigate command history
- **🌈 Themes**: Switch between 5 built-in themes
- **⌨️ Keyboard Shortcuts**:
  - `Ctrl+L`: Clear screen
  - `Ctrl+D`: Exit application
  - `Tab`: Auto-completion
  - `↑/↓`: Navigate command history

### Available Commands

In interactive mode, you can use these commands:

- `help` - Show help information
- `chat [message]` - Start or continue chat conversation
- `get <query>` - Quick one-off questions
- `config list` - Show LLM profiles
- `config use <profile>` - Switch active profile
- `theme <name>` - Change visual theme
- `preferences list` - Show all preferences
- `session list` - Show saved sessions
- `clear` - Clear the screen
- `exit` / `quit` - Exit the application

## ⚙️ Configuration

### LLM Profiles

LlamaCLI supports multiple LLM providers through profiles:

```bash
# Add new profile
llamacli config add my-profile

# List all profiles
llamacli config list

# Switch active profile
llamacli config use my-profile

# Remove profile
llamacli config remove my-profile
```

### Supported LLM Providers

#### Local Models

- **Ollama**: Local model hosting (llama2, codellama, etc.)

#### Cloud Models

- **OpenAI**: GPT-3.5, GPT-4, GPT-4 Turbo
- **Anthropic Claude**: Claude-3 Haiku, Sonnet, Opus
- **Google Gemini**: Gemini 1.5 Pro, Flash

#### OpenAI-Compatible

- **Local Services**: LM Studio, vLLM, FastChat
- **Cloud Services**: Any OpenAI-compatible API

### Profile Configuration Examples

#### Ollama Profile

```bash
llamacli config add local-llama
# Select: ollama
# Model: llama2
# Endpoint: http://localhost:11434 (default)
```

#### OpenAI Profile

```bash
llamacli config add gpt4
# Select: openai
# Model: gpt-4
# API Key: [your-api-key]
```

## 🎨 Customization

### Themes

LlamaCLI includes 5 built-in themes:

```bash
# Change theme
llamacli preferences set cli.theme dracula

# Available themes:
# - default (dark theme with blue accents)
# - light (clean light theme)
# - dracula (purple accents)
# - github (GitHub-inspired)
# - monokai (vibrant colors)
```

### User Preferences

Customize your experience with 50+ configurable options:

```bash
# List all preferences
llamacli preferences list

# View specific category
llamacli preferences list --section cli

# Get specific preference
llamacli preferences get cli.theme

# Set preference
llamacli preferences set cli.autoComplete true

# Reset preferences
llamacli preferences reset --section cli

# Export settings for backup
llamacli preferences export my-settings.json

# Import settings
llamacli preferences import my-settings.json
```

### Preference Categories

#### CLI Settings

- Theme and color scheme
- Custom prompt text
- Auto-completion behavior
- Syntax highlighting
- Welcome messages and tips

#### Editor Settings

- Default text editor
- Tab size and indentation
- Line numbers and word wrap
- Font family and size

#### Display Settings

- Maximum display width
- Date and time formats
- Code block styling
- Table formatting

#### Behavior Settings

- Exit and delete confirmations
- Auto-save functionality
- Notification preferences
- Telemetry settings

#### Keyboard Shortcuts

- Customizable key bindings
- Screen clearing shortcuts
- Theme toggle keys

#### Command History

- History persistence
- Maximum entries
- Pattern exclusions
- Search functionality

## 💬 Chat Features

### Basic Chat

```bash
# Start a conversation
llamacli chat "Explain how async/await works in JavaScript"

# Continue the conversation
llamacli chat "Can you show me a practical example?"

# Include file context
llamacli chat "Review this code" --file src/index.ts
```

### Quick Queries

```bash
# One-off questions
llamacli get "What's the current time in Tokyo?"
llamacli get "How to reverse a string in Python?"
llamacli get "Best practices for React hooks"
```

### Session Management

```bash
# List all sessions
llamacli session list

# Save current conversation
llamacli session save my-project-discussion

# Load previous session
llamacli session load my-project-discussion

# Export session for sharing
llamacli session export my-session.json

# Import session
llamacli session import shared-session.json

# Delete old sessions
llamacli session delete old-session
```

## 🛠️ Advanced Features

### File Operations

LlamaCLI can help with file operations through its tool system:

```bash
llamacli chat "Read the package.json file and explain the dependencies"
llamacli chat "Create a new README.md file for this project"
llamacli chat "Find all TypeScript files in the src directory"
```

### Code Analysis

```bash
llamacli chat "Analyze the code in src/index.ts and suggest improvements"
llamacli chat "Find all TODO comments in the project"
llamacli chat "Check for potential security issues in this code"
```

### Shell Integration

```bash
llamacli chat "Run npm test and explain the results"
llamacli chat "Check the git status and suggest next steps"
llamacli chat "What files have changed since the last commit?"
```

## 🚨 Error Handling

LlamaCLI provides intelligent error handling with helpful recovery suggestions:

### Error Types

- **Network Issues**: Connection troubleshooting
- **Authentication**: API key validation and setup
- **Configuration**: Profile setup and validation
- **File Operations**: Permission and path guidance
- **Validation**: Input format and syntax help

### Error Features

- Clear, user-friendly error messages
- Priority-based recovery suggestions
- Specific commands to fix issues
- Interactive error recovery options
- Debug information for developers

## 📊 Performance

LlamaCLI is optimized for excellent performance:

- **Startup Time**: <350ms (65% better than target)
- **Memory Usage**: <30MB (85% better than target)
- **Response Time**: Near-instantaneous for most operations
- **Auto-completion**: <10ms response time
- **Theme Switching**: <5ms transition time

## 🔒 Privacy & Security

### Data Protection

- **Local First**: All data stored locally by default
- **No Telemetry**: Telemetry disabled by default (user-controlled)
- **Secure Storage**: Encrypted credential storage
- **Pattern Filtering**: Automatic exclusion of sensitive data from history

### Permission System

- Granular permission controls
- Tool execution confirmations
- Session-level permission management
- Audit trail for security-sensitive operations

## 🆘 Troubleshooting

### Common Issues

1. **Command not found**
   - Ensure LlamaCLI is properly installed: `npm run build`
   - Check global link: `npm link packages/cli`

2. **API connection errors**
   - Verify API keys: `llamacli config list`
   - Check network connection
   - Confirm service endpoints

3. **Slow responses**
   - Check LLM service status
   - Verify network connectivity
   - Try different model/profile

4. **Theme or display issues**
   - Reset CLI preferences: `llamacli preferences reset --section cli`
   - Check terminal compatibility

### Debug Mode

Enable detailed debugging information:

```bash
LLAMACLI_DEBUG=1 llamacli your-command
```

### Getting Help

- Use `llamacli --help` for command-line help
- Use `help` command in interactive mode
- Check error messages for specific guidance
- Review the [API Reference](API_REFERENCE.md) for technical details

## 📚 Example Workflows

### Daily Development

```bash
# Start your development session
llamacli

# Check project status
> chat "Analyze the current project structure and suggest today's priorities"

# Code review
> chat "Review the changes in the last commit"

# Documentation
> chat "Update the README with the new features we added"

# Testing
> chat "Run the test suite and explain any failures"
```

### Learning New Technologies

```bash
# Learn concepts
> get "Explain React Server Components with examples"

# Practice coding
> chat "Help me build a simple Next.js app with TypeScript"

# Debug issues
> chat "I'm getting this error: [paste error]. How do I fix it?"
```

### Code Refactoring

```bash
# Analyze code quality
> chat "Analyze this function and suggest improvements" --file src/utils.ts

# Refactor suggestions
> chat "How can I make this code more maintainable?"

# Performance optimization
> chat "Are there any performance issues in this code?"
```

---

For advanced usage, API details, and development information, see the [Developer Guide](DEVELOPER_GUIDE.md) and [API Reference](API_REFERENCE.md).
