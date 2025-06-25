import React from 'react';
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
import { Shot, useStoryboardStore } from '@/store/storyboardStore';
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
    updateShot,
    deleteShot,
    addShot,
    reorderShots,
    setIsDragging
  } = useStoryboardStore();

  const page = pages.find(p => p.id === pageId);
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

  if (!page) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Page not found
      </div>
    );
  }

  const { shots, gridRows, gridCols, aspectRatio } = page;
  const totalSlots = gridRows * gridCols;
  const emptySlotsCount = Math.max(0, totalSlots - shots.length);

  const handleDragStart = (event: DragStartEvent) => {
    const shot = shots.find(s => s.id === event.active.id);
    setActiveShot(shot || null);
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveShot(null);
    setIsDragging(false);

    if (!over || active.id === over.id) return;

    const oldIndex = shots.findIndex(shot => shot.id === active.id);
    const newIndex = shots.findIndex(shot => shot.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Create new order
    const newShotIds = [...shots.map(s => s.id)];
    const [movedId] = newShotIds.splice(oldIndex, 1);
    newShotIds.splice(newIndex, 0, movedId);

    reorderShots(pageId, newShotIds);
  };

  const handleShotUpdate = (shotId: string, updates: Partial<Shot>) => {
    updateShot(pageId, shotId, updates);
  };

  const handleShotDelete = (shotId: string) => {
    deleteShot(pageId, shotId);
  };

  const handleAddShot = (position?: number) => {
    addShot(pageId, position);
  };

  return (
    <div className={cn('w-full', className)}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={shots.map(s => s.id)} strategy={rectSortingStrategy}>
          <div
            className={cn(
              'grid gap-4 w-full'
            )}
            style={{
              gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${gridRows}, minmax(200px, auto))`
            }}
          >
            {/* Existing Shots */}
            {shots.map((shot) => (
              <ShotCard
                key={shot.id}
                shot={shot}
                onUpdate={(updates) => handleShotUpdate(shot.id, updates)}
                onDelete={() => handleShotDelete(shot.id)}
                aspectRatio={aspectRatio}
              />
            ))}

            {/* Empty Slots */}
            {Array.from({ length: emptySlotsCount }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center hover:border-gray-300 transition-colors group cursor-pointer"
                style={{
                  aspectRatio: aspectRatio?.replace('/', ' / ') || '16 / 9',
                  minHeight: '200px'
                }}
                onClick={() => handleAddShot()}
              >
                <div className="text-center text-gray-400 group-hover:text-gray-600 transition-colors">
                  <Plus size={32} className="mx-auto mb-2" />
                  <span className="text-sm font-medium">Add Shot</span>
                </div>
              </div>
            ))}
          </div>
        </SortableContext>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeShot ? (
            <ShotCard
              shot={activeShot}
              onUpdate={() => {}}
              onDelete={() => {}}
              isOverlay
              aspectRatio={aspectRatio}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Quick Add Button */}
      {shots.length < totalSlots && (
        <div className="mt-6 text-center">
          <Button 
            onClick={() => handleAddShot()}
            variant="outline"
            className="hover:bg-blue-50 hover:border-blue-300"
          >
            <Plus size={16} className="mr-2" />
            Add Shot
          </Button>
        </div>
      )}
    </div>
  );
};
