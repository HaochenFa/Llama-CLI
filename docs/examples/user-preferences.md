# User Preferences Configuration Examples

This document provides comprehensive examples for configuring LlamaCLI user preferences across all categories.

## 📁 Preferences File Location

User preferences are stored in: `~/.llamacli/preferences.json`

## 🎨 CLI Preferences

### Basic CLI Settings

```bash
# Set theme
llamacli preferences set cli.theme dracula

# Enable auto-completion
llamacli preferences set cli.autoComplete true

# Enable syntax highlighting
llamacli preferences set cli.syntaxHighlighting true

# Custom prompt
llamacli preferences set cli.prompt "🦙 llamacli> "

# Show welcome message
llamacli preferences set cli.showWelcome true
```

### Advanced CLI Settings

```bash
# Color scheme (auto, light, dark)
llamacli preferences set cli.colorScheme auto

# Enable animations
llamacli preferences set cli.enableAnimations true

# Compact mode
llamacli preferences set cli.compactMode false

# Show timestamps
llamacli preferences set cli.showTimestamps true

# Show tips
llamacli preferences set cli.showTips true
```

## ✏️ Editor Preferences

### Basic Editor Settings

```bash
# Default editor
llamacli preferences set editor.defaultEditor "code"

# Tab size
llamacli preferences set editor.tabSize 2

# Enable line numbers
llamacli preferences set editor.lineNumbers true

# Enable word wrap
llamacli preferences set editor.wordWrap true
```

### Advanced Editor Settings

```bash
# Font family
llamacli preferences set editor.fontFamily "JetBrains Mono"

# Font size
llamacli preferences set editor.fontSize 14

# Auto-save interval (seconds)
llamacli preferences set editor.autoSaveInterval 30

# Show whitespace
llamacli preferences set editor.showWhitespace false
```

## 🖥️ Display Preferences

### Layout Settings

```bash
# Maximum display width
llamacli preferences set display.maxWidth 120

# Code block style (bordered, simple, minimal)
llamacli preferences set display.codeBlockStyle bordered

# Table style (unicode, ascii, minimal)
llamacli preferences set display.tableStyle unicode

# Date format
llamacli preferences set display.dateFormat "YYYY-MM-DD HH:mm:ss"
```

### Visual Settings

```bash
# Show progress bars
llamacli preferences set display.showProgressBars true

# Show icons
llamacli preferences set display.showIcons true

# Indent size for nested content
llamacli preferences set display.indentSize 2

# Truncate long lines
llamacli preferences set display.truncateLongLines true
```

## ⚙️ Behavior Preferences

### Confirmation Settings

```bash
# Confirm before exit
llamacli preferences set behavior.confirmExit false

# Confirm dangerous operations
llamacli preferences set behavior.confirmDangerous true

# Confirm file deletions
llamacli preferences set behavior.confirmDelete true

# Auto-approve tool calls (use with caution)
llamacli preferences set behavior.autoApproveTools false
```

### Session Settings

```bash
# Auto-save sessions
llamacli preferences set behavior.autoSaveSession true

# Session save interval (minutes)
llamacli preferences set behavior.sessionSaveInterval 5

# Send telemetry (privacy-conscious)
llamacli preferences set behavior.sendTelemetry false

# Auto-update check
llamacli preferences set behavior.checkUpdates true
```

## ⌨️ Keyboard Shortcuts

### Basic Shortcuts

```bash
# Clear screen
llamacli preferences set shortcuts.clearScreen "Ctrl+L"

# Exit application
llamacli preferences set shortcuts.exitApp "Ctrl+D"

# Toggle theme
llamacli preferences set shortcuts.toggleTheme "Ctrl+T"

# Show help
llamacli preferences set shortcuts.showHelp "Ctrl+H"
```

### Advanced Shortcuts

```bash
# New session
llamacli preferences set shortcuts.newSession "Ctrl+N"

# Save session
llamacli preferences set shortcuts.saveSession "Ctrl+S"

# Search history
llamacli preferences set shortcuts.searchHistory "Ctrl+R"

# Toggle compact mode
llamacli preferences set shortcuts.toggleCompact "Ctrl+M"
```

## 📚 History Preferences

### Basic History Settings

