import * as React from 'react';
import { useCallback } from 'react';
import { ShotCard } from './ShotCard';
import { Shot, useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShotGridProps {
  pageId: string;
  className?: string;
  previewDimensions: { width: number; imageHeight: number; gap: number };
  onShotUpdate: (shotId: string, updates: Partial<Shot>) => void;
  onShotDelete: (shotId: string) => void;
  onAddShot: (pageId: string, position?: number) => void;
  onAddSubShot: (pageId: string, shotId: string) => void;
  onInsertBatch?: (shotId: string) => void;
}

export const ShotGrid: React.FC<ShotGridProps> = ({ 
  pageId, 
  className, 
  previewDimensions,
  onShotUpdate,
  onShotDelete,
  onAddShot,
  onAddSubShot,
  onInsertBatch
}) => {
  const {
    pages,
    activePageId,
    templateSettings,
    getPageShots,
    shots,
    shotOrder,
    createSubShot,
    insertShotIntoSubGroup
  } = useAppStore();

  const activePage = pages.find(p => p.id === activePageId);
  const activePageIndex = pages.findIndex(p => p.id === activePageId);

  // Get shots for this specific page
  const pageShots = getPageShots(pageId);

  const handleShotUpdate = useCallback((shotId: string, updates: Partial<Shot>) => {
    onShotUpdate(shotId, updates);
  }, [onShotUpdate]);

  const handleShotDelete = useCallback((shotId: string) => {
    onShotDelete(shotId);
  }, [onShotDelete]);

  const handleAddSubShot = useCallback((shotId: string) => {
    onAddSubShot(pageId, shotId);
  }, [pageId, onAddSubShot]);

  const handleInsertBatch = useCallback((shotId: string) => {
    onInsertBatch?.(shotId);
  }, [onInsertBatch]);

  const handleInsertShot = useCallback((shotId: string) => {
    const shot = shots[shotId];
    if (!shot) return;

    const shotIndex = pageShots.findIndex(s => s.id === shotId);
    if (shotIndex === -1) return;

    // Check if this is a sub-shot (has a subShotGroupId)
    if (shot.subShotGroupId) {
      // Find all shots in the same sub-shot group
      const groupShots = Object.values(shots).filter(
        s => s.subShotGroupId === shot.subShotGroupId
      );
      
      // Sort by global order to find the first shot in the group
      const sortedGroupShots = groupShots.sort((a, b) => {
        const aIndex = shotOrder.indexOf(a.id);
        const bIndex = shotOrder.indexOf(b.id);
        return aIndex - bIndex;
      });

      // Check if this is the parent shot (first shot in the group)
      const isParentShot = sortedGroupShots[0].id === shotId;

      if (isParentShot) {
        // If it's the parent shot, create a standard shot before it
        onAddShot(pageId, shotIndex);
      } else {
        // If it's a sub-shot, create a new sub-shot before it in the same group
        const newSubShotId = createSubShot(shotId);
        
        // Find the global position of the current shot
        const currentGlobalIndex = shotOrder.indexOf(shotId);
        if (currentGlobalIndex !== -1) {
          // Insert the new sub-shot before the current shot in the same group
          insertShotIntoSubGroup(newSubShotId, shot.subShotGroupId, currentGlobalIndex);
        }
      }
    } else {
      // If it's a standard shot, create a standard shot before it
      onAddShot(pageId, shotIndex);
    }
  }, [pageShots, pageId, onAddShot, shots, shotOrder, createSubShot, insertShotIntoSubGroup]);

  const handleAddShot = useCallback((position?: number) => {
    onAddShot(pageId, position);
  }, [pageId, onAddShot]);

  if (!activePage) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Page not found
      </div>
    );
  }

  const { gridRows, gridCols, aspectRatio } = activePage;
  const totalSlots = gridRows * gridCols;
  const emptySlotsCount = Math.max(0, totalSlots - pageShots.length);

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'grid w-full',
          'justify-center'
        )}
        style={{
          gridTemplateColumns: `repeat(${gridCols}, ${previewDimensions.width}px)`,
          gridTemplateRows: `repeat(${gridRows}, auto)`,
          gap: `${previewDimensions.gap}px`,
          justifyContent: 'center',
          width: '1000px',
          maxWidth: '1000px',
          minWidth: '1000px',
          margin: '0 auto',
          flexShrink: 0
        }}
      >
        {/* Existing Shots */}
        {pageShots.map((shot) => (
          <ShotCard
            key={shot.id}
            shot={shot}
            onUpdate={(updates) => handleShotUpdate(shot.id, updates)}
            onDelete={() => handleShotDelete(shot.id)}
            onAddSubShot={() => handleAddSubShot(shot.id)}
            onInsertShot={() => handleInsertShot(shot.id)}
            onInsertBatch={() => handleInsertBatch(shot.id)}
            aspectRatio={aspectRatio}
            previewDimensions={previewDimensions}
          />
        ))}
        
        {/* Empty Slots */}
        {Array.from({ length: emptySlotsCount }).map((_, index) => (
          <div
            key={`empty-${index}`}
            className={cn(
              "rounded-lg flex items-center justify-center transition-colors group cursor-pointer",
              "border-0"
            )}
            style={{
              width: `${previewDimensions.width}px`,
              minHeight: `${previewDimensions.imageHeight + 80}px`,
              flex: 'none'
            }}
            onClick={() => handleAddShot()}
          >
            <div className="text-center text-gray-400 group-hover:text-gray-600 transition-colors">
              <Plus size={24} className="mx-auto mb-2" />
              <span className={cn(
                "font-medium",
                "text-xs"
              )}>Add Shot</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer */}
      {templateSettings.showPageNumber && (
        <div 
          className="mt-2"
          style={{
            width: '1000px',
            maxWidth: '1000px',
            margin: '8px auto 0',
            flexShrink: 0
          }}
        >
          <div 
            className="px-6 py-3"
            style={{
              paddingLeft: '33px',
              paddingRight: '33px',
              paddingTop: '12px',
              paddingBottom: '12px'
            }}
          >
            <div 
              className="flex items-center justify-end text-xs text-gray-500"
              style={{
                fontSize: '10px',
                lineHeight: '1.2'
              }}
            >
              {activePageIndex !== -1 && (
                <div>
                  Page {activePageIndex + 1}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
