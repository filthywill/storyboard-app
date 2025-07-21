/**
 * Memory monitoring utilities for development and debugging
 * Helps track memory usage and detect potential leaks
 */

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface MemorySnapshot {
  timestamp: number;
  memory: MemoryInfo | null;
  activeObjectURLs: number;
  activeCanvases: number;
  customMetrics: Record<string, any>;
}

interface TrackedObjectURL {
  url: string;
  id?: string;
  createdAt: number;
}

interface TrackedCanvas {
  canvas: HTMLCanvasElement;
  context?: CanvasRenderingContext2D | null;
  id?: string;
  dimensions: { width: number; height: number };
  createdAt: number;
  lastResized?: number;
}

class MemoryMonitor {
  private snapshots: MemorySnapshot[] = [];
  private isMonitoring = false;
  private monitoringInterval: number | null = null;
  private maxSnapshots = 100;
  private trackedObjectURLs: Map<string, TrackedObjectURL> = new Map();
  private trackedCanvases: Map<string, TrackedCanvas> = new Map();
  private canvasCounter = 0;
  private objectURLCounter = 0;

  constructor() {
    // Only enable in development
    this.isMonitoring = process.env.NODE_ENV === 'development';
    
    // Register as global memory monitor if in development
    if (this.isMonitoring && typeof window !== 'undefined') {
      window.__memoryMonitor = {
        trackObjectURL: this.trackObjectURL.bind(this),
        untrackObjectURL: this.untrackObjectURL.bind(this),
        trackCanvas: this.trackCanvas.bind(this),
        untrackCanvas: this.untrackCanvas.bind(this),
        trackCanvasResize: this.trackCanvasResize.bind(this)
      };
    }
  }

