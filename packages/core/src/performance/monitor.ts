/**
 * Performance Monitor for LlamaCLI
 * Provides real-time performance monitoring and optimization suggestions
 */

import { EventEmitter } from "events";
import { performance, PerformanceObserver } from "perf_hooks";
import { memoryUsage } from "process";

export interface PerformanceThresholds {
  startupTime: number;
  memoryUsage: number;
  responseTime: number;
  toolExecutionTime: number;
}

export interface PerformanceAlert {
  type: "warning" | "error" | "info";
  metric: string;
  current: number;
  threshold: number;
  message: string;
  suggestions: string[];
  timestamp: number;
}

export interface PerformanceStats {
  averageStartupTime: number;
  averageMemoryUsage: number;
  averageResponseTime: number;
  peakMemoryUsage: number;
  totalRequests: number;
  slowRequests: number;
  memoryLeaks: boolean;
  lastGC: number;
}

export class PerformanceMonitor extends EventEmitter {
  private thresholds: PerformanceThresholds;
  private stats: PerformanceStats;
  private measurements: Map<string, number[]> = new Map();
  private memoryHistory: number[] = [];
  private gcObserver: PerformanceObserver | null = null;
  private isMonitoring: boolean = false;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    super();

    this.thresholds = {
      startupTime: 1000, // 1 second
      memoryUsage: 200 * 1024 * 1024, // 200MB
      responseTime: 2000, // 2 seconds
      toolExecutionTime: 5000, // 5 seconds
      ...thresholds,
    };

    this.stats = {
      averageStartupTime: 0,
      averageMemoryUsage: 0,
      averageResponseTime: 0,
      peakMemoryUsage: 0,
      totalRequests: 0,
      slowRequests: 0,
      memoryLeaks: false,
      lastGC: 0,
    };

