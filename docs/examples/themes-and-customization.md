# Themes and Customization Examples

This document provides comprehensive examples for customizing LlamaCLI's appearance and behavior.

## 🎨 Built-in Themes

LlamaCLI includes 5 built-in themes that you can use immediately.

### Available Themes

```bash
# List all available themes
llamacli preferences get cli.theme

# Available themes:
# - default (modern dark theme with blue accents)
# - light (clean light theme)
# - dracula (popular dark theme with purple accents)
# - github (GitHub-inspired theme)
# - monokai (classic dark theme with vibrant colors)
```

### Switching Themes

#### Interactive Theme Selector (Recommended)

```bash
# Start chat interface and press Ctrl+T
llamacli chat
# Then press Ctrl+T to open visual theme selector
# Use ↑↓ to navigate, Enter to select, ESC to cancel
```

#### Command Line Theme Switching

```bash
# Switch to Dracula theme
llamacli preferences set cli.theme dracula

# Switch to light theme
llamacli preferences set cli.theme light

# Switch to GitHub theme
llamacli preferences set cli.theme github

# Switch to Monokai theme
llamacli preferences set cli.theme monokai

# Return to default theme
llamacli preferences set cli.theme default
```

### Theme Preview

```bash
# Preview theme without changing
llamacli theme preview dracula

# Apply theme temporarily (current session only)
llamacli theme temp monokai

# Quick theme switching in interactive mode
> theme dracula
> theme light
```

## 🌈 Theme Characteristics

### Default Theme

