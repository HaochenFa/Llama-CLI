/**
 * Performance Benchmark and Analysis Tool for LlamaCLI
 * Measures startup time, memory usage, and other performance metrics
 */

import { performance } from 'perf_hooks';
import { memoryUsage } from 'process';
import { EventEmitter } from 'events';

export interface PerformanceMetrics {
  startupTime: number;
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  };
  moduleLoadTime: number;
  configLoadTime: number;
  adapterInitTime: number;
  toolRegistrationTime: number;
  timestamp: number;
}

export interface BenchmarkResult {
  name: string;
  duration: number;
  memoryBefore: NodeJS.MemoryUsage;
  memoryAfter: NodeJS.MemoryUsage;
  memoryDelta: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  };
  timestamp: number;
}

export class PerformanceBenchmark extends EventEmitter {
  private startTime: number = 0;
  private benchmarks: Map<string, { start: number; memoryStart: NodeJS.MemoryUsage }> = new Map();
  private results: BenchmarkResult[] = [];
  private metrics: PerformanceMetrics | null = null;

  constructor() {
    super();
    this.startTime = performance.now();
  }

  /**
   * Start a benchmark measurement
   */
  start(name: string): void {
    const memoryStart = memoryUsage();
    this.benchmarks.set(name, {
      start: performance.now(),
      memoryStart,
    });
    this.emit('benchmarkStart', name);
  }

  /**
   * End a benchmark measurement
   */
  end(name: string): BenchmarkResult | null {
    const benchmark = this.benchmarks.get(name);
    if (!benchmark) {
      console.warn(`Benchmark '${name}' was not started`);
      return null;
    }

    const endTime = performance.now();
    const memoryAfter = memoryUsage();
    const duration = endTime - benchmark.start;

    const result: BenchmarkResult = {
      name,
      duration,
      memoryBefore: benchmark.memoryStart,
      memoryAfter,
      memoryDelta: {
        rss: memoryAfter.rss - benchmark.memoryStart.rss,
        heapUsed: memoryAfter.heapUsed - benchmark.memoryStart.heapUsed,
        heapTotal: memoryAfter.heapTotal - benchmark.memoryStart.heapTotal,
        external: memoryAfter.external - benchmark.memoryStart.external,
        arrayBuffers: memoryAfter.arrayBuffers - benchmark.memoryStart.arrayBuffers,
      },
      timestamp: Date.now(),
    };

    this.results.push(result);
    this.benchmarks.delete(name);
    this.emit('benchmarkEnd', name, result);

    return result;
  }

  /**
   * Measure a function execution
   */
  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Measure synchronous function execution
   */
  measureSync<T>(name: string, fn: () => T): T {
    this.start(name);
    try {
      const result = fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    const currentMemory = memoryUsage();
    const totalTime = performance.now() - this.startTime;

    return {
      startupTime: totalTime,
      memoryUsage: currentMemory,
      moduleLoadTime: this.getResultDuration('moduleLoad') || 0,
      configLoadTime: this.getResultDuration('configLoad') || 0,
      adapterInitTime: this.getResultDuration('adapterInit') || 0,
      toolRegistrationTime: this.getResultDuration('toolRegistration') || 0,
      timestamp: Date.now(),
    };
  }

  /**
   * Get all benchmark results
   */
  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  /**
   * Get result duration by name
   */
  private getResultDuration(name: string): number | null {
    const result = this.results.find(r => r.name === name);
    return result ? result.duration : null;
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const metrics = this.getCurrentMetrics();
    const results = this.getResults();

    let report = '# LlamaCLI Performance Report\n\n';
    report += `Generated at: ${new Date().toISOString()}\n\n`;

    // Overall metrics
    report += '## Overall Metrics\n\n';
    report += `- **Total Startup Time**: ${metrics.startupTime.toFixed(2)}ms\n`;
    report += `- **Memory Usage (RSS)**: ${(metrics.memoryUsage.rss / 1024 / 1024).toFixed(2)}MB\n`;
    report += `- **Heap Used**: ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB\n`;
    report += `- **Heap Total**: ${(metrics.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB\n\n`;

    // Component breakdown
    report += '## Component Performance\n\n';
    report += '| Component | Duration (ms) | Memory Delta (MB) |\n';
    report += '|-----------|---------------|-------------------|\n';

    results.forEach(result => {
      const memoryDeltaMB = (result.memoryDelta.heapUsed / 1024 / 1024).toFixed(2);
      report += `| ${result.name} | ${result.duration.toFixed(2)} | ${memoryDeltaMB} |\n`;
    });

    report += '\n';

    // Performance targets
    report += '## Performance Targets\n\n';
    report += '| Metric | Current | Target | Status |\n';
    report += '|--------|---------|--------|---------|\n';
    report += `| Startup Time | ${metrics.startupTime.toFixed(2)}ms | <1000ms | ${metrics.startupTime < 1000 ? '✅' : '❌'} |\n`;
    report += `| Memory Usage | ${(metrics.memoryUsage.rss / 1024 / 1024).toFixed(2)}MB | <200MB | ${(metrics.memoryUsage.rss / 1024 / 1024) < 200 ? '✅' : '❌'} |\n`;

    return report;
  }

  /**
   * Save metrics to file
   */
  async saveMetrics(filePath: string): Promise<void> {
    const fs = await import('fs/promises');
    const metrics = this.getCurrentMetrics();
    const data = {
      metrics,
      results: this.results,
      report: this.generateReport(),
    };
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Clear all results
   */
  clear(): void {
    this.results = [];
    this.benchmarks.clear();
    this.startTime = performance.now();
  }
}

// Global benchmark instance
export const benchmark = new PerformanceBenchmark();

// Utility functions for common measurements
export function measureStartup(): void {
  benchmark.start('startup');
}

export function measureModuleLoad(): void {
  benchmark.start('moduleLoad');
}

export function measureConfigLoad(): void {
  benchmark.start('configLoad');
}

export function measureAdapterInit(): void {
  benchmark.start('adapterInit');
}

export function measureToolRegistration(): void {
  benchmark.start('toolRegistration');
}
