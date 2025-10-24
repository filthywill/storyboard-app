/**
 * Operations Utility
 *
 * Centralized wrapper for complex operations that need to coordinate
 * auto-save batching and project switching locks.
 */

import { enableBatchMode, disableBatchMode, lockProjectSwitching, unlockProjectSwitching } from '@/utils/autoSave';
import { Telemetry } from '@/utils/telemetry';

export interface OperationOptions {
  name?: string;
  lockSwitching?: boolean; // default true
  batchSaves?: boolean;    // default true
}

export async function withOperation<T>(fn: () => Promise<T>, options: OperationOptions = {}): Promise<T> {
  const name = options.name || 'operation';
  const lock = options.lockSwitching !== false;
  const batch = options.batchSaves !== false;

  Telemetry.event('operation.begin', { name });
  const endTimer = Telemetry.timer('operation.duration');

  try {
    if (lock) lockProjectSwitching();
    if (batch) enableBatchMode();
    const result = await fn();
    Telemetry.event('operation.success', { name });
    return result;
  } catch (error) {
    Telemetry.event('operation.error', { name, error: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally {
    try {
      if (batch) disableBatchMode();
    } finally {
      if (lock) unlockProjectSwitching();
      endTimer.end({ name });
    }
  }
}




