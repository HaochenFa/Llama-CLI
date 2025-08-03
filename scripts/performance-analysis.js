#!/usr/bin/env node

/**
 * Performance Analysis Script for LlamaCLI
 * Measures startup time, memory usage, and identifies bottlenecks
 */

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Performance test configuration
const TEST_CONFIG = {
  iterations: 5,
  commands: [
    { name: 'help', args: ['--help'] },
    { name: 'version', args: ['--version'] },
    { name: 'config-list', args: ['config', 'list'] },
  ],
  timeout: 30000, // 30 seconds
};

class PerformanceAnalyzer {
  constructor() {
    this.results = [];
    this.startTime = performance.now();
  }

  /**
   * Run performance analysis
   */
  async analyze() {
    console.log('🚀 Starting LlamaCLI Performance Analysis...\n');
    
    // Test startup performance
    await this.testStartupPerformance();
    
    // Test command performance
    await this.testCommandPerformance();
    
    // Generate report
    this.generateReport();
    
    console.log('\n✅ Performance analysis completed!');
  }

  /**
   * Test startup performance
   */
  async testStartupPerformance() {
    console.log('📊 Testing startup performance...');
    
    const startupResults = [];
    
    for (let i = 0; i < TEST_CONFIG.iterations; i++) {
      console.log(`  Iteration ${i + 1}/${TEST_CONFIG.iterations}`);
      
      const result = await this.measureCommand(['--help']);
      startupResults.push(result);
      
      // Wait between iterations to avoid interference
      await this.sleep(1000);
    }
    
    const avgStartupTime = startupResults.reduce((sum, r) => sum + r.duration, 0) / startupResults.length;
    const avgMemoryUsage = startupResults.reduce((sum, r) => sum + r.memoryUsage, 0) / startupResults.length;
    
    console.log(`  Average startup time: ${avgStartupTime.toFixed(2)}ms`);
    console.log(`  Average memory usage: ${(avgMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
    
    this.results.push({
      category: 'startup',
      results: startupResults,
      average: {
        duration: avgStartupTime,
        memoryUsage: avgMemoryUsage,
      },
    });
  }

  /**
   * Test command performance
   */
  async testCommandPerformance() {
    console.log('\n📊 Testing command performance...');
    
    for (const command of TEST_CONFIG.commands) {
      console.log(`  Testing: llamacli ${command.args.join(' ')}`);
      
      const commandResults = [];
      
      for (let i = 0; i < Math.min(3, TEST_CONFIG.iterations); i++) {
        const result = await this.measureCommand(command.args);
        commandResults.push(result);
        await this.sleep(500);
      }
      
      const avgDuration = commandResults.reduce((sum, r) => sum + r.duration, 0) / commandResults.length;
      console.log(`    Average time: ${avgDuration.toFixed(2)}ms`);
      
      this.results.push({
        category: 'command',
        name: command.name,
        results: commandResults,
        average: {
          duration: avgDuration,
        },
      });
    }
  }

  /**
   * Measure command execution
   */
  async measureCommand(args) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const startMemory = process.memoryUsage();
      
      const child = spawn('node', ['packages/cli/src/index.js', ...args], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'production',
        },
      });

      let stdout = '';
      let stderr = '';
      let hasExited = false;

      const timeout = setTimeout(() => {
        if (!hasExited) {
          child.kill('SIGKILL');
          reject(new Error(`Command timeout after ${TEST_CONFIG.timeout}ms`));
        }
      }, TEST_CONFIG.timeout);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        hasExited = true;
        clearTimeout(timeout);
        
        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        
        const result = {
          duration: endTime - startTime,
          memoryUsage: endMemory.rss,
          exitCode: code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          timestamp: Date.now(),
        };
        
        if (code === 0 || args.includes('--help') || args.includes('--version')) {
          resolve(result);
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        hasExited = true;
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const report = this.createReport();
    
    // Ensure reports directory exists
    const reportsDir = join(projectRoot, 'reports');
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = join(reportsDir, `performance-${timestamp}.json`);
    const markdownPath = join(reportsDir, `performance-${timestamp}.md`);
    
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    writeFileSync(markdownPath, this.createMarkdownReport(report));
    
    console.log(`\n📄 Reports saved:`);
    console.log(`  JSON: ${reportPath}`);
    console.log(`  Markdown: ${markdownPath}`);
    
    // Print summary
    this.printSummary(report);
  }

  /**
   * Create performance report
   */
  createReport() {
    const startupData = this.results.find(r => r.category === 'startup');
    const commandData = this.results.filter(r => r.category === 'command');
    
    return {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        totalMemory: require('os').totalmem(),
        cpus: require('os').cpus().length,
      },
      configuration: TEST_CONFIG,
      results: {
        startup: startupData,
        commands: commandData,
      },
      analysis: this.analyzeResults(),
    };
  }

  /**
   * Analyze results and provide recommendations
   */
  analyzeResults() {
    const startupData = this.results.find(r => r.category === 'startup');
    const analysis = {
      issues: [],
      recommendations: [],
      scores: {},
    };

    if (startupData) {
      const avgStartup = startupData.average.duration;
      const avgMemory = startupData.average.memoryUsage / 1024 / 1024; // MB

      // Startup time analysis
      if (avgStartup > 2000) {
        analysis.issues.push(`Slow startup time: ${avgStartup.toFixed(2)}ms (target: <1000ms)`);
        analysis.recommendations.push('Implement lazy loading for modules and adapters');
        analysis.recommendations.push('Optimize configuration loading process');
        analysis.scores.startup = 'poor';
      } else if (avgStartup > 1000) {
        analysis.issues.push(`Moderate startup time: ${avgStartup.toFixed(2)}ms (target: <1000ms)`);
        analysis.recommendations.push('Consider optimizing module imports');
        analysis.scores.startup = 'fair';
      } else {
        analysis.scores.startup = 'good';
      }

      // Memory usage analysis
      if (avgMemory > 300) {
        analysis.issues.push(`High memory usage: ${avgMemory.toFixed(2)}MB (target: <200MB)`);
        analysis.recommendations.push('Implement memory optimization strategies');
        analysis.recommendations.push('Review and optimize data structures');
        analysis.scores.memory = 'poor';
      } else if (avgMemory > 200) {
        analysis.issues.push(`Moderate memory usage: ${avgMemory.toFixed(2)}MB (target: <200MB)`);
        analysis.recommendations.push('Consider memory usage optimizations');
        analysis.scores.memory = 'fair';
      } else {
        analysis.scores.memory = 'good';
      }
    }

    return analysis;
  }

  /**
   * Create markdown report
   */
  createMarkdownReport(report) {
    let markdown = '# LlamaCLI Performance Analysis Report\n\n';
    markdown += `**Generated:** ${report.timestamp}\n\n`;
    
    // Environment info
    markdown += '## Environment\n\n';
    markdown += `- **Node.js:** ${report.environment.nodeVersion}\n`;
    markdown += `- **Platform:** ${report.environment.platform} (${report.environment.arch})\n`;
    markdown += `- **CPUs:** ${report.environment.cpus}\n`;
    markdown += `- **Total Memory:** ${(report.environment.totalMemory / 1024 / 1024 / 1024).toFixed(2)}GB\n\n`;
    
    // Startup performance
    if (report.results.startup) {
      const startup = report.results.startup;
      markdown += '## Startup Performance\n\n';
      markdown += `- **Average Time:** ${startup.average.duration.toFixed(2)}ms\n`;
      markdown += `- **Average Memory:** ${(startup.average.memoryUsage / 1024 / 1024).toFixed(2)}MB\n`;
      markdown += `- **Iterations:** ${startup.results.length}\n\n`;
    }
    
    // Analysis
    if (report.analysis.issues.length > 0) {
      markdown += '## Issues Found\n\n';
      report.analysis.issues.forEach(issue => {
        markdown += `- ⚠️ ${issue}\n`;
      });
      markdown += '\n';
    }
    
    if (report.analysis.recommendations.length > 0) {
      markdown += '## Recommendations\n\n';
      report.analysis.recommendations.forEach(rec => {
        markdown += `- 💡 ${rec}\n`;
      });
      markdown += '\n';
    }
    
    return markdown;
  }

  /**
   * Print summary to console
   */
  printSummary(report) {
    console.log('\n📊 Performance Summary:');
    
    if (report.results.startup) {
      const startup = report.results.startup;
      const score = report.analysis.scores.startup || 'unknown';
      const scoreEmoji = score === 'good' ? '✅' : score === 'fair' ? '⚠️' : '❌';
      
      console.log(`  Startup Time: ${startup.average.duration.toFixed(2)}ms ${scoreEmoji}`);
      console.log(`  Memory Usage: ${(startup.average.memoryUsage / 1024 / 1024).toFixed(2)}MB ${report.analysis.scores.memory === 'good' ? '✅' : report.analysis.scores.memory === 'fair' ? '⚠️' : '❌'}`);
    }
    
    if (report.analysis.issues.length > 0) {
      console.log('\n⚠️ Issues to address:');
      report.analysis.issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    if (report.analysis.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.analysis.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run analysis if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new PerformanceAnalyzer();
  analyzer.analyze().catch(error => {
    console.error('❌ Performance analysis failed:', error);
    process.exit(1);
  });
}