- **Type**: Dark
- **Primary Color**: Blue (#007ACC)
- **Background**: Dark gray (#1E1E1E)
- **Text**: Light gray (#D4D4D4)
- **Accent**: Bright blue (#0078D4)
- **Best for**: General development work

### Light Theme

- **Type**: Light
- **Primary Color**: Dark blue (#0366D6)
- **Background**: White (#FFFFFF)
- **Text**: Dark gray (#24292E)
- **Accent**: Blue (#0366D6)
- **Best for**: Bright environments, documentation

### Dracula Theme

- **Type**: Dark
- **Primary Color**: Purple (#BD93F9)
- **Background**: Dark purple (#282A36)
- **Text**: Light gray (#F8F8F2)
- **Accent**: Pink (#FF79C6)
- **Best for**: Long coding sessions, popular choice

### GitHub Theme

- **Type**: Light/Dark adaptive
- **Primary Color**: GitHub blue (#0969DA)
- **Background**: Adaptive
- **Text**: Adaptive
- **Accent**: GitHub orange (#FB8500)
- **Best for**: GitHub integration, familiar interface

### Monokai Theme

- **Type**: Dark
- **Primary Color**: Green (#A6E22E)
- **Background**: Dark gray (#272822)
- **Text**: Light gray (#F8F8F2)
- **Accent**: Orange (#FD971F)
- **Best for**: Sublime Text users, vibrant colors

## 🎛️ Advanced Customization

### Color Scheme Settings

```bash
# Set color scheme preference (auto, light, dark)
llamacli preferences set cli.colorScheme auto

# Force light mode regardless of theme
llamacli preferences set cli.colorScheme light

# Force dark mode regardless of theme
llamacli preferences set cli.colorScheme dark
```

### Visual Enhancements

```bash
# Enable animations
llamacli preferences set cli.enableAnimations true

# Show icons in output
llamacli preferences set display.showIcons true

# Enable progress bars
llamacli preferences set display.showProgressBars true

# Show timestamps
llamacli preferences set cli.showTimestamps true
```

## 🖥️ Display Customization

### Layout Settings

```bash
# Set maximum display width
llamacli preferences set display.maxWidth 120

# Enable compact mode
llamacli preferences set cli.compactMode true

# Set indentation size
llamacli preferences set display.indentSize 2

# Truncate long lines
llamacli preferences set display.truncateLongLines true
```

### Code Block Styling

```bash
# Set code block style (bordered, simple, minimal)
llamacli preferences set display.codeBlockStyle bordered

# Enable syntax highlighting
llamacli preferences set cli.syntaxHighlighting true

# Set table style (unicode, ascii, minimal)
llamacli preferences set display.tableStyle unicode
```

## ✏️ Text and Font Settings

### Editor Preferences

```bash
# Set font family (if supported by terminal)
llamacli preferences set editor.fontFamily "JetBrains Mono"

# Set font size
llamacli preferences set editor.fontSize 14

# Enable line numbers in code blocks
llamacli preferences set editor.lineNumbers true

# Enable word wrap
llamacli preferences set editor.wordWrap true
```

### Text Display

```bash
# Show whitespace characters
llamacli preferences set editor.showWhitespace false

# Set tab size for code display
llamacli preferences set editor.tabSize 2

# Set date format
llamacli preferences set display.dateFormat "YYYY-MM-DD HH:mm:ss"
```

## 🎯 Custom Prompt

### Prompt Customization

```bash
# Set custom prompt
llamacli preferences set cli.prompt "🦙 llamacli> "

# Simple prompt
llamacli preferences set cli.prompt "llamacli> "

# Minimal prompt
llamacli preferences set cli.prompt "> "

# Fancy prompt with emoji
llamacli preferences set cli.prompt "🚀 AI Assistant> "

# Include current profile in prompt
llamacli preferences set cli.prompt "[{profile}] llamacli> "
```

### Dynamic Prompt Elements

The prompt supports these dynamic elements:

- `{profile}` - Current LLM profile name
- `{session}` - Current session name
- `{time}` - Current time
- `{cwd}` - Current working directory (basename)

```bash
# Prompt with profile and session
llamacli preferences set cli.prompt "[{profile}:{session}] > "

# Prompt with time
llamacli preferences set cli.prompt "[{time}] llamacli> "

# Prompt with working directory
llamacli preferences set cli.prompt "{cwd} $ "
```

## 🎨 Theme Configuration Examples

### Developer Setup

```bash
# GitHub theme with development-friendly settings
llamacli preferences set cli.theme github
llamacli preferences set cli.syntaxHighlighting true
llamacli preferences set display.codeBlockStyle bordered
llamacli preferences set display.showIcons true
llamacli preferences set editor.lineNumbers true
llamacli preferences set cli.prompt "[{profile}] dev> "
```

### Minimal Setup

```bash
# Light theme with minimal interface
llamacli preferences set cli.theme light
llamacli preferences set cli.compactMode true
llamacli preferences set display.codeBlockStyle simple
llamacli preferences set display.showIcons false
llamacli preferences set cli.showWelcome false
llamacli preferences set cli.prompt "> "
```

### Power User Setup

```bash
# Dracula theme with all features enabled
llamacli preferences set cli.theme dracula
llamacli preferences set cli.enableAnimations true
llamacli preferences set display.showProgressBars true
llamacli preferences set display.showIcons true
llamacli preferences set cli.showTimestamps true
llamacli preferences set cli.prompt "🦙 [{profile}:{session}] {time} > "
```

### Presentation Mode

```bash
# Large, clear display for presentations
llamacli preferences set cli.theme light
llamacli preferences set editor.fontSize 18
llamacli preferences set display.maxWidth 100
llamacli preferences set display.codeBlockStyle bordered
llamacli preferences set cli.compactMode false
llamacli preferences set cli.prompt "Demo> "
```

## 🔧 Theme Management Commands

### Theme Operations

```bash
# Show current theme
llamacli preferences get cli.theme

# List all available themes
llamacli theme list

# Show theme details
llamacli theme info dracula

# Reset theme to default
llamacli preferences set cli.theme default
```

### Theme Backup and Restore

```bash
# Export current theme settings
llamacli preferences export --section cli theme-backup.json

# Import theme settings
llamacli preferences import theme-backup.json --section cli

# Reset all visual preferences
llamacli preferences reset --section cli
llamacli preferences reset --section display
```

## 🎨 Complete Customization Examples

### Dark Mode Enthusiast

```json
{
  "cli": {
    "theme": "dracula",
    "colorScheme": "dark",
    "prompt": "🌙 [{profile}] > ",
    "enableAnimations": true,
    "showTimestamps": false
  },
  "display": {
    "codeBlockStyle": "bordered",
    "showIcons": true,
    "showProgressBars": true,
    "maxWidth": 120
  },
  "editor": {
    "fontFamily": "Fira Code",
    "fontSize": 14,
    "lineNumbers": true
  }
}
```

### Light Mode Professional

```json
{
  "cli": {
    "theme": "github",
    "colorScheme": "light",
    "prompt": "[{profile}] $ ",
    "enableAnimations": false,
    "compactMode": false
  },
  "display": {
    "codeBlockStyle": "simple",
    "showIcons": false,
    "maxWidth": 100,
    "dateFormat": "MMM DD, YYYY HH:mm"
  },
  "editor": {
    "fontFamily": "SF Mono",
    "fontSize": 13,
    "lineNumbers": true
  }
}
```

### Retro Terminal

```json
{
  "cli": {
    "theme": "monokai",
    "colorScheme": "dark",
    "prompt": "user@llamacli:~$ ",
    "enableAnimations": false,
    "showWelcome": false
  },
  "display": {
    "codeBlockStyle": "minimal",
    "tableStyle": "ascii",
    "showIcons": false,
    "maxWidth": 80
  },
  "editor": {
    "fontFamily": "Monaco",
    "fontSize": 12,
    "tabSize": 4
  }
}
```

## 🎯 Best Practices

### Theme Selection

- **Default**: Good all-around choice for most users
- **Light**: Best for bright environments and documentation work
- **Dracula**: Popular choice for long coding sessions
- **GitHub**: Familiar for GitHub users, good contrast
- **Monokai**: Vibrant colors, good for creative work

### Customization Tips

1. **Start with a base theme** and customize incrementally
2. **Test in different lighting conditions** before settling
3. **Consider your terminal's capabilities** (font support, colors)
4. **Export your settings** for backup and sharing
5. **Use consistent settings** across different environments

### Performance Considerations

- Disable animations on slower systems
- Use simple code block styles for better performance
- Limit display width on smaller screens
- Consider compact mode for mobile terminals

---

For more information, see the [User Guide](../USER_GUIDE.md) and [API Reference](../API_REFERENCE.md).
