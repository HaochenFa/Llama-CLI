#!/usr/bin/env node

/**
 * Integration Test Script for Enhanced CLI Features
 * Tests the integration of new CLI components with the main application
 */

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';

const TEST_TIMEOUT = 10000; // 10 seconds

class IntegrationTester {
  constructor() {
    this.results = [];
  }

  /**
   * Run all integration tests
   */
  async runTests() {
    console.log('🧪 Running LlamaCLI Integration Tests\n');

    const tests = [
      { name: 'Basic CLI Startup', test: () => this.testBasicStartup() },
      { name: 'Help Command', test: () => this.testHelpCommand() },
      { name: 'Version Command', test: () => this.testVersionCommand() },
      { name: 'Config List Command', test: () => this.testConfigListCommand() },
      { name: 'Interactive Mode Flag', test: () => this.testInteractiveFlag() },
    ];

    for (const testCase of tests) {
      console.log(`Running: ${testCase.name}...`);
      
      try {
        const startTime = performance.now();
        const result = await testCase.test();
        const duration = performance.now() - startTime;
        
        this.results.push({
          name: testCase.name,
          success: result.success,
          duration,
          message: result.message,
          output: result.output,
        });
        
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`  ${status} (${duration.toFixed(2)}ms): ${result.message}\n`);
        
      } catch (error) {
        this.results.push({
          name: testCase.name,
          success: false,
          duration: 0,
          message: error.message,
          output: '',
        });
        
        console.log(`  ❌ FAIL (error): ${error.message}\n`);
      }
    }

    this.printSummary();
  }

  /**
   * Test basic CLI startup
   */
  async testBasicStartup() {
    const result = await this.runCommand(['--help']);
    
    if (result.exitCode === 0) {
      return {
        success: true,
        message: 'CLI starts successfully',
        output: result.stdout,
      };
    } else {
      return {
        success: false,
        message: `CLI failed to start (exit code: ${result.exitCode})`,
        output: result.stderr,
      };
    }
  }

  /**
   * Test help command
   */
  async testHelpCommand() {
    const result = await this.runCommand(['--help']);
    
    if (result.exitCode === 0 && result.stdout.includes('llamacli')) {
      return {
        success: true,
        message: 'Help command works correctly',
        output: result.stdout,
      };
    } else {
      return {
        success: false,
        message: 'Help command failed or missing content',
        output: result.stderr,
      };
    }
  }

  /**
   * Test version command
   */
  async testVersionCommand() {
    const result = await this.runCommand(['--version']);
    
    if (result.exitCode === 0 && result.stdout.includes('1.0.0')) {
      return {
        success: true,
        message: 'Version command works correctly',
        output: result.stdout,
      };
    } else {
      return {
        success: false,
        message: 'Version command failed or missing version',
        output: result.stderr,
      };
    }
  }

  /**
   * Test config list command
   */
  async testConfigListCommand() {
    const result = await this.runCommand(['config', 'list']);
    
    if (result.exitCode === 0) {
      return {
        success: true,
        message: 'Config list command works',
        output: result.stdout,
      };
    } else {
      return {
        success: false,
        message: `Config list failed (exit code: ${result.exitCode})`,
        output: result.stderr,
      };
    }
  }

  /**
   * Test interactive mode flag
   */
  async testInteractiveFlag() {
    // This test just checks if the flag is recognized
    const result = await this.runCommand(['--help']);
    
    if (result.exitCode === 0 && result.stdout.includes('--interactive')) {
      return {
        success: true,
        message: 'Interactive flag is available',
        output: result.stdout,
      };
    } else {
      return {
        success: false,
        message: 'Interactive flag not found in help',
        output: result.stderr,
      };
    }
  }

  /**
   * Run a CLI command and return result
   */
  async runCommand(args) {
    return new Promise((resolve, reject) => {
      // Try to run the built version first, fallback to source
      const possiblePaths = [
        'packages/cli/dist/index.js',
        'packages/cli/src/index.ts'
      ];
      
      let commandPath = possiblePaths[0];
      let nodeArgs = ['node'];
      
      // If TypeScript file, use ts-node
      if (commandPath.endsWith('.ts')) {
        nodeArgs = ['npx', 'ts-node'];
      }
      
      const child = spawn(nodeArgs[0], [...nodeArgs.slice(1), commandPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
      });

      let stdout = '';
      let stderr = '';

      const timeout = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`Command timeout after ${TEST_TIMEOUT}ms`));
      }, TEST_TIMEOUT);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        resolve({
          exitCode: code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log('📊 Test Summary');
    console.log('================');
    
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const total = this.results.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`  - ${result.name}: ${result.message}`);
        });
    }
    
    console.log('\n📈 Performance:');
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;
    console.log(`Average Test Duration: ${avgDuration.toFixed(2)}ms`);
    
    const slowTests = this.results.filter(r => r.duration > 1000);
    if (slowTests.length > 0) {
      console.log('\n⚠️ Slow Tests (>1s):');
      slowTests.forEach(test => {
        console.log(`  - ${test.name}: ${test.duration.toFixed(2)}ms`);
      });
    }
    
    console.log('\n🎯 Integration Status:');
    if (failed === 0) {
      console.log('✅ All integration tests passed! CLI integration is working correctly.');
    } else {
      console.log('❌ Some integration tests failed. Please review the failures above.');
    }
    
    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run the tests
const tester = new IntegrationTester();
tester.runTests().catch(error => {
  console.error('❌ Integration test suite failed:', error);
  process.exit(1);
});