  /**
   * Get current memory information
   */
  getCurrentMemoryInfo(): MemoryInfo | null {
    if (!this.isSupported()) {
      return null;
    }

    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit
    };
  }

  /**
   * Check if memory monitoring is supported
   */
  isSupported(): boolean {
    return typeof (performance as any).memory !== 'undefined';
  }

  /**
   * Track an ObjectURL to monitor for potential leaks
   */
  trackObjectURL(url: string, id?: string): void {
    if (!this.isMonitoring) return;
    
    const trackingId = id || `objecturl_${this.objectURLCounter++}`;
    
    this.trackedObjectURLs.set(url, {
      url,
      id: trackingId,
      createdAt: Date.now()
    });
  }
  
  /**
   * Stop tracking an ObjectURL (when revoked)
   */
  untrackObjectURL(url: string, id?: string): void {
    if (!this.isMonitoring) return;
    
    this.trackedObjectURLs.delete(url);
  }
  
  /**
   * Track a canvas element to monitor for potential leaks
   */
  trackCanvas(canvas: HTMLCanvasElement, context?: CanvasRenderingContext2D | null, id?: string): void {
    if (!this.isMonitoring || !canvas) return;
    
    const trackingId = id || `canvas_${this.canvasCounter++}`;
    const canvasKey = this.getCanvasKey(canvas, trackingId);
    
    this.trackedCanvases.set(canvasKey, {
      canvas,
      context: context || null,
      id: trackingId,
      dimensions: {
        width: canvas.width,
        height: canvas.height
      },
      createdAt: Date.now()
    });
  }
  
  /**
   * Stop tracking a canvas element
   */
  untrackCanvas(canvas: HTMLCanvasElement, id?: string): void {
    if (!this.isMonitoring || !canvas) return;
    
    // If ID is provided, use it for lookup
    if (id) {
      const canvasKey = this.getCanvasKey(canvas, id);
      this.trackedCanvases.delete(canvasKey);
      return;
    }
    
    // Otherwise, find by canvas reference
    for (const [key, tracked] of this.trackedCanvases.entries()) {
      if (tracked.canvas === canvas) {
        this.trackedCanvases.delete(key);
        return;
      }
    }
  }
  
  /**
   * Track canvas resize operations
   */
  trackCanvasResize(canvas: HTMLCanvasElement, width: number, height: number, id?: string): void {
    if (!this.isMonitoring || !canvas) return;
    
    // Find the canvas entry
    let canvasKey: string | undefined;
    
    if (id) {
      canvasKey = this.getCanvasKey(canvas, id);
    } else {
      // Find by reference
      for (const [key, tracked] of this.trackedCanvases.entries()) {
        if (tracked.canvas === canvas) {
          canvasKey = key;
          break;
        }
      }
    }
    
    // Update dimensions if found
    if (canvasKey && this.trackedCanvases.has(canvasKey)) {
      const tracked = this.trackedCanvases.get(canvasKey)!;
      tracked.dimensions = { width, height };
      tracked.lastResized = Date.now();
      this.trackedCanvases.set(canvasKey, tracked);
    }
  }
  
  /**
   * Generate a unique key for a canvas
   */
  private getCanvasKey(canvas: HTMLCanvasElement, id: string): string {
    return `${id}_${canvas.width}x${canvas.height}`;
  }

  /**
   * Take a memory snapshot
   */
  takeSnapshot(customMetrics: Record<string, any> = {}): MemorySnapshot {
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      memory: this.getCurrentMemoryInfo(),
      activeObjectURLs: this.countActiveObjectURLs(),
      activeCanvases: this.countActiveCanvases(),
      customMetrics
    };

    if (this.isMonitoring) {
      this.snapshots.push(snapshot);
      
      // Keep only the last N snapshots
      if (this.snapshots.length > this.maxSnapshots) {
        this.snapshots = this.snapshots.slice(-this.maxSnapshots);
      }
    }

    return snapshot;
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(intervalMs: number = 5000) {
    if (!this.isMonitoring || this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = window.setInterval(() => {
      this.takeSnapshot();
    }, intervalMs);
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots() {
    this.snapshots = [];
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    current: MemorySnapshot | null;
    peak: MemorySnapshot | null;
    average: number | null;
    trend: 'increasing' | 'decreasing' | 'stable' | 'unknown';
  } {
    if (this.snapshots.length === 0) {
      return {
        current: null,
        peak: null,
        average: null,
        trend: 'unknown'
      };
    }

    const current = this.snapshots[this.snapshots.length - 1];
    const validSnapshots = this.snapshots.filter(s => s.memory !== null);
    
    let peak = validSnapshots[0];
    let totalMemory = 0;

    validSnapshots.forEach(snapshot => {
      if (snapshot.memory && peak.memory && snapshot.memory.usedJSHeapSize > peak.memory.usedJSHeapSize) {
        peak = snapshot;
      }
      totalMemory += snapshot.memory?.usedJSHeapSize || 0;
    });

    const average = validSnapshots.length > 0 ? totalMemory / validSnapshots.length : null;
    
    // Determine trend from last 5 snapshots
    let trend: 'increasing' | 'decreasing' | 'stable' | 'unknown' = 'unknown';
    if (validSnapshots.length >= 5) {
      const recent = validSnapshots.slice(-5);
      const first = recent[0].memory?.usedJSHeapSize || 0;
      const last = recent[recent.length - 1].memory?.usedJSHeapSize || 0;
      const diff = last - first;
      const threshold = first * 0.1; // 10% threshold

      if (diff > threshold) {
        trend = 'increasing';
      } else if (diff < -threshold) {
        trend = 'decreasing';
      } else {
        trend = 'stable';
      }
    }

    return {
      current,
      peak,
      average,
      trend
    };
  }

  /**
   * Format memory size for display
   */
  formatMemorySize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Log current memory status to console
   */
  logMemoryStatus() {
    if (!this.isMonitoring) {
      return;
    }

    const stats = this.getMemoryStats();
    const current = stats.current;

    if (!current || !current.memory) {
      return;
    }

    return {
      current,
      peak: stats.peak,
      average: stats.average,
      trend: stats.trend
    };
  }

  /**
   * Count active ObjectURLs
   */
  private countActiveObjectURLs(): number {
    return this.trackedObjectURLs.size;
  }

  /**
   * Count active canvas elements
   */
  private countActiveCanvases(): number {
    return this.trackedCanvases.size || document.querySelectorAll('canvas').length;
  }
  
  /**
   * Get detailed information about tracked ObjectURLs
   */
  getTrackedObjectURLs(): TrackedObjectURL[] {
    return Array.from(this.trackedObjectURLs.values());
  }
  
  /**
   * Get detailed information about tracked canvases
   */
  getTrackedCanvases(): TrackedCanvas[] {
    return Array.from(this.trackedCanvases.values());
  }

  /**
   * Check for potential memory leaks
   */
  checkForLeaks(): {
    hasLeaks: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const stats = this.getMemoryStats();
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!stats.current || !stats.current.memory) {
      return {
        hasLeaks: false,
        issues: ['Memory information not available'],
        recommendations: ['Enable memory monitoring in a supported browser']
      };
    }

    // Check for increasing memory trend
    if (stats.trend === 'increasing') {
      issues.push('Memory usage is steadily increasing');
      recommendations.push('Check for unbounded collections or unreleased resources');
    }

    // Check for long-lived ObjectURLs (older than 60 seconds)
    const oldObjectURLs = Array.from(this.trackedObjectURLs.values())
      .filter(tracked => (Date.now() - tracked.createdAt) > 60000);
    
    if (oldObjectURLs.length > 0) {
      issues.push(`Found ${oldObjectURLs.length} ObjectURLs that have been active for over 60 seconds`);
      recommendations.push('Ensure all ObjectURLs are revoked after use');
      
      // Log the IDs of the oldest URLs
      const oldestURLs = oldObjectURLs
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(0, 5)
        .map(url => url.id || 'unknown');
      
      if (oldestURLs.length > 0) {
        recommendations.push(`Check these object URL IDs: ${oldestURLs.join(', ')}`);
      }
    }

    // Check for large canvas elements (over 2000x2000 pixels)
    const largeCanvases = Array.from(this.trackedCanvases.values())
      .filter(tracked => tracked.dimensions.width * tracked.dimensions.height > 4000000);
    
    if (largeCanvases.length > 0) {
      issues.push(`Found ${largeCanvases.length} large canvas elements that may consume significant memory`);
      recommendations.push('Consider reducing canvas sizes or releasing unused canvases');
    }

    return {
      hasLeaks: issues.length > 0,
      issues,
      recommendations
    };
  }
}

// Create singleton instance
const memoryMonitor = new MemoryMonitor();

// Export singleton
export default memoryMonitor;

// Define global memory monitor interface for TypeScript
declare global {
  interface Window {
    __memoryMonitor?: {
      trackObjectURL: (url: string, id?: string) => void;
      untrackObjectURL: (url: string, id?: string) => void;
      trackCanvas: (canvas: HTMLCanvasElement, context?: CanvasRenderingContext2D | null, id?: string) => void;
      untrackCanvas: (canvas: HTMLCanvasElement, id?: string) => void;
      trackCanvasResize: (canvas: HTMLCanvasElement, width: number, height: number, id?: string) => void;
    };
  }
} 