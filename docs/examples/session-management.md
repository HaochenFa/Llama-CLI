# Session Management Examples

This document provides comprehensive examples for managing chat sessions in LlamaCLI.

## 📁 Session Storage Location

Sessions are stored in: `~/.llamacli/sessions/`

## 🆕 Creating and Managing Sessions

### Basic Session Operations

```bash
# Start a new session with automatic naming
llamacli session new

# Create a named session
llamacli session new "project-planning"

# List all sessions
llamacli session list

# Show session details
llamacli session show project-planning

# Switch to a session
llamacli session switch project-planning
```

### Session Information

```bash
# Show current session
llamacli session current

# Show session statistics
llamacli session stats project-planning

# List sessions with filters
llamacli session list --status active
llamacli session list --priority high
llamacli session list --tag development
```

## 💾 Saving and Loading Sessions

### Save Operations

```bash
# Save current session
llamacli session save

# Save with specific name
llamacli session save "debugging-session"

# Save with description
llamacli session save "api-integration" --description "Working on REST API integration"

# Auto-save (configured in preferences)
llamacli preferences set behavior.autoSaveSession true
```

### Load Operations

```bash
# Load specific session
llamacli session load debugging-session

# Load most recent session
llamacli session load --recent

# Load session and continue conversation
llamacli session load api-integration --continue
```

## 📤 Import and Export

### Export Sessions

```bash
# Export single session
llamacli session export project-planning project-planning.json

# Export with full context
llamacli session export debugging-session debug.json --include-context

# Export multiple sessions
llamacli session export --all sessions-backup.json

# Export with metadata
llamacli session export api-integration api.json --include-metadata
```

### Import Sessions

```bash
# Import single session
llamacli session import project-planning.json

# Import with new name
llamacli session import debug.json --name "imported-debug-session"

# Import and merge with existing
llamacli session import api.json --merge

# Import from backup
llamacli session import sessions-backup.json --restore-all
```

## 🏷️ Session Organization

### Tags and Categories

```bash
# Add tags to session
llamacli session tag project-planning development frontend

# Remove tags
llamacli session untag project-planning frontend

# List sessions by tag
llamacli session list --tag development

# Set session priority
llamacli session priority project-planning high
```

### Session Metadata

```bash
# Set session description
llamacli session describe project-planning "Planning phase for new feature"

# Set session status
llamacli session status project-planning active

# Add notes to session
llamacli session note project-planning "Remember to check API rate limits"
```

## 🗂️ Session Templates

### Create Session Templates

```bash
# Save current session as template
llamacli session template save "code-review-template"

# Create session from template
llamacli session new --template code-review-template "review-auth-module"

# List available templates
llamacli session template list

# Export template
llamacli session template export code-review-template template.json
```

## 📊 Session Analytics

### Session Statistics

```bash
# Show session statistics
llamacli session stats

# Detailed session analysis
llamacli session analyze project-planning

# Session usage report
llamacli session report --timeframe week

# Export session analytics
llamacli session report --export analytics.json
```

## 🧹 Session Cleanup

### Archive and Delete

```bash
# Archive old session
llamacli session archive old-project

# Delete session
llamacli session delete completed-task

# Clean up old sessions (older than 30 days)
llamacli session cleanup --older-than 30d

# Archive sessions by criteria
llamacli session archive --status completed --older-than 7d
```

### Bulk Operations

```bash
# Delete multiple sessions
llamacli session delete session1 session2 session3

# Archive by tag
llamacli session archive --tag completed

# Clean up by size (keep only recent large sessions)
llamacli session cleanup --max-size 100MB --keep-recent 10
```

## 📋 Session Configuration Examples

### Session Data Structure

```json
{
  "id": "project-planning-20250801",
  "name": "project-planning",
  "description": "Planning phase for new feature",
  "status": "active",
  "priority": "high",
  "tags": ["development", "planning"],
  "createdAt": "2025-08-01T10:00:00Z",
  "updatedAt": "2025-08-01T15:30:00Z",
  "metadata": {
    "llmProfile": "claude-sonnet",
    "totalMessages": 45,
    "totalTokens": 12500,
    "averageResponseTime": 2.3
  },
  "messages": [
    {
      "role": "user",
      "content": "Let's plan the new authentication feature",
      "timestamp": "2025-08-01T10:00:00Z"
    },
    {
      "role": "assistant",
      "content": "I'd be happy to help you plan the authentication feature...",
      "timestamp": "2025-08-01T10:00:15Z"
    }
  ],
  "context": {
    "workingDirectory": "/home/user/project",
    "files": ["src/auth.ts", "docs/auth-spec.md"],
    "environment": {
      "NODE_ENV": "development"
    }
  }
}
```

### Session Template Example

```json
{
  "name": "code-review-template",
  "description": "Template for code review sessions",
  "defaultTags": ["code-review", "development"],
  "defaultPriority": "medium",
  "initialPrompt": "I need help reviewing code. Please analyze for:\n1. Code quality and best practices\n2. Potential bugs or issues\n3. Performance considerations\n4. Security concerns",
  "suggestedFiles": ["*.ts", "*.js", "*.py", "README.md"],
  "preferences": {
    "llmProfile": "claude-sonnet",
    "includeContext": true,
    "autoSave": true
  }
}
```

## 🔄 Session Workflows

### Development Workflow

```bash
# Start development session
llamacli session new "feature-auth" --template development
llamacli session tag feature-auth development authentication
llamacli session priority feature-auth high

# Work on the feature...
llamacli chat "Let's implement OAuth2 authentication"

# Save progress
llamacli session save --description "OAuth2 implementation progress"

# Switch to different task
llamacli session new "bug-fix-login" --template bugfix
llamacli session tag bug-fix-login bugfix urgent

# Return to original session
llamacli session switch feature-auth
```

### Code Review Workflow

```bash
# Create review session
llamacli session new "review-pr-123" --template code-review
llamacli session describe review-pr-123 "Review PR #123: Add user authentication"

# Include relevant files
llamacli chat "Review this authentication module" --file src/auth.ts

# Save review notes
llamacli session note review-pr-123 "Approved with minor suggestions"
llamacli session status review-pr-123 completed

# Archive completed review
llamacli session archive review-pr-123
```

### Learning Session Workflow

```bash
# Create learning session
llamacli session new "learn-react-hooks" --template learning
llamacli session tag learn-react-hooks learning react frontend

# Study and practice
llamacli chat "Explain React hooks with examples"
llamacli chat "Help me practice useState and useEffect"

# Save learning progress
llamacli session note learn-react-hooks "Completed useState, working on useEffect"

# Export for future reference
llamacli session export learn-react-hooks react-hooks-learning.json
```

## 🎯 Best Practices

### Session Naming

- Use descriptive names: `feature-user-auth` instead of `session1`
- Include dates for time-sensitive work: `bug-fix-2025-08-01`
- Use consistent naming patterns: `project-task-date`

### Session Organization

- Use tags consistently: `development`, `bugfix`, `learning`, `review`
- Set appropriate priorities: `low`, `medium`, `high`, `urgent`
- Add descriptions for context: "Working on user authentication feature"

### Session Maintenance

- Archive completed sessions regularly
- Export important sessions for backup
- Clean up old sessions to save space
- Use templates for recurring workflows

---

For more information, see the [User Guide](../USER_GUIDE.md) and [API Reference](../API_REFERENCE.md).
