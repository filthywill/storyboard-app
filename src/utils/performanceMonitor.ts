// Performance monitoring utilities for shot operations
// Tracks operation timing, renumbering efficiency, and provides performance insights

import { renumberingOptimizer } from './renumberingOptimizer';

interface OperationTimer {
  startTime: number;
  operation: string;
  shotCount?: number;
}

interface PerformanceMetrics {
  averageOperationTime: number;
  totalOperations: number;
  renumberingEfficiency: number; // percentage of operations that triggered renumbering
  batchEfficiency: number; // percentage of renumbering calls that were batched
  peakShotCount: number;
  slowestOperation: {
    operation: string;
    duration: number;
    shotCount: number;
  } | null;
}

class PerformanceMonitor {
  private timers: Map<string, OperationTimer> = new Map();
  private completedOperations: Array<{
    operation: string;
    duration: number;
    shotCount: number;
    timestamp: number;
  }> = [];
  private maxOperationHistory = 1000;

  /**
   * Start timing an operation
   */
  startOperation(operationId: string, operation: string, shotCount?: number): void {
    this.timers.set(operationId, {
      startTime: performance.now(),
      operation,
      shotCount
    });
  }

  /**
   * End timing an operation and record the metrics
   */
  endOperation(operationId: string, shotCount?: number): number {
    const timer = this.timers.get(operationId);
    if (!timer) {
      return 0;
    }

    const duration = performance.now() - timer.startTime;
    const finalShotCount = shotCount ?? timer.shotCount ?? 0;

    // Record the completed operation
    this.completedOperations.push({
      operation: timer.operation,
      duration,
      shotCount: finalShotCount,
      timestamp: Date.now()
    });

    // Maintain operation history limit
    if (this.completedOperations.length > this.maxOperationHistory) {
      this.completedOperations.shift();
    }

    this.timers.delete(operationId);
    return duration;
  }

  /**
   * Get comprehensive performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const renumberingStats = renumberingOptimizer.getStats();
    
    if (this.completedOperations.length === 0) {
      return {
        averageOperationTime: 0,
        totalOperations: 0,
        renumberingEfficiency: 0,
        batchEfficiency: 0,
        peakShotCount: 0,
        slowestOperation: null
      };
    }

    const totalDuration = this.completedOperations.reduce((sum, op) => sum + op.duration, 0);
    const averageOperationTime = totalDuration / this.completedOperations.length;
    
    const peakShotCount = Math.max(...this.completedOperations.map(op => op.shotCount));
    
    const slowestOperation = this.completedOperations.reduce((slowest, current) => {
      if (!slowest || current.duration > slowest.duration) {
        return current;
      }
      return slowest;
    }, null as any);

    // Calculate efficiency metrics
    const renumberingEfficiency = renumberingStats.totalCalls > 0 
      ? (renumberingStats.batchedCalls / renumberingStats.totalCalls) * 100 
      : 0;

    const batchEfficiency = renumberingStats.totalCalls > 0 
      ? ((renumberingStats.totalCalls - renumberingStats.batchedCalls) / renumberingStats.totalCalls) * 100 
      : 0;

    return {
      averageOperationTime,
      totalOperations: this.completedOperations.length,
      renumberingEfficiency,
      batchEfficiency,
      peakShotCount,
      slowestOperation: slowestOperation ? {
        operation: slowestOperation.operation,
        duration: slowestOperation.duration,
        shotCount: slowestOperation.shotCount
      } : null
    };
  }

  /**
   * Get recent operation history
   */
  getRecentOperations(count: number = 10): Array<{
    operation: string;
    duration: number;
    shotCount: number;
    timestamp: number;
  }> {
    return this.completedOperations
      .slice(-count)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get operations by type
   */
  getOperationsByType(operationType: string): Array<{
    operation: string;
    duration: number;
    shotCount: number;
    timestamp: number;
  }> {
    return this.completedOperations.filter(op => 
      op.operation.toLowerCase().includes(operationType.toLowerCase())
    );
  }

  /**
   * Clear all recorded metrics
   */
  reset(): void {
    this.timers.clear();
    this.completedOperations = [];
    renumberingOptimizer.resetStats();
  }

  /**
   * Generate a performance report
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const renumberingStats = renumberingOptimizer.getStats();
    
    return `
📊 Shot Operations Performance Report
=====================================

🔢 Total Operations: ${metrics.totalOperations}
⏱️  Average Operation Time: ${metrics.averageOperationTime.toFixed(2)}ms
🎯 Peak Shot Count: ${metrics.peakShotCount}

🔄 Renumbering Efficiency:
  • Total Renumber Calls: ${renumberingStats.totalCalls}
  • Batched Calls: ${renumberingStats.batchedCalls}
  • Batch Efficiency: ${metrics.batchEfficiency.toFixed(1)}%
  • Average Delay: ${renumberingStats.averageDelay.toFixed(2)}ms

🐌 Slowest Operation:
  ${metrics.slowestOperation ? 
    `• ${metrics.slowestOperation.operation}: ${metrics.slowestOperation.duration.toFixed(2)}ms (${metrics.slowestOperation.shotCount} shots)` :
    '• No operations recorded'
  }

💡 Performance Tips:
  ${metrics.batchEfficiency < 80 ? '• Consider using batch operations for bulk changes' : '✅ Good batching efficiency'}
  ${metrics.averageOperationTime > 50 ? '• Some operations are taking longer than expected' : '✅ Good operation performance'}
  ${renumberingStats.averageDelay > 100 ? '• Consider increasing debounce delay for better batching' : '✅ Good debounce timing'}
`;
  }

  /**
   * Log performance metrics to console (development only)
   */
  logMetrics(): void {
    if (process.env.NODE_ENV !== 'development') return;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Convenience wrapper for timing operations
export const withPerformanceMonitoring = <T extends (...args: any[]) => any>(
  operation: T,
  operationName: string,
  getShotCount?: () => number
): T => {
  return ((...args: any[]) => {
    const operationId = `${operationName}_${Date.now()}_${Math.random()}`;
    const shotCount = getShotCount?.();
    
    performanceMonitor.startOperation(operationId, operationName, shotCount);
    
    try {
      const result = operation(...args);
      
      // Handle both sync and async operations
      if (result instanceof Promise) {
        return result.finally(() => {
          performanceMonitor.endOperation(operationId, getShotCount?.());
        });
      } else {
        performanceMonitor.endOperation(operationId, getShotCount?.());
        return result;
      }
    } catch (error) {
      performanceMonitor.endOperation(operationId, getShotCount?.());
      throw error;
    }
  }) as T;
};

// Hook for React components to access performance metrics
export const usePerformanceMetrics = () => {
  return {
    getMetrics: () => performanceMonitor.getMetrics(),
    getRecentOperations: (count?: number) => performanceMonitor.getRecentOperations(count),
    generateReport: () => performanceMonitor.generateReport(),
    logMetrics: () => performanceMonitor.logMetrics(),
    reset: () => performanceMonitor.reset(),
  };
}; 