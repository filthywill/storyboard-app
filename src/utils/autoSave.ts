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
  
  if (autoSaveCallback) {
    try {
      console.log('🔄 Triggering auto-save...');
      autoSaveCallback();
    } catch (error) {
      console.error('Auto-save callback failed:', error);
    }
  } else {
    // Don't warn during initial load - this is expected
    if (typeof window !== 'undefined' && window.location) {
      console.warn('Auto-save not registered. Call registerAutoSave() during app initialization.');
    }
  }
};

/**
 * Trigger immediate save (no debounce)
 * Use for: deletions, critical operations
 */
export const triggerImmediateSave = async () => {
  // Check if project switching is in progress
  if (isSwitchingProject) {
    console.log('⚠️ Immediate save blocked: Project switch in progress');
    return;
  }
  
  if (immediateAutoSaveCallback) {
    try {
      console.log('🔄 Triggering immediate save...');
      await immediateAutoSaveCallback();
      console.log('✅ Immediate save completed');
    } catch (error) {
      console.error('Immediate save failed:', error);
    }
  } else {
    // Don't warn during initial load - this is expected
    if (typeof window !== 'undefined' && window.location) {
      console.warn('Immediate save not registered. Call registerAutoSave() during app initialization.');
    }
  }
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
export const disableBatchMode = () => {
  isBatchMode = false;
  // Trigger a single auto-save for all the changes made during batch mode
  triggerAutoSave();
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



