import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { renumberingOptimizer } from '@/utils/renumberingOptimizer';
import { formatShotNumber } from '@/utils/formatShotNumber';
import { triggerAutoSave, triggerImmediateSave } from '@/utils/autoSave';
import { BackgroundSyncService } from '@/services/backgroundSyncService';

export interface Shot {
  id: string;
  number: string;
  subShotGroupId: string | null;
  imageFile: File | null;        // Session-only
  imageData?: string;            // Base64 (compressed)
  imageUrl?: string;             // Supabase URL (future)
  imageSize?: number;            // Original file size
  imageStorageType?: 'base64' | 'supabase' | 'local-pending-sync' | 'hybrid';
  imageScale?: number;           // Scale factor for image (1.0 = original size)
  imageOffsetX?: number;         // X offset for image positioning
  imageOffsetY?: number;         // Y offset for image positioning
  cloudSyncStatus?: 'pending' | 'syncing' | 'synced' | 'failed';
  cloudSyncRetries?: number;
  lastSyncAttempt?: Date;
  actionText: string;
  scriptText: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShotState {
  shots: Record<string, Shot>; // Shot ID -> Shot
  shotOrder: string[]; // Global order of all shots for numbering
}

export interface ShotActions {
  // Shot management
  createShot: (shotData?: Partial<Shot>) => string; // Returns shot ID
  deleteShot: (shotId: string) => void;
  updateShot: (shotId: string, updates: Partial<Shot>) => void;
  duplicateShot: (shotId: string) => string; // Returns new shot ID
  
  // Sub-shot management
  createSubShot: (originalShotId: string) => string; // Returns new shot ID
  removeFromSubGroup: (shotId: string) => void;
  insertShotIntoSubGroup: (shotId: string, targetGroupId: string, insertPosition: number) => void;
  
  // Shot ordering and numbering
  setShotOrder: (shotIds: string[]) => void;
  renumberAllShots: (shotNumberFormat: string) => void;
  renumberAllShotsImmediate: (shotNumberFormat: string) => void;
  
  // Utility
  getShotById: (shotId: string) => Shot | undefined;
  getShotsById: (shotIds: string[]) => Shot[];
  getSubGroupShots: (subGroupId: string) => Shot[];
  
  // Position-based shot movement for drag operations
  moveShot: (shotId: string, targetPosition: number) => void;
  moveShotGroup: (groupId: string, targetPosition: number) => void;
  getGlobalShotIndex: (shotId: string) => number;
}

export type ShotStore = ShotState & ShotActions;

const createDefaultShot = (number: string = ''): Shot => ({
  id: crypto.randomUUID(),
  number,
  subShotGroupId: null,
  imageFile: null,
  imageScale: 1.0,
  imageOffsetX: 0,
  imageOffsetY: 0,
  actionText: '',
  scriptText: '',
  createdAt: new Date(),
  updatedAt: new Date()
});

const renumberShots = (
  shots: Record<string, Shot>, 
  shotOrder: string[], 
  shotNumberFormat: string
) => {
  console.log(`Renumbering ${shotOrder.length} shots with format: ${shotNumberFormat}`);
  
  if (shotOrder.length === 0) {
    return;
  }

  let mainShotCounter = 0;
  let subLetterCode = 'a'.charCodeAt(0);

  for (let i = 0; i < shotOrder.length; i++) {
    const shotId = shotOrder[i];
    const shot = shots[shotId];
    if (!shot) continue;

    const prevShotId = i > 0 ? shotOrder[i - 1] : null;
    const prevShot = prevShotId ? shots[prevShotId] : null;

    const isContinuationOfSubGroup = shot.subShotGroupId && shot.subShotGroupId === prevShot?.subShotGroupId;

    if (!isContinuationOfSubGroup) {
      mainShotCounter++;
      subLetterCode = 'a'.charCodeAt(0);
    }

    if (shot.subShotGroupId) {
      const subLetter = String.fromCharCode(subLetterCode);
      shot.number = formatShotNumber(mainShotCounter, shotNumberFormat, subLetter);
      subLetterCode++;
    } else {
      shot.number = formatShotNumber(mainShotCounter, shotNumberFormat);
    }
    
    shot.updatedAt = new Date();
  }
  
  console.log('Shot renumbering completed');
};

export const useShotStore = create<ShotStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      shots: {},
      shotOrder: [],

