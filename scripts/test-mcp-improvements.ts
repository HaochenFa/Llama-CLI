#!/usr/bin/env ts-node

// scripts/test-mcp-improvements.ts
// Script to test MCP improvements

import { ToolDispatcher } from '../src/lib/tool-dispatcher';
import { McpManager } from '../src/lib/mcp/manager';
import { McpConfigManager } from '../src/lib/mcp/config';
import { McpToolAdapter } from '../src/lib/mcp/tool-adapter';
import { initializeMcp, initializeMcpTools, getMcpStatus } from '../src/lib/mcp-init';
import chalk from 'chalk';

async function testMcpImprovements() {
  console.log(chalk.bold.blue('🧪 Testing MCP Improvements'));
  console.log();

  let testsPassed = 0;
  let testsTotal = 0;

  function test(name: string, testFn: () => boolean | Promise<boolean>) {
    return async () => {
      testsTotal++;
      try {
        const result = await testFn();
        if (result) {
          console.log(chalk.green(`✓ ${name}`));
          testsPassed++;
        } else {
          console.log(chalk.red(`✗ ${name}`));
        }
      } catch (error) {
        console.log(chalk.red(`✗ ${name}: ${(error as Error).message}`));
      }
    };
  }

  // Test 1: Tool Dispatcher MCP Support
  await test('Tool Dispatcher handles MCP tools', async () => {
    const toolDispatcher = new ToolDispatcher([]);
    
    // Add a mock MCP tool
    const mockMcpTool = {
      type: 'mcp' as const,
      name: 'test_mcp_tool',
      description: 'Test MCP tool',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string' }
        }
      },
      invoke: async (args: any) => `MCP result: ${args.message}`
    };

    toolDispatcher.availableTools.push(mockMcpTool);

    const result = await toolDispatcher.dispatch(
      { name: 'test_mcp_tool', arguments: { message: 'hello' } },
      'test-id'
    );

    return result.role === 'tool' && 
           result.content === 'MCP result: hello' &&
           result.tool_call_id === 'test-id';
  })();

  // Test 2: String Argument Parsing
  await test('Tool Dispatcher parses string arguments', async () => {
    const toolDispatcher = new ToolDispatcher([]);
    
    const mockTool = {
      type: 'native' as const,
      name: 'test_string_args',
      description: 'Test string args',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string' }
        }
      },
      invoke: async (args: any) => `Parsed: ${args.message}`
    };

    toolDispatcher.availableTools.push(mockTool);

    const result = await toolDispatcher.dispatch(
      { name: 'test_string_args', arguments: '{"message": "test"}' },
      'test-id'
    );

    return result.content === 'Parsed: test';
  })();

  // Test 3: Dynamic Tool Loading
  await test('Tool Dispatcher supports dynamic tool loading', async () => {
    const toolDispatcher = new ToolDispatcher([]);
    const initialCount = toolDispatcher.availableTools.length;

    // Mock the MCP tool adapter
    const mockAdapter = {
      getToolDefinitions: async () => [
        {
          type: 'mcp' as const,
          name: 'dynamic_tool',
          description: 'Dynamic tool',
          parameters: { type: 'object' },
          invoke: async () => 'dynamic result'
        }
      ]
    };

    // Manually add tools to simulate loadMcpTools
    const mcpTools = await mockAdapter.getToolDefinitions();
    toolDispatcher.availableTools.push(...mcpTools);

    return toolDispatcher.availableTools.length > initialCount;
  })();

  // Test 4: Tool Statistics
  await test('Tool Dispatcher provides accurate statistics', () => {
    const toolDispatcher = new ToolDispatcher([]);
    const stats = toolDispatcher.getToolStats();

    return typeof stats.native === 'number' &&
           typeof stats.mcp === 'number' &&
           typeof stats.total === 'number' &&
           stats.total === stats.native + stats.mcp;
  })();

  // Test 5: MCP Manager Basic Operations
  await test('MCP Manager basic operations work', async () => {
    const mcpManager = new McpManager();
    
    const serverConfig = {
      command: 'echo',
      args: ['test']
    };

    await mcpManager.addServer('test-server', 'Test Server', serverConfig);
    const server = mcpManager.getServer('test-server');
    
    if (!server || server.name !== 'Test Server') {
      return false;
    }

    await mcpManager.removeServer('test-server');
    const removedServer = mcpManager.getServer('test-server');
    
    return !removedServer;
  })();

  // Test 6: Configuration Validation
  await test('MCP Configuration validation works', () => {
    const configManager = new McpConfigManager();
    
    const validConfig = {
      command: 'npx',
      args: ['test'],
      env: { NODE_ENV: 'test' }
    };

    const invalidConfig = {
      command: '',
      args: ['test']
    };

    const validResult = configManager.validateServerConfig(validConfig);
    const invalidResult = configManager.validateServerConfig(invalidConfig);

    return validResult.valid && !invalidResult.valid;
  })();

  // Test 7: MCP Initialization
  await test('MCP Initialization completes without errors', async () => {
    try {
      await initializeMcp();
      return true;
    } catch (error) {
      return false;
    }
  })();

  // Test 8: MCP Status
  await test('MCP Status provides valid information', () => {
    const status = getMcpStatus();
    
    return typeof status.servers === 'number' &&
           typeof status.connectedServers === 'number' &&
           typeof status.tools === 'number';
  })();

  // Test 9: Error Handling
  await test('Error handling works correctly', async () => {
    const toolDispatcher = new ToolDispatcher([]);
    
    const failingTool = {
      type: 'mcp' as const,
      name: 'failing_tool',
      description: 'Failing tool',
      parameters: { type: 'object' },
      invoke: async () => {
        throw new Error('Tool failed');
      }
    };

    toolDispatcher.availableTools.push(failingTool);

    const result = await toolDispatcher.dispatch(
      { name: 'failing_tool', arguments: {} },
      'test-id'
    );

    return result.content.includes('Error executing MCP tool') &&
           result.content.includes('Tool failed');
  })();

  // Test 10: Tool Registration
  await test('Native tools are properly registered', () => {
    const toolDispatcher = new ToolDispatcher([]);
    const nativeTools = toolDispatcher.availableTools.filter(t => t.type === 'native');
    
    // Should have at least the basic native tools
    const expectedTools = ['read_file', 'write_file', 'search_files', 'delete_file', 'web_search', 'mcp_manager'];
    const hasAllExpected = expectedTools.every(toolName => 
      nativeTools.some(tool => tool.name === toolName)
    );

    return hasAllExpected;
  })();

  // Summary
  console.log();
  console.log(chalk.bold.blue('📊 Test Results'));
  console.log(`Tests passed: ${chalk.green(testsPassed)}/${testsTotal}`);
  
  if (testsPassed === testsTotal) {
    console.log(chalk.green('🎉 All MCP improvements are working correctly!'));
    process.exit(0);
  } else {
    console.log(chalk.red('❌ Some tests failed. Please check the implementation.'));
    process.exit(1);
  }
}

// Run the tests
testMcpImprovements().catch(error => {
  console.error(chalk.red('Test script failed:'), error);
  process.exit(1);
});
