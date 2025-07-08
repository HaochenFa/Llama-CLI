# MCP (Model Context Protocol) Demo

This document demonstrates the improved MCP support in LlamaCLI.

## Features Implemented

### 1. Core MCP Functionality
- ✅ MCP tool execution in tool dispatcher
- ✅ Dynamic MCP tool loading
- ✅ MCP initialization on CLI startup
- ✅ Dedicated MCP CLI commands
- ✅ Improved error handling and logging

### 2. CLI Commands

#### List MCP servers
```bash
llama-cli mcp list
llama-cli mcp list --connected-only
```

#### Add a new MCP server
```bash
# Interactive mode
llama-cli mcp add

# Command line mode
llama-cli mcp add --name "File System" --command "npx" --args "@modelcontextprotocol/server-filesystem" "/path/to/directory" --auto-connect
```

#### Connect/Disconnect servers
```bash
llama-cli mcp connect <server-id>
llama-cli mcp disconnect <server-id>
```

#### Remove a server
```bash
llama-cli mcp remove <server-id>
llama-cli mcp remove <server-id> --force
```

#### Check MCP status
```bash
llama-cli mcp status
```

### 3. Example MCP Server Configurations

#### File System Server
```bash
llama-cli mcp add \
  --name "File System" \
  --command "npx" \
  --args "@modelcontextprotocol/server-filesystem" "/Users/username/projects" \
  --description "Access to project files" \
  --auto-connect
```

#### Git Server
```bash
llama-cli mcp add \
  --name "Git" \
  --command "npx" \
  --args "@modelcontextprotocol/server-git" "--repository" "/Users/username/projects/myrepo" \
  --description "Git repository operations" \
  --auto-connect
```

#### SQLite Server
```bash
llama-cli mcp add \
  --name "Database" \
  --command "npx" \
  --args "@modelcontextprotocol/server-sqlite" "/path/to/database.db" \
  --description "SQLite database access"
```

### 4. Using MCP Tools in Chat

Once MCP servers are connected, their tools become available automatically in chat sessions:

```bash
# Start interactive chat
llama-cli

# The LLM can now use MCP tools like:
# - File system operations (read, write, list files)
# - Git operations (status, log, diff)
# - Database queries
# - And any other tools provided by connected MCP servers
```

### 5. Debugging MCP

Enable debug logging for MCP:
```bash
DEBUG_MCP=true llama-cli
```

This will show detailed logs for:
- Server connection attempts
- Tool loading
- Error messages
- Communication with MCP servers

### 6. Configuration

MCP server configurations are stored in:
- macOS: `~/Library/Application Support/llamacli/mcp-config.json`
- Linux: `~/.config/llamacli/mcp-config.json`
- Windows: `%APPDATA%/llamacli/mcp-config.json`

Example configuration:
```json
{
  "servers": {
    "filesystem-1": {
      "id": "filesystem-1",
      "name": "File System",
      "description": "Access to project files",
      "config": {
        "command": "npx",
        "args": ["@modelcontextprotocol/server-filesystem", "/Users/username/projects"],
        "env": {}
      },
      "enabled": true,
      "autoConnect": true
    }
  },
  "globalSettings": {
    "autoConnectEnabled": true,
    "maxConcurrentConnections": 10,
    "connectionTimeout": 30000,
    "retryAttempts": 3
  }
}
```

### 7. Error Handling

The improved MCP system provides better error messages:

- **Connection errors**: Clear messages about why a server failed to connect
- **Tool execution errors**: Detailed error information from MCP tools
- **Configuration validation**: Helpful validation messages for server configs
- **Graceful degradation**: CLI continues to work even if MCP servers fail

### 8. Tool Integration

MCP tools are seamlessly integrated with the existing tool system:

- MCP tools appear alongside native tools in the tool dispatcher
- They follow the same execution pattern as native tools
- Error handling is consistent across all tool types
- Tool statistics include MCP tool counts

### 9. Auto-initialization

When you start LlamaCLI:

1. MCP system initializes automatically
2. Enabled servers are loaded
3. Servers marked for auto-connect are connected
4. Available tools are loaded into the tool dispatcher
5. Everything is ready for use in chat sessions

### 10. Performance

- Non-blocking initialization: MCP doesn't slow down CLI startup
- Lazy loading: Tools are loaded only when needed
- Connection pooling: Efficient management of server connections
- Error recovery: Failed connections don't affect other servers

## Next Steps

Future improvements could include:
- MCP server discovery and marketplace
- Visual MCP server management interface
- Advanced tool composition and chaining
- MCP server health monitoring
- Automatic server updates