      // Shot management
      createShot: (shotData) => {
        const shotId = crypto.randomUUID();
        const newShot = {
          ...createDefaultShot(),
          ...shotData,
          id: shotId,
        };
        
        set((state) => {
          state.shots[shotId] = newShot;
          state.shotOrder.push(shotId);
        });
        
        // Trigger auto-save after creating shot
        triggerAutoSave();
        
        return shotId;
      },

      deleteShot: (shotId) => {
        // Capture shot data before deletion for cleanup
        const shot = get().shots[shotId];
        const hasImage = shot && (shot.imageUrl || shot.imageData);
        
        set((state) => {
          const shot = state.shots[shotId];
          if (!shot) return;

          // Handle sub-shot group cleanup
          if (shot.subShotGroupId) {
            const remainingInGroup = Object.values(state.shots).filter(
              s => s.subShotGroupId === shot.subShotGroupId && s.id !== shotId
            );
            if (remainingInGroup.length === 1) {
              remainingInGroup[0].subShotGroupId = null;
            }
          }

          // Remove from shots and order
          delete state.shots[shotId];
          const orderIndex = state.shotOrder.indexOf(shotId);
          if (orderIndex !== -1) {
            state.shotOrder.splice(orderIndex, 1);
          }
        });
        
        // Clean up background sync queue and associated image
        if (import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true') {
          try {
            // Dynamic import to avoid circular dependencies
            import('@/services/backgroundSyncService').then(({ BackgroundSyncService }) => {
              BackgroundSyncService.markShotDeleted(shotId);
              
              // If shot had an image, mark it for cleanup
              if (hasImage) {
                import('@/services/storageService').then(({ StorageService }) => {
                  import('@/store/projectManagerStore').then(({ useProjectManagerStore }) => {
                    const projectId = useProjectManagerStore.getState().currentProjectId;
                    if (projectId) {
                      StorageService.deleteShotImage(projectId, shotId).catch(error => {
                        console.warn(`Failed to delete image for shot ${shotId}:`, error);
                      });
                    }
                  });
                });
              }
            });
          } catch (error) {
            console.warn('Failed to clean up sync queue for deleted shot:', error);
          }
        }
        
        // Trigger immediate save for deletion (critical operation)
        triggerImmediateSave();
      },

      updateShot: (shotId, updates) => {
        // Capture old image URL before update for cleanup
        const oldShot = get().shots[shotId];
        const oldImageUrl = oldShot?.imageUrl;
        const isImageReplacement = updates.imageUrl && oldImageUrl && updates.imageUrl !== oldImageUrl;
        
        set((state) => {
          const shot = state.shots[shotId];
          if (!shot) return;

          // Update the shot
          Object.assign(shot, updates, { updatedAt: new Date() });
        });
        
        // If image was replaced, clean up old image from storage
        if (isImageReplacement && import.meta.env.VITE_CLOUD_SYNC_ENABLED === 'true') {
          try {
            console.log(`🔄 Image replaced for shot ${shotId}, cleaning up old image`);
            
            // Dynamic import to avoid circular dependencies
            import('@/services/storageService').then(({ StorageService }) => {
              import('@/store/projectManagerStore').then(({ useProjectManagerStore }) => {
                const projectId = useProjectManagerStore.getState().currentProjectId;
                if (projectId) {
                  StorageService.deleteShotImage(projectId, shotId, oldImageUrl).catch(error => {
                    console.warn(`Failed to delete old image for shot ${shotId}:`, error);
                  });
                }
              });
            });
          } catch (error) {
            console.warn('Failed to clean up old image:', error);
          }
        }
        
        // Trigger auto-save after shot update
        triggerAutoSave();
      },

