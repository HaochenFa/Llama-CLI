// src/lib/tools/mcp_manager.ts
// Tool for managing MCP servers and connections

import { ToolDefinition } from "../../types/context.js";
import { McpManager } from "../mcp/manager.js";
import { McpConfigManager } from "../mcp/config.js";
import { McpToolAdapter } from "../mcp/tool-adapter.js";

// Global MCP instances (will be initialized when needed)
let mcpManager: McpManager | null = null;
let mcpConfigManager: McpConfigManager | null = null;
let mcpToolAdapter: McpToolAdapter | null = null;

function getMcpInstances() {
  if (!mcpManager) {
    mcpManager = new McpManager();
    mcpConfigManager = new McpConfigManager();
    mcpToolAdapter = new McpToolAdapter(mcpManager);
  }
  return { mcpManager, mcpConfigManager, mcpToolAdapter };
}

export const mcp_manager_tool: ToolDefinition = {
  type: "native",
  name: "mcp_manager",
  description:
    "Manage Model Context Protocol (MCP) servers and connections. Supports listing, connecting, disconnecting, and getting information about MCP servers and their tools.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: [
          "list",
          "connect",
          "disconnect",
          "status",
          "tools",
          "resources",
          "test",
          "add",
          "remove",
          "enable",
          "disable",
        ],
        description:
          "The action to perform: list (show servers), connect (connect to server), disconnect (disconnect from server), status (show connection status), tools (list available tools), resources (list available resources), test (test connections), add (add new server), remove (remove server), enable/disable (enable/disable server)",
      },
      server_id: {
        type: "string",
        description:
          "Server ID for actions that target a specific server (connect, disconnect, remove, enable, disable)",
      },
      server_name: {
        type: "string",
        description: "Server name when adding a new server",
      },
      command: {
        type: "string",
        description: "Command to run the MCP server when adding a new server",
      },
      args: {
        type: "array",
        items: { type: "string" },
        description: "Command line arguments for the MCP server",
      },
      env: {
        type: "object",
        description: "Environment variables for the MCP server",
      },
      cwd: {
        type: "string",
        description: "Working directory for the MCP server",
      },
      description: {
        type: "string",
        description: "Description of the MCP server when adding",
      },
      auto_connect: {
        type: "boolean",
        description: "Whether to auto-connect to this server on startup",
        default: false,
      },
    },
    required: ["action"],
  },
  invoke: async (args: {
    action: string;
    server_id?: string;
    server_name?: string;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    cwd?: string;
    description?: string;
    auto_connect?: boolean;
  }) => {
    const { mcpManager, mcpConfigManager, mcpToolAdapter } = getMcpInstances();

    try {
      switch (args.action) {
        case "list":
          const servers = mcpConfigManager!.getServers();
          if (servers.length === 0) {
            return 'No MCP servers configured.\n\nTo add a server, use:\nmcp_manager with action="add", server_name="MyServer", command="npx", args=["@modelcontextprotocol/server-filesystem", "/path"]';
          }

          const serverList = servers
            .map((server: any) => {
              const mcpServer = mcpManager!.getServer(server.id);
              const status = mcpServer?.status || "not loaded";
              const statusIcon = getStatusIcon(status);
              return `${statusIcon} ${server.name} (${server.id})
  Status: ${status}
  Command: ${server.config.command} ${(server.config.args || []).join(" ")}
  Enabled: ${server.enabled ? "Yes" : "No"}
  Auto-connect: ${server.autoConnect ? "Yes" : "No"}
  ${server.description ? `Description: ${server.description}` : ""}`;
            })
            .join("\n\n");

          return `MCP Servers:\n\n${serverList}`;

        case "connect":
          if (!args.server_id) {
            return "Error: server_id is required for connect action";
          }

          const serverConfig = mcpConfigManager!.getServer(args.server_id);
          if (!serverConfig) {
            return `Error: Server "${args.server_id}" not found`;
          }

          // Add server to manager if not already added
          if (!mcpManager!.getServer(args.server_id)) {
            await mcpManager!.addServer(args.server_id, serverConfig.name, serverConfig.config);
          }

          await mcpManager!.connectServer(args.server_id);
          return `Successfully connected to MCP server "${serverConfig.name}"`;

        case "disconnect":
          if (!args.server_id) {
            return "Error: server_id is required for disconnect action";
          }

          await mcpManager!.disconnectServer(args.server_id);
          return `Disconnected from MCP server "${args.server_id}"`;

        case "status":
          return mcpToolAdapter!.getServersSummary();

        case "tools":
          return await mcpToolAdapter!.getToolsSummary();

        case "resources":
          return await mcpToolAdapter!.getResourcesSummary();

        case "test":
          return await mcpToolAdapter!.testConnections();

        case "add":
          if (!args.server_name || !args.command) {
            return "Error: server_name and command are required for add action";
          }

          const newServerId = mcpConfigManager!.addServer({
            name: args.server_name,
            description: args.description,
            config: {
              command: args.command,
              args: args.args || [],
              env: args.env || {},
              cwd: args.cwd,
            },
            enabled: true,
            autoConnect: args.auto_connect || false,
          });

          return `Successfully added MCP server "${args.server_name}" with ID "${newServerId}"`;

        case "remove":
          if (!args.server_id) {
            return "Error: server_id is required for remove action";
          }

          // Disconnect if connected
          try {
            await mcpManager!.disconnectServer(args.server_id);
            await mcpManager!.removeServer(args.server_id);
          } catch (error) {
            // Server might not be in manager, that's ok
          }

          mcpConfigManager!.removeServer(args.server_id);
          return `Successfully removed MCP server "${args.server_id}"`;

        case "enable":
          if (!args.server_id) {
            return "Error: server_id is required for enable action";
          }

          mcpConfigManager!.setServerEnabled(args.server_id, true);
          return `Enabled MCP server "${args.server_id}"`;

        case "disable":
          if (!args.server_id) {
            return "Error: server_id is required for disable action";
          }

          // Disconnect if connected
          try {
            await mcpManager!.disconnectServer(args.server_id);
          } catch (error) {
            // Server might not be connected, that's ok
          }

          mcpConfigManager!.setServerEnabled(args.server_id, false);
          return `Disabled MCP server "${args.server_id}"`;

        default:
          return `Error: Unknown action "${args.action}". Available actions: list, connect, disconnect, status, tools, resources, test, add, remove, enable, disable`;
      }
    } catch (error) {
      return `Error: ${(error as Error).message}`;
    }
  },
};

function getStatusIcon(status: string): string {
  switch (status) {
    case "connected":
      return "🟢";
    case "connecting":
      return "🟡";
    case "disconnected":
      return "⚪";
    case "error":
      return "🔴";
    default:
      return "❓";
  }
}

// Export the MCP instances for use by other parts of the system
export function getMcpManager(): McpManager | null {
  return mcpManager;
}

export function getMcpToolAdapter(): McpToolAdapter | null {
  return mcpToolAdapter;
}
