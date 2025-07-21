// Batch operations utilities for efficient bulk shot operations
// Allows multiple operations to be performed without triggering renumbering each time

import { renumberingOptimizer } from './renumberingOptimizer';

interface BatchOperation {
  type: 'create' | 'delete' | 'update' | 'reorder' | 'duplicate';
  shotId?: string;
  data?: any;
  position?: number;
}

class BatchOperationManager {
  private operations: BatchOperation[] = [];
  private isExecuting: boolean = false;

  /**
   * Add an operation to the batch
   */
  addOperation(operation: BatchOperation): void {
    this.operations.push(operation);
  }

  /**
   * Execute all batched operations efficiently
   * This will perform all operations and then trigger a single renumbering
   */
  async executeBatch(shotStore: any): Promise<void> {
    if (this.isExecuting || this.operations.length === 0) return;

    this.isExecuting = true;
    
    try {
      // Disable automatic renumbering during batch execution
      const originalRenumberFn = shotStore.getState().renumberAllShots;
      const tempRenumberFn = () => {}; // No-op

      // Temporarily replace renumbering function
      shotStore.setState({ renumberAllShots: tempRenumberFn });

      // Execute all operations
      for (const operation of this.operations) {
        await this.executeOperation(operation, shotStore);
      }

      // Restore original renumbering function
      shotStore.setState({ renumberAllShots: originalRenumberFn });

      // Trigger a single renumbering for all operations
      const state = shotStore.getState();
      renumberingOptimizer.scheduleRenumbering({
        shots: state.shots,
        shotOrder: state.shotOrder,
        startNumber: state.startNumber,
        callback: () => {} // No additional callback needed
      });

    } finally {
      this.operations = [];
      this.isExecuting = false;
    }
  }

  /**
   * Execute a single operation
   */
  private async executeOperation(operation: BatchOperation, shotStore: any): Promise<void> {
    const state = shotStore.getState();

    switch (operation.type) {
      case 'create':
        state.createShot(operation.data);
        break;
      case 'delete':
        if (operation.shotId) {
          state.deleteShot(operation.shotId);
        }
        break;
      case 'update':
        if (operation.shotId && operation.data) {
          state.updateShot(operation.shotId, operation.data);
        }
        break;
      case 'duplicate':
        if (operation.shotId) {
          state.duplicateShot(operation.shotId);
        }
        break;
      case 'reorder':
        if (operation.data) {
          state.setShotOrder(operation.data);
        }
        break;
    }
  }

  /**
   * Clear all pending operations
   */
  clearBatch(): void {
    this.operations = [];
  }

  /**
   * Get the number of pending operations
   */
  getBatchSize(): number {
    return this.operations.length;
  }

  /**
   * Check if batch execution is in progress
   */
  isExecutingBatch(): boolean {
    return this.isExecuting;
  }
}

/**
 * Higher-order function to create batch-aware shot operations
 * These functions accumulate operations and can be executed as a batch
 */
export class BatchShotOperations {
  private batchManager = new BatchOperationManager();

  /**
   * Add multiple shots at once
   */
  addMultipleShots(shotDataArray: any[]): BatchShotOperations {
    shotDataArray.forEach(shotData => {
      this.batchManager.addOperation({
        type: 'create',
        data: shotData
      });
    });
    return this;
  }

  /**
   * Delete multiple shots at once
   */
  deleteMultipleShots(shotIds: string[]): BatchShotOperations {
    shotIds.forEach(shotId => {
      this.batchManager.addOperation({
        type: 'delete',
        shotId
      });
    });
    return this;
  }

  /**
   * Update multiple shots at once
   */
  updateMultipleShots(updates: Array<{ shotId: string; data: any }>): BatchShotOperations {
    updates.forEach(({ shotId, data }) => {
      this.batchManager.addOperation({
        type: 'update',
        shotId,
        data
      });
    });
    return this;
  }

  /**
   * Duplicate multiple shots at once
   */
  duplicateMultipleShots(shotIds: string[]): BatchShotOperations {
    shotIds.forEach(shotId => {
      this.batchManager.addOperation({
        type: 'duplicate',
        shotId
      });
    });
    return this;
  }

  /**
   * Reorder shots
   */
  reorderShots(newOrder: string[]): BatchShotOperations {
    this.batchManager.addOperation({
      type: 'reorder',
      data: newOrder
    });
    return this;
  }

  /**
   * Execute all batched operations
   */
  async execute(shotStore: any): Promise<void> {
    await this.batchManager.executeBatch(shotStore);
  }

  /**
   * Get batch statistics
   */
  getBatchInfo() {
    return {
      operationCount: this.batchManager.getBatchSize(),
      isExecuting: this.batchManager.isExecutingBatch()
    };
  }

  /**
   * Clear the current batch
   */
  clear(): BatchShotOperations {
    this.batchManager.clearBatch();
    return this;
  }
}

/**
 * Create a new batch operation instance
 */
export function createBatch(): BatchShotOperations {
  return new BatchShotOperations();
}

/**
 * Utility function for common batch operations
 */
export const batchUtils = {
  /**
   * Import shots from an array with a single renumbering
   */
  async importShots(shotDataArray: any[], shotStore: any): Promise<void> {
    const batch = createBatch();
    batch.addMultipleShots(shotDataArray);
    await batch.execute(shotStore);
  },

  /**
   * Clear all shots and add new ones
   */
  async replaceAllShots(newShots: any[], shotStore: any): Promise<void> {
    const currentState = shotStore.getState();
    const currentShotIds = Object.keys(currentState.shots);
    
    const batch = createBatch();
    batch.deleteMultipleShots(currentShotIds);
    batch.addMultipleShots(newShots);
    await batch.execute(shotStore);
  },

  /**
   * Bulk update shot properties
   */
  async bulkUpdateShots(shotIds: string[], updates: any, shotStore: any): Promise<void> {
    const batch = createBatch();
    const updateOperations = shotIds.map(shotId => ({ shotId, data: updates }));
    batch.updateMultipleShots(updateOperations);
    await batch.execute(shotStore);
  }
}; 