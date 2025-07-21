import * as React from 'react';
import { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { ShotCard } from './ShotCard';
import { Shot, useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShotGridProps {
  pageId: string;
  className?: string;
}

export const ShotGrid: React.FC<ShotGridProps> = ({ pageId, className }) => {
  const {
    pages,
    activePageId,
    shots,
    updateShot,
    deleteShot,
    addShot,
    addSubShot,
    reorderShots,
    moveShot,
    moveShotGroup,
    getGlobalShotIndex,
    setIsDragging,
    templateSettings,
    getPageShots
  } = useAppStore();

  const activePage = pages.find(p => p.id === activePageId);
  const activePageIndex = pages.findIndex(p => p.id === activePageId);

  // Get shots for this specific page
  const pageShots = getPageShots(pageId);

  const [activeShot, setActiveShot] = React.useState<Shot | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Calculate fixed dimensions for preview mode to align with header/footer
  const previewDimensions = React.useMemo(() => {
    if (!activePage) return { width: 200, imageHeight: 100, gap: 8 };
    
    const { gridCols, aspectRatio } = activePage;
    // Always use fixed 1000px width to match header and footer
    const fixedWidth = 1000;
    const headerPadding = 16; // px-4 from MasterHeader (updated)
    const gridWrapperPadding = 4; // p-1 from ShotGrid wrapper
    const totalPadding = (headerPadding + gridWrapperPadding) * 2; // Both sides
    const availableWidth = fixedWidth - totalPadding;
    const gaps = (gridCols - 1) * 8; // Gap between grid items
    const shotWidth = Math.floor((availableWidth - gaps) / gridCols);
    const cardContentPadding = 8 * 2; // p-2 = 8px each side = 16px total
    const imageBorder = 1 * 2; // border = 1px each side = 2px total
    const imageContainerWidth = shotWidth - cardContentPadding - imageBorder;
    const [w, h] = aspectRatio.split('/').map(str => parseInt(str.trim(), 10));
    const imageHeight = Math.floor((imageContainerWidth * h) / w);
    return {
      width: shotWidth,
      imageHeight: imageHeight, // Height of just the image area
      gap: 8 // Store gap for consistent usage
    };
  }, [activePage]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const shot = pageShots.find(s => s.id === event.active.id);
    setActiveShot(shot || null);
    setIsDragging(true);
  }, [pageShots, setIsDragging]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveShot(null);
    setIsDragging(false);

    if (!over || active.id === over.id) return;

    // Find the shots involved in the drag operation
    const activeShot = pageShots.find(shot => shot.id === active.id);
    const overShot = pageShots.find(shot => shot.id === over.id);

    if (!activeShot || !overShot) return;

    // Get the target global position from the overShot
    const targetPosition = getGlobalShotIndex(overShot.id);
    
    if (targetPosition === -1) return;

    // Check if activeShot is part of a sub-shot group
    if (activeShot.subShotGroupId) {
      // Move the entire sub-shot group
      moveShotGroup(activeShot.subShotGroupId, targetPosition);
    } else {
      // Move individual shot
      moveShot(activeShot.id, targetPosition);
    }
  }, [pageShots, setIsDragging, getGlobalShotIndex, moveShotGroup, moveShot]);

  const handleShotUpdate = useCallback((shotId: string, updates: Partial<Shot>) => {
    updateShot(shotId, updates);
  }, [updateShot]);

  const handleShotDelete = useCallback((shotId: string) => {
    deleteShot(shotId);
  }, [deleteShot]);

  const handleAddSubShot = useCallback((shotId: string) => {
    addSubShot(pageId, shotId);
  }, [pageId, addSubShot]);

  const handleInsertShot = useCallback((shotId: string) => {
    const shotIndex = pageShots.findIndex(s => s.id === shotId);
    if (shotIndex !== -1) {
      addShot(pageId, shotIndex);
    }
  }, [pageShots, pageId, addShot]);

  const handleAddShot = useCallback((position?: number) => {
    addShot(pageId, position);
  }, [pageId, addShot]);

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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={pageShots.map(s => s.id)} strategy={rectSortingStrategy}>
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
        </SortableContext>
        <DragOverlay>
          {activeShot ? (
            <ShotCard
              shot={activeShot}
              onUpdate={() => {}}
              onDelete={() => {}}
              onAddSubShot={() => {}}
              onInsertShot={() => {}}
              isOverlay
              aspectRatio={aspectRatio}
              previewDimensions={previewDimensions}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
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