    this.initializeGCObserver();
  }

  /**
   * Start monitoring performance
   */
  start(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.startMemoryMonitoring();
    this.emit("monitoringStarted");
  }

  /**
   * Stop monitoring performance
   */
  stop(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.gcObserver) {
      this.gcObserver.disconnect();
    }
    this.emit("monitoringStopped");
  }

  /**
   * Record a measurement
   */
  recordMeasurement(metric: string, value: number): void {
    if (!this.measurements.has(metric)) {
      this.measurements.set(metric, []);
    }

    const measurements = this.measurements.get(metric)!;
    measurements.push(value);

    // Keep only last 100 measurements
    if (measurements.length > 100) {
      measurements.shift();
    }

    this.checkThresholds(metric, value);
    this.updateStats(metric, value);
  }

  /**
   * Check if measurement exceeds thresholds
   */
  private checkThresholds(metric: string, value: number): void {
    let threshold: number | null = null;
    let suggestions: string[] = [];

    switch (metric) {
      case "startupTime":
        threshold = this.thresholds.startupTime;
        suggestions = [
          "Enable lazy loading for adapters",
          "Optimize configuration loading",
          "Reduce initial module imports",
          "Use dynamic imports where possible",
        ];
        break;
      case "memoryUsage":
        threshold = this.thresholds.memoryUsage;
        suggestions = [
          "Implement memory caching with limits",
          "Clear unused session data",
          "Optimize context storage",
          "Force garbage collection periodically",
        ];
        break;
      case "responseTime":
        threshold = this.thresholds.responseTime;
        suggestions = [
          "Implement request caching",
          "Optimize LLM adapter performance",
          "Use streaming responses",
          "Reduce context size",
        ];
        break;
      case "toolExecutionTime":
        threshold = this.thresholds.toolExecutionTime;
        suggestions = [
          "Optimize tool implementations",
          "Add timeout handling",
          "Use parallel execution where possible",
          "Cache tool results",
        ];
        break;
    }

    if (threshold && value > threshold) {
      const alert: PerformanceAlert = {
        type: value > threshold * 1.5 ? "error" : "warning",
        metric,
        current: value,
        threshold,
        message: `${metric} (${value.toFixed(2)}) exceeds threshold (${threshold})`,
        suggestions,
        timestamp: Date.now(),
      };

      this.emit("performanceAlert", alert);
    }
  }

  /**
   * Update performance statistics
   */
  private updateStats(metric: string, value: number): void {
    const measurements = this.measurements.get(metric) || [];

    switch (metric) {
      case "startupTime":
        this.stats.averageStartupTime = this.calculateAverage(measurements);
        break;
      case "memoryUsage":
        this.stats.averageMemoryUsage = this.calculateAverage(measurements);
        this.stats.peakMemoryUsage = Math.max(this.stats.peakMemoryUsage, value);
        break;
      case "responseTime":
        this.stats.averageResponseTime = this.calculateAverage(measurements);
        this.stats.totalRequests++;
        if (value > this.thresholds.responseTime) {
          this.stats.slowRequests++;
        }
        break;
    }
  }

  /**
   * Calculate average of measurements
   */
  private calculateAverage(measurements: number[]): number {
    if (measurements.length === 0) return 0;
    return measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    const interval = setInterval(() => {
      if (!this.isMonitoring) {
        clearInterval(interval);
        return;
      }

      const memory = memoryUsage();
      this.recordMeasurement("memoryUsage", memory.rss);
      this.memoryHistory.push(memory.heapUsed);

      // Keep only last 50 memory measurements
      if (this.memoryHistory.length > 50) {
        this.memoryHistory.shift();
      }

      // Check for memory leaks
      this.detectMemoryLeaks();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Detect potential memory leaks
   */
  private detectMemoryLeaks(): void {
    if (this.memoryHistory.length < 10) return;

    const recent = this.memoryHistory.slice(-10);
    const older = this.memoryHistory.slice(-20, -10);

    if (older.length === 0) return;

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;

    // If memory usage increased by more than 20% consistently
    if (recentAvg > olderAvg * 1.2) {
      this.stats.memoryLeaks = true;
      this.emit("memoryLeakDetected", {
        recentAverage: recentAvg,
        olderAverage: olderAvg,
        increase: ((recentAvg - olderAvg) / olderAvg) * 100,
      });
    }
  }

  /**
   * Initialize garbage collection observer
   */
  private initializeGCObserver(): void {
    try {
      this.gcObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.entryType === "gc") {
            this.stats.lastGC = Date.now();
            this.emit("garbageCollection", {
              duration: entry.duration,
              kind: (entry as any).detail?.kind,
            });
          }
        }
      });

      this.gcObserver.observe({ entryTypes: ["gc"] });
    } catch (error) {
      // GC observer not available in all environments
      console.debug("GC observer not available:", error);
    }
  }

  /**
   * Get current performance statistics
   */
  getStats(): PerformanceStats {
    return { ...this.stats };
  }

  /**
   * Get measurements for a specific metric
   */
  getMeasurements(metric: string): number[] {
    return [...(this.measurements.get(metric) || [])];
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.getStats();

    if (stats.averageStartupTime > this.thresholds.startupTime) {
      recommendations.push("Optimize startup time by implementing lazy loading");
    }

    if (stats.averageMemoryUsage > this.thresholds.memoryUsage) {
      recommendations.push("Reduce memory usage by implementing better caching strategies");
    }

    if (stats.slowRequests / Math.max(stats.totalRequests, 1) > 0.1) {
      recommendations.push("Optimize response times - more than 10% of requests are slow");
    }

    if (stats.memoryLeaks) {
      recommendations.push("Investigate potential memory leaks in session management");
    }

    if (recommendations.length === 0) {
      recommendations.push("Performance is within acceptable thresholds");
    }

    return recommendations;
  }

  /**
   * Force garbage collection (if available)
   */
  forceGC(): boolean {
    if (global.gc) {
      global.gc();
      return true;
    }
    return false;
  }
}

// Global monitor instance
export const performanceMonitor = new PerformanceMonitor();
