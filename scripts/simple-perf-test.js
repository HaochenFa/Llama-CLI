#!/usr/bin/env node

/**
 * Simple Performance Test for LlamaCLI
 * Tests basic startup performance without full build
 */

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';

const TEST_ITERATIONS = 3;

async function measureStartupTime() {
  console.log('🚀 Testing LlamaCLI startup performance...\n');
  
  const results = [];
  
  for (let i = 0; i < TEST_ITERATIONS; i++) {
    console.log(`Iteration ${i + 1}/${TEST_ITERATIONS}...`);
    
    const startTime = performance.now();
    
    try {
      const result = await runCommand(['--help']);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      results.push({
        iteration: i + 1,
        duration,
        success: result.exitCode === 0,
        memoryUsage: result.memoryUsage,
      });
      
      console.log(`  Duration: ${duration.toFixed(2)}ms`);
      console.log(`  Memory: ${(result.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Status: ${result.success ? '✅' : '❌'}\n`);
      
    } catch (error) {
      console.log(`  Error: ${error.message}\n`);
      results.push({
        iteration: i + 1,
        duration: 0,
        success: false,
        error: error.message,
      });
    }
    
    // Wait between iterations
    await sleep(1000);
  }
  
  // Calculate averages
  const successfulResults = results.filter(r => r.success);
  
  if (successfulResults.length > 0) {
    const avgDuration = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
    const avgMemory = successfulResults.reduce((sum, r) => sum + r.memoryUsage, 0) / successfulResults.length;
    
    console.log('📊 Performance Summary:');
    console.log(`  Average startup time: ${avgDuration.toFixed(2)}ms`);
    console.log(`  Average memory usage: ${(avgMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Success rate: ${successfulResults.length}/${TEST_ITERATIONS}`);
    
    // Performance assessment
    console.log('\n🎯 Performance Assessment:');
    
    if (avgDuration < 1000) {
      console.log(`  Startup time: ✅ Good (${avgDuration.toFixed(2)}ms < 1000ms)`);
    } else if (avgDuration < 2000) {
      console.log(`  Startup time: ⚠️ Fair (${avgDuration.toFixed(2)}ms < 2000ms)`);
    } else {
      console.log(`  Startup time: ❌ Poor (${avgDuration.toFixed(2)}ms >= 2000ms)`);
    }
    
    if (avgMemory < 200 * 1024 * 1024) {
      console.log(`  Memory usage: ✅ Good (${(avgMemory / 1024 / 1024).toFixed(2)}MB < 200MB)`);
    } else if (avgMemory < 300 * 1024 * 1024) {
      console.log(`  Memory usage: ⚠️ Fair (${(avgMemory / 1024 / 1024).toFixed(2)}MB < 300MB)`);
    } else {
      console.log(`  Memory usage: ❌ Poor (${(avgMemory / 1024 / 1024).toFixed(2)}MB >= 300MB)`);
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (avgDuration >= 1000) {
      console.log('  - Implement lazy loading for modules');
      console.log('  - Optimize configuration loading');
      console.log('  - Use dynamic imports where possible');
    }
    
    if (avgMemory >= 200 * 1024 * 1024) {
      console.log('  - Implement memory caching with limits');
      console.log('  - Optimize data structures');
      console.log('  - Add garbage collection optimization');
    }
    
    if (successfulResults.length < TEST_ITERATIONS) {
      console.log('  - Fix startup errors and improve reliability');
    }
    
  } else {
    console.log('❌ All tests failed. Cannot generate performance report.');
  }
}

function runCommand(args) {
  return new Promise((resolve, reject) => {
    const startMemory = process.memoryUsage();
    
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
      reject(new Error('Command timeout after 10 seconds'));
    }, 10000);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      
      const endMemory = process.memoryUsage();
      
      resolve({
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        memoryUsage: endMemory.rss,
        success: code === 0,
      });
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test
measureStartupTime().catch(error => {
  console.error('❌ Performance test failed:', error);
  process.exit(1);
});
