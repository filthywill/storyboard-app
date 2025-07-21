import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ShotGrid } from './ShotGrid';
import { GridSizeSelector } from './GridSizeSelector';
import { AspectRatioSelector } from './AspectRatioSelector';
import { StartNumberSelector } from './StartNumberSelector';
import { useAppStore, Shot } from '@/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileImage, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageTabs } from './PageTabs';
import { MasterHeader } from './MasterHeader';
import { TemplateSettings } from './TemplateSettings';
import { PDFExportModal } from './PDFExportModal';
import { exportManager } from '@/utils/export/exportManager';
import ErrorBoundary from './ErrorBoundary';
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
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { ShotCard } from './ShotCard';

interface StoryboardPageProps {
  pageId: string;
  className?: string;
}

export const StoryboardPage: React.FC<StoryboardPageProps> = ({ 
  pageId, 
  className 
}) => {
  const { 
    pages, 
    isExporting, 
    setIsExporting, 
    templateSettings,
    getPageById,
    getPageShots,
    shots,
    shotOrder,
    projectName,
    projectInfo,
    projectLogoUrl,
    projectLogoFile,
    clientAgency,
    updateShot,
    deleteShot,
    addShot,
    addSubShot,
    reorderShots,
    moveShot,
    moveShotGroup,
    getGlobalShotIndex,
    setIsDragging,
    insertShotIntoSubGroup,
    removeFromSubGroup,
    jobInfo
  } = useAppStore();
  
  const page = getPageById(pageId);
  const pageIndex = pages.findIndex(p => p.id === pageId);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [showPDFModal, setShowPDFModal] = useState(false);
  
  // Drag and drop state
  const [activeShot, setActiveShot] = React.useState<Shot | null>(null);
  const pageShots = getPageShots(pageId);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const updateLayout = () => {
      const { width: wrapperWidth } = wrapper.getBoundingClientRect();
      if (wrapperWidth > 0) {
        const wrapperPadding = 32;
        const availableWidth = wrapperWidth - wrapperPadding;
        const newScale = Math.max(availableWidth / 1000, 0.2);
        setScale(newScale);
        const contentHeight = content.scrollHeight;
        const newHeight = contentHeight * newScale + wrapperPadding;
        wrapper.style.height = `${newHeight}px`;
      }
    };

    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(wrapper);
    resizeObserver.observe(content);
    updateLayout();
    return () => {
      resizeObserver.disconnect();
      if (wrapper) {
        wrapper.style.height = '';
      }
    };
  }, [page, templateSettings]);

  // Drag and drop sensors
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

  // Calculate dimensions for shot grid (moved from ShotGrid)
  const previewDimensions = React.useMemo(() => {
    if (!page) return { width: 200, imageHeight: 100, gap: 8 };
    
    const { gridCols, aspectRatio } = page;
    const fixedWidth = 1000;
    const headerPadding = 16;
    const gridWrapperPadding = 4;
    const totalPadding = (headerPadding + gridWrapperPadding) * 2;
    const availableWidth = fixedWidth - totalPadding;
    const gaps = (gridCols - 1) * 8;
    const shotWidth = Math.floor((availableWidth - gaps) / gridCols);
    const cardContentPadding = 8 * 2;
    const imageBorder = 1 * 2;
    const imageContainerWidth = shotWidth - cardContentPadding - imageBorder;
    const [w, h] = aspectRatio.split('/').map(str => parseInt(str.trim(), 10));
    const imageHeight = Math.floor((imageContainerWidth * h) / w);
    return {
      width: shotWidth,
      imageHeight: imageHeight,
      gap: 8
    };
  }, [page]);

  // Helper function to detect if a shot should be inserted into a sub-shot group
  const shouldInsertIntoSubGroup = useCallback((activeShot: Shot, overShot: Shot, targetPosition: number): { shouldInsert: boolean; groupId?: string; insertPosition?: number } => {
    // Target shot must be part of a sub-shot group
    if (!overShot.subShotGroupId) {
      return { shouldInsert: false };
    }

    const overShotGlobalIndex = shotOrder.indexOf(overShot.id);
    
    if (overShotGlobalIndex === -1) {
      return { shouldInsert: false };
    }

    // Check if we're dropping into a sub-shot group by looking at surrounding shots
    const prevShotIndex = overShotGlobalIndex - 1;
    const nextShotIndex = overShotGlobalIndex + 1;
    
    // Check if the previous shot is in the same sub-shot group
    const prevShotInSameGroup = prevShotIndex >= 0 && (() => {
      const prevShotId = shotOrder[prevShotIndex];
      const prevShot = shots[prevShotId];
      return prevShot && prevShot.subShotGroupId === overShot.subShotGroupId;
    })();
    
    // Check if the next shot is in the same sub-shot group
    const nextShotInSameGroup = nextShotIndex < shotOrder.length && (() => {
      const nextShotId = shotOrder[nextShotIndex];
      const nextShot = shots[nextShotId];
      return nextShot && nextShot.subShotGroupId === overShot.subShotGroupId;
    })();
    
    // Insert into sub-shot group if:
    // 1. We're dropping between two shots in the same sub-shot group, OR
    // 2. We're dropping a shot from before the sub-shot group into the group
    if (prevShotInSameGroup || nextShotInSameGroup) {
      return { 
        shouldInsert: true, 
        groupId: overShot.subShotGroupId,
        insertPosition: targetPosition
      };
    }

    return { shouldInsert: false };
  }, [shots, shotOrder]);

  // Helper function to determine if we should move the entire group or just the individual shot
  const shouldMoveEntireGroup = useCallback((activeShot: Shot): boolean => {
    if (!activeShot.subShotGroupId) {
      return false; // Standard shots are always moved individually
    }

    // Find the first shot in the sub-shot group
    const groupShots = Object.values(shots).filter(
      shot => shot.subShotGroupId === activeShot.subShotGroupId
    );
    
    if (groupShots.length === 0) {
      return false;
    }

    // Sort by global order to find the first shot in the group
    const sortedGroupShots = groupShots.sort((a, b) => {
      const aIndex = shotOrder.indexOf(a.id);
      const bIndex = shotOrder.indexOf(b.id);
      return aIndex - bIndex;
    });

    // Only move the entire group if we're dragging the first shot in the group
    return sortedGroupShots[0].id === activeShot.id;
  }, [shots, shotOrder]);

  // Drag handlers
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

    const activeShot = pageShots.find(shot => shot.id === active.id);
    const overShot = pageShots.find(shot => shot.id === over.id);

    if (!activeShot || !overShot) return;

    const targetPosition = getGlobalShotIndex(overShot.id);
    
    if (targetPosition === -1) return;

    // Check if we should insert the active shot into a sub-shot group
    const insertInfo = shouldInsertIntoSubGroup(activeShot, overShot, targetPosition);
    
    if (insertInfo.shouldInsert && insertInfo.groupId && insertInfo.insertPosition !== undefined) {
      // Insert the shot into the sub-shot group
      insertShotIntoSubGroup(activeShot.id, insertInfo.groupId, insertInfo.insertPosition);
    } else {
      // Normal drag behavior - determine if we should move the entire group or just the individual shot
      if (activeShot.subShotGroupId && shouldMoveEntireGroup(activeShot)) {
        // Move the entire sub-shot group
        moveShotGroup(activeShot.subShotGroupId, targetPosition);
      } else {
        // Move individual shot (this includes sub-shots being moved independently)
        moveShot(activeShot.id, targetPosition);
        
        // If this was a sub-shot being moved to a position outside its group,
        // we need to remove it from the sub-shot group
        if (activeShot.subShotGroupId && !insertInfo.shouldInsert) {
          // The shot is being moved outside its sub-shot group
          // The moveShot operation will handle the position change,
          // and we need to remove it from the sub-shot group
          removeFromSubGroup(activeShot.id);
        }
      }
    }
  }, [pageShots, setIsDragging, getGlobalShotIndex, moveShot, moveShotGroup, shouldInsertIntoSubGroup, shouldMoveEntireGroup, insertShotIntoSubGroup, removeFromSubGroup, shots]);

  if (!page) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Page Not Found
            </h3>
            <p className="text-gray-600">
              The requested storyboard page could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleExportPNG = async () => {
    if (!page) {
      toast.error('No active page to export.');
      return;
    }

    try {
      setIsExporting(true);
      
      // Convert new format to old format for export compatibility
      const pageShots = getPageShots(pageId);
      const legacyPage = {
        ...page,
        shots: pageShots // Convert from shot IDs to shot objects
      };
      
      const legacyState = {
        pages: pages.map(p => ({
          ...p,
          shots: getPageShots(p.id)
        })),
        activePageId: pageId,
        startNumber: '01', // TODO: Add startNumber to project store
        projectName,
        projectInfo,
        projectLogoUrl,
        projectLogoFile,
        clientAgency,
        jobInfo,
        isDragging: false,
        isExporting: false,
        showDeleteConfirmation: false,
        templateSettings
      };
      
      await exportManager.downloadPage(
        legacyPage,
        legacyState,
        `${page.name}_export_${Date.now()}.png`,
        { scale: 2, quality: 0.95 }
      );
      toast.success(`Exported ${page.name} as PNG`);
    } catch (error) {
      console.error('PNG export failed:', error);
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    setShowPDFModal(true);
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <GridSizeSelector pageId={pageId} />
            <AspectRatioSelector pageId={pageId} />
            <StartNumberSelector />
            <TemplateSettings />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportPNG}
            disabled={isExporting}
            className="hover:bg-blue-50"
          >
            <FileImage size={16} className="mr-2" />
            Export PNG
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="hover:bg-green-50"
          >
            <FileText size={16} className="mr-2" />
            Export PDF
          </Button>
        </div>
      </div>
      
      <PageTabs />

      <ErrorBoundary>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
      <div 
        ref={wrapperRef}
        className={cn(
          "w-full flex justify-center bg-gray-100 p-4 rounded-lg"
        )}
        style={{ transition: 'height 0.2s ease-out' }}
      >
        <div 
          ref={contentRef}
          id={`storyboard-page-${pageId}`}
          className={cn(
            "bg-white rounded-md shadow-lg border border-gray-200 overflow-visible"
          )}
          style={{
            height: 'min-content',
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          <MasterHeader />
          <div className='p-1'>
          <SortableContext items={pageShots.map(s => s.id)} strategy={rectSortingStrategy}>
            <ShotGrid 
              pageId={pageId} 
              previewDimensions={previewDimensions}
              onShotUpdate={updateShot}
              onShotDelete={deleteShot}
              onAddShot={addShot}
              onAddSubShot={addSubShot}
            />
          </SortableContext>
          </div>
        </div>
      </div>
      <DragOverlay>
        {activeShot ? (
          <ShotCard
            shot={activeShot}
            onUpdate={() => {}}
            onDelete={() => {}}
            onAddSubShot={() => {}}
            onInsertShot={() => {}}
            isOverlay
            aspectRatio={page?.aspectRatio || '16/9'}
            previewDimensions={previewDimensions}
          />
        ) : null}
      </DragOverlay>
      </DndContext>
      </ErrorBoundary>

      <PDFExportModal
        isOpen={showPDFModal}
        onClose={() => setShowPDFModal(false)}
        currentPageIndex={pageIndex}
      />
    </div>
  );
};