```bash
# Enable command history
llamacli preferences set history.enabled true

# Maximum history entries
llamacli preferences set history.maxEntries 1000

# Persist across sessions
llamacli preferences set history.persistAcrossSessions true

# Enable history search
llamacli preferences set history.enableSearch true
```

### Advanced History Settings

```bash
# Exclude patterns (sensitive data)
llamacli preferences set history.excludePatterns '["password", "secret", "token", "key"]'

# Deduplicate entries
llamacli preferences set history.deduplicate true

# Auto-clean old entries
llamacli preferences set history.autoClean true

# History file size limit (MB)
llamacli preferences set history.fileSizeLimit 10
```

## 📄 Complete Configuration Example

Here's a complete `~/.llamacli/preferences.json` example:

```json
{
  "version": "1.0.0",
  "cli": {
    "theme": "dracula",
    "colorScheme": "auto",
    "prompt": "🦙 llamacli> ",
    "showWelcome": true,
    "showTips": true,
    "enableAnimations": true,
    "compactMode": false,
    "showTimestamps": false,
    "autoComplete": true,
    "syntaxHighlighting": true
  },
  "editor": {
    "defaultEditor": "code",
    "tabSize": 2,
    "lineNumbers": true,
    "wordWrap": true,
    "fontFamily": "JetBrains Mono",
    "fontSize": 14,
    "autoSaveInterval": 30,
    "showWhitespace": false
  },
  "display": {
    "maxWidth": 120,
    "codeBlockStyle": "bordered",
    "tableStyle": "unicode",
    "dateFormat": "YYYY-MM-DD HH:mm:ss",
    "showProgressBars": true,
    "showIcons": true,
    "indentSize": 2,
    "truncateLongLines": true
  },
  "behavior": {
    "confirmExit": false,
    "confirmDangerous": true,
    "confirmDelete": true,
    "autoApproveTools": false,
    "autoSaveSession": true,
    "sessionSaveInterval": 5,
    "sendTelemetry": false,
    "checkUpdates": true
  },
  "shortcuts": {
    "clearScreen": "Ctrl+L",
    "exitApp": "Ctrl+D",
    "toggleTheme": "Ctrl+T",
    "showHelp": "Ctrl+H",
    "newSession": "Ctrl+N",
    "saveSession": "Ctrl+S",
    "searchHistory": "Ctrl+R",
    "toggleCompact": "Ctrl+M"
  },
  "history": {
    "enabled": true,
    "maxEntries": 1000,
    "persistAcrossSessions": true,
    "enableSearch": true,
    "excludePatterns": ["password", "secret", "token", "key"],
    "deduplicate": true,
    "autoClean": true,
    "fileSizeLimit": 10
  },
  "lastUpdated": 1722470400000
}
```

## 🔧 Management Commands

### View Preferences

```bash
# List all preferences
llamacli preferences list

# View specific section
llamacli preferences list --section cli

# Get specific preference
llamacli preferences get cli.theme
```

### Modify Preferences

```bash
# Set single preference
llamacli preferences set cli.theme monokai

# Reset section
llamacli preferences reset --section cli

# Reset all preferences
llamacli preferences reset --all
```

### Import/Export

```bash
# Export preferences
llamacli preferences export my-settings.json

# Import preferences
llamacli preferences import my-settings.json

# Backup current preferences
llamacli preferences export backup-$(date +%Y%m%d).json
```

## 🎯 Recommended Configurations

### Developer Setup

```bash
llamacli preferences set cli.theme github
llamacli preferences set cli.syntaxHighlighting true
llamacli preferences set editor.defaultEditor code
llamacli preferences set editor.tabSize 2
llamacli preferences set display.maxWidth 120
llamacli preferences set behavior.autoSaveSession true
```

### Minimal Setup

```bash
llamacli preferences set cli.theme light
llamacli preferences set cli.compactMode true
llamacli preferences set cli.showWelcome false
llamacli preferences set display.codeBlockStyle simple
llamacli preferences set behavior.confirmExit false
```

### Power User Setup

```bash
llamacli preferences set cli.theme dracula
llamacli preferences set cli.enableAnimations true
llamacli preferences set editor.fontSize 16
llamacli preferences set display.showProgressBars true
llamacli preferences set history.maxEntries 5000
llamacli preferences set shortcuts.toggleTheme "F2"
```

---

For more information, see the [User Guide](../USER_GUIDE.md) and [API Reference](../API_REFERENCE.md).
