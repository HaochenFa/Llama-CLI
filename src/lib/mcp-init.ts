// src/lib/mcp-init.ts
// MCP initialization and auto-connection module

import { getMcpManager } from "./tools/mcp_manager.js";
import { McpConfigManager } from "./mcp/config.js";
import chalk from "chalk";

/**
 * Initialize MCP system and auto-connect to enabled servers
 */
export async function initializeMcp(): Promise<void> {
  try {
    console.log(chalk.blue("🔌 Initializing MCP (Model Context Protocol) system..."));

    const mcpManager = getMcpManager();
    const mcpConfigManager = new McpConfigManager();

    // Load server configurations
    const servers = mcpConfigManager.getServers();
    const enabledServers = servers.filter((server: any) => server.enabled);

    if (enabledServers.length === 0) {
      console.log(chalk.gray("   No MCP servers configured or enabled."));
      return;
    }

    console.log(chalk.blue(`   Found ${enabledServers.length} enabled MCP server(s)`));

    // Add servers to manager
    for (const serverConfig of enabledServers) {
      try {
        await mcpManager?.addServer(serverConfig.id, serverConfig.name, serverConfig.config);
        console.log(chalk.gray(`   Added server: ${serverConfig.name}`));
      } catch (error) {
        console.log(
          chalk.yellow(
            `   Warning: Failed to add server ${serverConfig.name}: ${(error as Error).message}`
          )
        );
      }
    }

    // Auto-connect to servers marked for auto-connection
    const autoConnectServers = enabledServers.filter((server: any) => server.autoConnect);

    if (autoConnectServers.length > 0) {
      console.log(chalk.blue(`   Auto-connecting to ${autoConnectServers.length} server(s)...`));

      const connectionPromises = autoConnectServers.map(async (serverConfig: any) => {
        try {
          await mcpManager?.connectServer(serverConfig.id);
          console.log(chalk.green(`   ✓ Connected to ${serverConfig.name}`));
          return { success: true, server: serverConfig.name };
        } catch (error) {
          console.log(
            chalk.red(`   ✗ Failed to connect to ${serverConfig.name}: ${(error as Error).message}`)
          );
          return { success: false, server: serverConfig.name, error: (error as Error).message };
        }
      });

      const results = await Promise.all(connectionPromises);
      const successful = results.filter((r: any) => r.success).length;
      const failed = results.filter((r: any) => !r.success).length;

      if (successful > 0) {
        console.log(chalk.green(`   Successfully connected to ${successful} MCP server(s)`));
      }

      if (failed > 0) {
        console.log(chalk.yellow(`   Failed to connect to ${failed} MCP server(s)`));
      }
    }

    console.log(chalk.green("✅ MCP initialization complete"));
  } catch (error) {
    console.log(chalk.red(`❌ MCP initialization failed: ${(error as Error).message}`));
    console.log(chalk.gray("   MCP functionality will be limited"));
  }
}

/**
 * Initialize MCP tools in the tool dispatcher
 */
export async function initializeMcpTools(toolDispatcher: any): Promise<void> {
  try {
    await toolDispatcher.loadMcpTools();
    const stats = toolDispatcher.getToolStats();

    if (stats.mcp > 0) {
      console.log(chalk.blue(`   Loaded ${stats.mcp} MCP tools`));
    }
  } catch (error) {
    console.log(chalk.yellow(`   Warning: Failed to load MCP tools: ${(error as Error).message}`));
  }
}

/**
 * Get MCP status summary for display
 */
export function getMcpStatus(): { servers: number; connectedServers: number; tools: number } {
  try {
    const mcpManager = getMcpManager();
    const servers = mcpManager?.getServers() || [];
    const connectedServers = servers.filter((s: any) => s.status === "connected").length;

    // Get tool count (this would need to be implemented in the manager)
    const toolCount = 0;
    try {
      // This is a placeholder - we'd need to implement getAllTools in the manager
      // toolCount = await mcpManager.getAllTools().then(tools => tools.length);
    } catch (error) {
      // Ignore errors when getting tool count
    }

    return {
      servers: servers.length,
      connectedServers,
      tools: toolCount,
    };
  } catch (error) {
    return {
      servers: 0,
      connectedServers: 0,
      tools: 0,
    };
  }
}
