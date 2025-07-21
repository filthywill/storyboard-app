// Renumbering optimization utilities
// Provides debounced renumbering to batch operations and improve performance

import { formatShotNumber } from './formatShotNumber';

interface RenumberingRequest {
  shots: Record<string, any>;
  shotOrder: string[];
  shotNumberFormat: string;
  callback: () => void;
}

class RenumberingOptimizer {
  private pendingRequest: RenumberingRequest | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private debounceDelay: number = 16; // ~1 frame at 60fps, good for UI responsiveness
  private isRenumbering: boolean = false;
  private renumberingStats: {
    totalCalls: number;
    batchedCalls: number;
    averageDelay: number;
    lastRenumberTime: number;
  } = {
    totalCalls: 0,
    batchedCalls: 0,
    averageDelay: 0,
    lastRenumberTime: 0,
  };

  /**
   * Schedule a renumbering operation with debouncing
   * Multiple calls within the debounce window will be batched into a single operation
   */
  scheduleRenumbering(request: RenumberingRequest): void {
    this.renumberingStats.totalCalls++;
    
    // Store the latest request (this ensures we always use the most recent state)
    this.pendingRequest = request;

    // Clear existing timer if there is one
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.renumberingStats.batchedCalls++;
    }

    // Schedule the renumbering
    this.debounceTimer = setTimeout(() => {
      this.executeRenumbering();
    }, this.debounceDelay);
  }

  /**
   * Execute immediate renumbering without debouncing
   * Use this for critical operations that must happen immediately
   */
  executeImmediateRenumbering(request: RenumberingRequest): void {
    // Cancel any pending debounced operation
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.pendingRequest = request;
    this.executeRenumbering();
  }

  /**
   * Internal method to execute the actual renumbering
   */
  private executeRenumbering(): void {
    if (!this.pendingRequest || this.isRenumbering) return;

    this.isRenumbering = true;
    const startTime = performance.now();

    try {
      const { shots, shotOrder, shotNumberFormat } = this.pendingRequest;
      this.performRenumbering(shots, shotOrder, shotNumberFormat);
      this.pendingRequest.callback();
    } catch (error) {
      console.error('Error during shot renumbering:', error);
    } finally {
      const endTime = performance.now();
      this.updateStats(endTime - startTime);
      
      this.isRenumbering = false;
      this.debounceTimer = null;
      this.pendingRequest = null;
    }
  }

  /**
   * Optimized renumbering algorithm using formatShotNumber utility
   */
  private performRenumbering(
    shots: Record<string, any>, 
    shotOrder: string[], 
    shotNumberFormat: string
  ): void {
    console.log('performRenumbering called with:', {
      shotCount: Object.keys(shots).length,
      shotOrderLength: shotOrder.length,
      format: shotNumberFormat,
      shotIds: shotOrder
    });
    
    if (shotOrder.length === 0) {
      console.log('No shots to renumber - shotOrder is empty');
      return;
    }

    let mainShotCounter = 0;
    let subLetterCode = 'a'.charCodeAt(0);
    const now = new Date(); // Single date instance for all shots

    for (let i = 0; i < shotOrder.length; i++) {
      const shotId = shotOrder[i];
      const shot = shots[shotId];
      if (!shot) {
        console.log('Shot not found for ID:', shotId);
        continue;
      }

      const prevShotId = i > 0 ? shotOrder[i - 1] : null;
      const prevShot = prevShotId ? shots[prevShotId] : null;

      const isContinuationOfSubGroup = shot.subShotGroupId && shot.subShotGroupId === prevShot?.subShotGroupId;

      if (!isContinuationOfSubGroup) {
        mainShotCounter++;
        subLetterCode = 'a'.charCodeAt(0);
      }

      const oldNumber = shot.number;
      if (shot.subShotGroupId) {
        const subLetter = String.fromCharCode(subLetterCode);
        shot.number = formatShotNumber(mainShotCounter, shotNumberFormat, subLetter);
        subLetterCode++;
      } else {
        shot.number = formatShotNumber(mainShotCounter, shotNumberFormat);
      }
      
      console.log(`Shot ${shotId}: ${oldNumber} -> ${shot.number}`);
      shot.updatedAt = now; // Use single date instance for performance
    }
    
    console.log('Renumbering completed');
  }

  /**
   * Update performance statistics
   */
  private updateStats(duration: number): void {
    this.renumberingStats.lastRenumberTime = duration;
    this.renumberingStats.averageDelay = 
      (this.renumberingStats.averageDelay + duration) / 2;
  }

  /**
   * Get performance statistics for monitoring
   */
  getStats() {
    const totalExecutions = this.renumberingStats.totalCalls - this.renumberingStats.batchedCalls;
    const batchingEfficiency = totalExecutions > 0 
      ? ((this.renumberingStats.batchedCalls / this.renumberingStats.totalCalls) * 100).toFixed(1)
      : '0';

    return {
      ...this.renumberingStats,
      totalExecutions,
      batchingEfficiency: `${batchingEfficiency}%`,
      isCurrentlyRenumbering: this.isRenumbering,
    };
  }

  /**
   * Reset statistics (useful for testing)
   */
  resetStats(): void {
    this.renumberingStats = {
      totalCalls: 0,
      batchedCalls: 0,
      averageDelay: 0,
      lastRenumberTime: 0,
    };
  }

  /**
   * Configure debouncing behavior
   */
  setDebounceDelay(delay: number): void {
    this.debounceDelay = Math.max(0, delay);
  }

  /**
   * Check if renumbering is currently in progress
   */
  isRenumberingInProgress(): boolean {
    return this.isRenumbering;
  }

  /**
   * Force completion of any pending renumbering
   * Useful for cleanup or when immediate consistency is required
   */
  flush(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.executeRenumbering();
    }
  }
}

// Singleton instance for global use
export const renumberingOptimizer = new RenumberingOptimizer();

export default RenumberingOptimizer; 