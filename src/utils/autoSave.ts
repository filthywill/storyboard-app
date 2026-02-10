/**
 * Auto-Save Utility
 * 
 * Provides a clean way for stores to trigger auto-save without circular dependencies.
 * Uses callback registration pattern to decouple stores from the main app store.
 */

let autoSaveCallback: (() => void) | null = null;
let immediateAutoSaveCallback: (() => Promise<void>) | null = null;
let isBatchMode = false;
let isSwitchingProject = false;
let isSavePaused = false;
let intentDepth = 0;
let pendingIntentReason: string | null = null;
let autosaveAttemptCount = 0;

/**
 * Register the auto-save callback (called once during app initialization)
 */
export const registerAutoSave = (
  callback: () => void,
  immediateCallback: () => Promise<void>
) => {
  autoSaveCallback = callback;
  immediateAutoSaveCallback = immediateCallback;
};

/**
 * Trigger debounced auto-save (2 second delay)
 * Use for: text changes, settings changes
 */
export const markDirty = (reason: string, meta?: Record<string, unknown>) => {
  if (isSwitchingProject) {
    if (import.meta.env.DEV) {
      console.debug('[autosave] suppressed: project switching', { reason, meta });
    }
    return;
  }
  if (isSavePaused) {
    if (import.meta.env.DEV) {
      console.debug('[autosave] suppressed: paused', { reason, meta });
    }
    return;
  }
  if (isBatchMode || intentDepth > 0) {
    pendingIntentReason = reason;
    if (import.meta.env.DEV) {
      console.debug('[autosave] deferred (batch/intent)', { reason, meta });
    }
    return;
  }
  if (autoSaveCallback) {
    try {
      autosaveAttemptCount += 1;
      if (import.meta.env.DEV) {
        console.debug('[autosave] attempt', { reason, meta, autosaveAttemptCount });
      }
      autoSaveCallback();
    } catch (error) {
      console.error('Auto-save callback failed:', error);
    }
  } else {
    if (typeof window !== 'undefined' && window.location) {
      console.warn('Auto-save not registered. Call registerAutoSave() during app initialization.');
    }
  }
};

export const requestSaveNow = async (reason: string, meta?: Record<string, unknown>) => {
  if (isSwitchingProject) {
    if (import.meta.env.DEV) {
      console.debug('[autosave] immediate suppressed: project switching', { reason, meta });
    }
    return;
  }
  if (isSavePaused) {
    if (import.meta.env.DEV) {
      console.debug('[autosave] immediate suppressed: paused', { reason, meta });
    }
    return;
  }
  if (immediateAutoSaveCallback) {
    try {
      if (import.meta.env.DEV) {
        console.debug('[autosave] immediate attempt', { reason, meta });
      }
      await immediateAutoSaveCallback();
    } catch (error) {
      console.error('Immediate save failed:', error);
    }
  } else {
    if (typeof window !== 'undefined' && window.location) {
      console.warn('Immediate save not registered. Call registerAutoSave() during app initialization.');
    }
  }
};

export const beginIntent = (reason: string) => {
  intentDepth += 1;
  pendingIntentReason = reason;
  if (intentDepth === 1) {
    enableBatchMode();
  }
};

export const endIntent = (reason?: string) => {
  if (intentDepth === 0) return;
  intentDepth -= 1;
  if (intentDepth === 0) {
    disableBatchMode({ triggerSave: false });
    const finalReason = reason || pendingIntentReason || 'intent';
    pendingIntentReason = null;
    markDirty(finalReason);
  }
};

export const setSavePaused = (paused: boolean, reason?: string) => {
  isSavePaused = paused;
  if (import.meta.env.DEV) {
    console.debug('[autosave] pause state changed', { paused, reason });
  }
};

export const triggerAutoSave = () => {
  // Check if project switching is in progress
  if (isSwitchingProject) {
    console.log('⚠️ Auto-save blocked: Project switch in progress');
    return;
  }
  
  // Skip auto-save during batch operations to prevent performance issues
  if (isBatchMode) {
    console.log('⚠️ Auto-save blocked: Batch mode active');
    return;
  }
  
  markDirty('legacy_trigger');
};

/**
 * Trigger immediate save (no debounce)
 * Use for: deletions, critical operations
 */
export const triggerImmediateSave = async () => {
  await requestSaveNow('legacy_immediate');
};

/**
 * Enable batch mode to prevent auto-save during bulk operations
 */
export const enableBatchMode = () => {
  isBatchMode = true;
};

/**
 * Disable batch mode and trigger a single auto-save for all accumulated changes
 */
export const disableBatchMode = (options?: { triggerSave?: boolean }) => {
  isBatchMode = false;
  const shouldTrigger = options?.triggerSave !== false;
  if (shouldTrigger) {
    markDirty('batch_complete');
  }
};

/**
 * Lock project switching to prevent auto-saves during the switch process
 */
export function lockProjectSwitching(): void {
  console.log('🔒 Project switching LOCKED - auto-saves disabled');
  isSwitchingProject = true;
}

/**
 * Unlock project switching to re-enable auto-saves
 */
export function unlockProjectSwitching(): void {
  console.log('🔓 Project switching UNLOCKED - auto-saves enabled');
  isSwitchingProject = false;
}

/**
 * Check if project switching is currently locked
 */
export function isProjectLocked(): boolean {
  return isSwitchingProject;
}