      duplicateShot: (shotId) => {
        const originalShot = get().shots[shotId];
        if (!originalShot) return '';

        const newShotId = crypto.randomUUID();
        const newShot: Shot = {
          ...originalShot,
          id: newShotId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        set((state) => {
          state.shots[newShotId] = newShot;
          
          // Insert after the original shot in order
          const originalIndex = state.shotOrder.indexOf(shotId);
          if (originalIndex !== -1) {
            state.shotOrder.splice(originalIndex + 1, 0, newShotId);
          } else {
            state.shotOrder.push(newShotId);
          }
        });

        // Trigger auto-save after duplicating shot
        triggerAutoSave();

        return newShotId;
      },

      // Sub-shot management
      createSubShot: (originalShotId) => {
        const originalShot = get().shots[originalShotId];
        if (!originalShot) return '';

        const newShotId = crypto.randomUUID();
        const newShot = createDefaultShot();
        newShot.id = newShotId;

        set((state) => {
          // Access the original shot through the draft state
          const draftOriginalShot = state.shots[originalShotId];
          if (!draftOriginalShot) return;

          // Set up sub-shot group relationship
          if (draftOriginalShot.subShotGroupId) {
            newShot.subShotGroupId = draftOriginalShot.subShotGroupId;
          } else {
            const newGroupId = crypto.randomUUID();
            draftOriginalShot.subShotGroupId = newGroupId;
            newShot.subShotGroupId = newGroupId;
          }

          state.shots[newShotId] = newShot;
          
          // Insert after the original shot in order
          const originalIndex = state.shotOrder.indexOf(originalShotId);
          if (originalIndex !== -1) {
            state.shotOrder.splice(originalIndex + 1, 0, newShotId);
          } else {
            state.shotOrder.push(newShotId);
          }
        });

        return newShotId;
      },

      removeFromSubGroup: (shotId) => {
        set((state) => {
          const shot = state.shots[shotId];
          if (!shot || !shot.subShotGroupId) return;

          const subGroupId = shot.subShotGroupId;
          shot.subShotGroupId = null;

          // Check if this was the last shot in the group that had a sub-group
          const remainingInGroup = Object.values(state.shots).filter(
            s => s.subShotGroupId === subGroupId
          );
          
          if (remainingInGroup.length === 1) {
            remainingInGroup[0].subShotGroupId = null;
          }
        });
      },

      insertShotIntoSubGroup: (shotId, targetGroupId, insertPosition) => {
        set((state) => {
          const shot = state.shots[shotId];
          if (!shot) return;

          // Remove shot from its current sub-group if it has one
          if (shot.subShotGroupId) {
            const oldSubGroupId = shot.subShotGroupId;
            shot.subShotGroupId = null;

            // Check if this was the last shot in the old group
            const remainingInOldGroup = Object.values(state.shots).filter(
              s => s.subShotGroupId === oldSubGroupId && s.id !== shotId
            );
            
            if (remainingInOldGroup.length === 1) {
              remainingInOldGroup[0].subShotGroupId = null;
            }
          }

          // Add shot to the new sub-group
          shot.subShotGroupId = targetGroupId;

          // Move the shot to the correct position in the global order
          const currentIndex = state.shotOrder.indexOf(shotId);
          if (currentIndex !== -1) {
            // Remove from current position
            state.shotOrder.splice(currentIndex, 1);
            
            // Insert at the target position
            if (insertPosition >= 0 && insertPosition <= state.shotOrder.length) {
              state.shotOrder.splice(insertPosition, 0, shotId);
            } else {
              state.shotOrder.push(shotId);
            }
          }

          shot.updatedAt = new Date();
        });
      },

      // Shot ordering and numbering
      setShotOrder: (shotIds) => {
        set((state) => {
          state.shotOrder = shotIds;
        });
      },

      renumberAllShots: (shotNumberFormat: string) => {
        const state = get();
        renumberingOptimizer.scheduleRenumbering({
          shots: state.shots,
          shotOrder: state.shotOrder,
          shotNumberFormat,
          callback: () => {
            // Update state with the modified shots to trigger reactivity
            set((state) => {
              // Force an update to trigger subscribers
              state.shots = { ...state.shots };
            });
          }
        });
      },

      // Immediate renumbering for critical operations
      renumberAllShotsImmediate: (shotNumberFormat: string) => {
        set((draftState) => {
          // Use immer to directly modify the state
          renumberShots(draftState.shots, draftState.shotOrder, shotNumberFormat);
        });
      },

      // Utility methods
      getShotById: (shotId) => {
        return get().shots[shotId];
      },

      getShotsById: (shotIds) => {
        const shots = get().shots;
        return shotIds.map(id => shots[id]).filter(Boolean);
      },

      getSubGroupShots: (subGroupId) => {
        const shots = get().shots;
        return Object.values(shots).filter(shot => shot.subShotGroupId === subGroupId);
      },

      // Move shot to a specific position in the global order
      moveShot: (shotId, targetPosition) => {
        set((state) => {
          const currentIndex = state.shotOrder.indexOf(shotId);
          if (currentIndex === -1 || targetPosition < 0 || targetPosition >= state.shotOrder.length) {
            return;
          }
          
          // Don't move if already in target position
          if (currentIndex === targetPosition) return;
          
          // Remove shot from current position and insert at target position
          const [movedShotId] = state.shotOrder.splice(currentIndex, 1);
          state.shotOrder.splice(targetPosition, 0, movedShotId);
        });
      },

      // Move an entire sub-shot group to a specific position
      moveShotGroup: (groupId, targetPosition) => {
        set((state) => {
          // Find all shots in the group
          const groupShotIds = state.shotOrder.filter(shotId => {
            const shot = state.shots[shotId];
            return shot && shot.subShotGroupId === groupId;
          });
          
          if (groupShotIds.length === 0) return;
          
          // Find the first occurrence of the group in shotOrder
          const firstGroupIndex = state.shotOrder.indexOf(groupShotIds[0]);
          if (firstGroupIndex === -1) return;
          
          // Adjust target position if moving within the same area
          let adjustedTargetPosition = targetPosition;
          if (targetPosition > firstGroupIndex) {
            adjustedTargetPosition = targetPosition - groupShotIds.length + 1;
          }
          
          // Remove all group shots from their current positions
          groupShotIds.forEach(() => {
            const index = state.shotOrder.findIndex(shotId => {
              const shot = state.shots[shotId];
              return shot && shot.subShotGroupId === groupId;
            });
            if (index !== -1) {
              state.shotOrder.splice(index, 1);
            }
          });
          
          // Insert group shots at target position
          groupShotIds.forEach((shotId, i) => {
            state.shotOrder.splice(adjustedTargetPosition + i, 0, shotId);
          });
        });
      },

      // Get the global index of a shot in the shotOrder array
      getGlobalShotIndex: (shotId) => {
        const state = get();
        return state.shotOrder.indexOf(shotId);
      },
    })),
    {
      name: 'shot-storage',
      partialize: (state) => ({
        shots: Object.fromEntries(
          Object.entries(state.shots).map(([id, shot]) => [
            id,
            {
              ...shot,
              imageFile: null, // Don't persist File objects
              // Keep base64 data and other image properties
              imageData: shot.imageData,
              imageUrl: shot.imageUrl,
              imageSize: shot.imageSize,
              imageStorageType: shot.imageStorageType,
              // Keep sync status fields
              cloudSyncStatus: shot.cloudSyncStatus,
              cloudSyncRetries: shot.cloudSyncRetries,
              lastSyncAttempt: shot.lastSyncAttempt
            }
          ])
        ),
        shotOrder: state.shotOrder,
      })
    }
  )
); 