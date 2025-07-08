import { Command } from 'commander';
import { getMcpManager, getMcpToolAdapter } from '../lib/tools/mcp_manager';
import { McpConfigManager } from '../lib/mcp/config';
import { getMcpStatus } from '../lib/mcp-init';
import chalk from 'chalk';
import inquirer from 'inquirer';

export function registerMcpCommand(program: Command) {
  const mcpCommand = new Command('mcp')
    .description('Manage Model Context Protocol (MCP) servers and connections');

  // mcp list - List all configured MCP servers
  mcpCommand
    .command('list')
    .description('List all configured MCP servers')
    .option('--connected-only', 'Show only connected servers', false)
    .action(async (options: { connectedOnly: boolean }) => {
      try {
        const mcpConfigManager = new McpConfigManager();
        const mcpManager = getMcpManager();
        const servers = mcpConfigManager.getServers();

        if (servers.length === 0) {
          console.log(chalk.yellow('📝 No MCP servers configured yet.'));
          console.log(chalk.blue('💡 Tip: Use "llama-cli mcp add" to add a new MCP server.'));
          return;
        }

        console.log(chalk.bold.blue('🔌 MCP Servers:'));
        console.log();

        for (const server of servers) {
          const runtimeServer = mcpManager.getServer(server.id);
          const status = runtimeServer?.status || 'not loaded';
          
          if (options.connectedOnly && status !== 'connected') {
            continue;
          }

          const statusColor = status === 'connected' ? chalk.green : 
                             status === 'connecting' ? chalk.yellow :
                             status === 'error' ? chalk.red : chalk.gray;

          console.log(`${chalk.bold(server.name)} (${server.id})`);
          console.log(`  Status: ${statusColor(status)}`);
          console.log(`  Enabled: ${server.enabled ? chalk.green('Yes') : chalk.red('No')}`);
          console.log(`  Auto-connect: ${server.autoConnect ? chalk.green('Yes') : chalk.gray('No')}`);
          console.log(`  Command: ${chalk.gray(server.config.command)}`);
          if (server.config.args && server.config.args.length > 0) {
            console.log(`  Args: ${chalk.gray(server.config.args.join(' '))}`);
          }
          if (server.description) {
            console.log(`  Description: ${chalk.gray(server.description)}`);
          }
          if (runtimeServer?.lastError) {
            console.log(`  Last Error: ${chalk.red(runtimeServer.lastError)}`);
          }
          console.log();
        }
      } catch (error) {
        console.error(chalk.red(`❌ Error listing MCP servers: ${(error as Error).message}`));
        process.exit(1);
      }
    });

  // mcp add - Add a new MCP server
  mcpCommand
    .command('add')
    .description('Add a new MCP server')
    .option('--name <name>', 'Server name')
    .option('--command <command>', 'Command to run the server')
    .option('--args <args...>', 'Arguments for the server command')
    .option('--description <description>', 'Server description')
    .option('--auto-connect', 'Auto-connect on startup', false)
    .action(async (options: { 
      name?: string; 
      command?: string; 
      args?: string[]; 
      description?: string; 
      autoConnect: boolean;
    }) => {
      try {
        const mcpConfigManager = new McpConfigManager();

        // Interactive mode if options not provided
        if (!options.name || !options.command) {
          console.log(chalk.bold.blue('🔌 Add New MCP Server'));
          console.log();

          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'Server name:',
              default: options.name,
              validate: (input: string) => input.trim().length > 0 || 'Server name is required'
            },
            {
              type: 'input',
              name: 'command',
              message: 'Command to run the server:',
              default: options.command || 'npx',
              validate: (input: string) => input.trim().length > 0 || 'Command is required'
            },
            {
              type: 'input',
              name: 'args',
              message: 'Arguments (space-separated):',
              default: options.args?.join(' ') || '',
            },
            {
              type: 'input',
              name: 'description',
              message: 'Description (optional):',
              default: options.description || '',
            },
            {
              type: 'confirm',
              name: 'autoConnect',
              message: 'Auto-connect on startup?',
              default: options.autoConnect
            }
          ]);

          options = {
            ...options,
            ...answers,
            args: answers.args ? answers.args.split(' ').filter(arg => arg.trim()) : []
          };
        }

        const serverId = mcpConfigManager.addServer({
          name: options.name!,
          description: options.description,
          config: {
            command: options.command!,
            args: options.args || [],
            env: {}
          },
          enabled: true,
          autoConnect: options.autoConnect
        });

        console.log(chalk.green(`✅ MCP server "${options.name}" added successfully with ID: ${serverId}`));
        
        if (options.autoConnect) {
          console.log(chalk.blue('🔄 Server will auto-connect on next startup'));
        }

      } catch (error) {
        console.error(chalk.red(`❌ Error adding MCP server: ${(error as Error).message}`));
        process.exit(1);
      }
    });

  // mcp connect - Connect to a server
  mcpCommand
    .command('connect <server-id>')
    .description('Connect to an MCP server')
    .action(async (serverId: string) => {
      try {
        const mcpConfigManager = new McpConfigManager();
        const mcpManager = getMcpManager();

        const serverConfig = mcpConfigManager.getServer(serverId);
        if (!serverConfig) {
          console.error(chalk.red(`❌ Error: Server "${serverId}" not found`));
          process.exit(1);
        }

        console.log(chalk.blue(`🔄 Connecting to MCP server "${serverConfig.name}"...`));

        // Add server to manager if not already added
        if (!mcpManager.getServer(serverId)) {
          await mcpManager.addServer(serverId, serverConfig.name, serverConfig.config);
        }

        await mcpManager.connectServer(serverId);
        console.log(chalk.green(`✅ Successfully connected to "${serverConfig.name}"`));

      } catch (error) {
        console.error(chalk.red(`❌ Error connecting to MCP server: ${(error as Error).message}`));
        process.exit(1);
      }
    });

  // mcp disconnect - Disconnect from a server
  mcpCommand
    .command('disconnect <server-id>')
    .description('Disconnect from an MCP server')
    .action(async (serverId: string) => {
      try {
        const mcpManager = getMcpManager();

        await mcpManager.disconnectServer(serverId);
        console.log(chalk.green(`✅ Disconnected from MCP server "${serverId}"`));

      } catch (error) {
        console.error(chalk.red(`❌ Error disconnecting from MCP server: ${(error as Error).message}`));
        process.exit(1);
      }
    });

  // mcp remove - Remove a server
  mcpCommand
    .command('remove <server-id>')
    .description('Remove an MCP server configuration')
    .option('--force', 'Force removal without confirmation', false)
    .action(async (serverId: string, options: { force: boolean }) => {
      try {
        const mcpConfigManager = new McpConfigManager();
        const mcpManager = getMcpManager();

        const serverConfig = mcpConfigManager.getServer(serverId);
        if (!serverConfig) {
          console.error(chalk.red(`❌ Error: Server "${serverId}" not found`));
          process.exit(1);
        }

        if (!options.force) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: `Are you sure you want to remove MCP server "${serverConfig.name}"?`,
              default: false
            }
          ]);

          if (!confirm) {
            console.log(chalk.yellow('Operation cancelled'));
            return;
          }
        }

        // Disconnect if connected
        try {
          await mcpManager.disconnectServer(serverId);
          await mcpManager.removeServer(serverId);
        } catch (error) {
          // Server might not be in manager, that's ok
        }

        mcpConfigManager.removeServer(serverId);
        console.log(chalk.green(`✅ MCP server "${serverConfig.name}" removed successfully`));

      } catch (error) {
        console.error(chalk.red(`❌ Error removing MCP server: ${(error as Error).message}`));
        process.exit(1);
      }
    });

  // mcp status - Show overall MCP status
  mcpCommand
    .command('status')
    .description('Show MCP system status')
    .action(async () => {
      try {
        const status = getMcpStatus();
        const mcpManager = getMcpManager();
        const servers = mcpManager.getServers();

        console.log(chalk.bold.blue('🔌 MCP System Status'));
        console.log();
        console.log(`Total servers: ${chalk.bold(status.servers)}`);
        console.log(`Connected servers: ${chalk.bold(status.connectedServers)}`);
        console.log(`Available tools: ${chalk.bold(status.tools)}`);
        console.log();

        if (servers.length > 0) {
          console.log(chalk.bold('Server Status:'));
          for (const server of servers) {
            const statusColor = server.status === 'connected' ? chalk.green : 
                               server.status === 'connecting' ? chalk.yellow :
                               server.status === 'error' ? chalk.red : chalk.gray;
            console.log(`  ${server.name}: ${statusColor(server.status)}`);
          }
        }

      } catch (error) {
        console.error(chalk.red(`❌ Error getting MCP status: ${(error as Error).message}`));
        process.exit(1);
      }
    });

  program.addCommand(mcpCommand);
}
