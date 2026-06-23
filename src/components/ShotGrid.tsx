import * as React from 'react';
import { useCallback } from 'react';
import { ShotCard } from './ShotCard';
import { Shot, useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getColor } from '@/styles/glassmorphism-styles';
import type { ServerPDFExportPayload } from '@/utils/types/exportTypes';
import { RENDERED_PAGE_WIDTH_PX } from '@/utils/pageSize';
import { getStoryboardHeaderAlignmentInsetCss } from '@/utils/storyboardLayout';

interface ShotGridProps {
  pageId: string;
  className?: string;
  previewDimensions: { width: number; imageHeight: number; gap: number };
  // Export-only overrides (additive). Live editor keeps default behavior when omitted.
  pageNumberOverride?: number;
  hideEmptySlots?: boolean;
  readOnly?: boolean;
  layoutOverride?: { gridRows: number; gridCols: number; aspectRatio: string };
  onShotUpdate: (shotId: string, updates: Partial<Shot>) => void;
  onShotDelete: (shotId: string) => void;
  onAddShot: (pageId: string, position?: number) => void;
  onAddSubShot: (pageId: string, shotId: string) => void;
  onInsertBatch?: (shotId: string) => void;
  onEditImage?: (shot: Shot) => void;
  exportPayload?: ServerPDFExportPayload;
  pageShotsOverride?: Shot[];
}

const ConnectedShotGrid: React.FC<ShotGridProps> = ({ 
  pageId, 
  className, 
  previewDimensions,
  pageNumberOverride,
  hideEmptySlots = false,
  readOnly = false,
  layoutOverride,
  onShotUpdate,
  onShotDelete,
  onAddShot,
  onAddSubShot,
  onInsertBatch,
  onEditImage
}) => {
  const {
    pages,
    activePageId,
    pageSizeMode,
    templateSettings,
    storyboardTheme,
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

  const gridContext = layoutOverride || activePage;
  if (!gridContext) {
    return (
      <div
        className="flex items-center justify-center h-64"
        style={{ color: getColor('text', 'muted') as string }}
      >
        Page not found
      </div>
    );
  }

  const { gridRows, gridCols, aspectRatio } = gridContext;
  const totalSlots = gridRows * gridCols;
  const emptySlotsCount = hideEmptySlots ? 0 : Math.max(0, totalSlots - pageShots.length);
  const resolvedPageNumber = pageNumberOverride ?? (activePageIndex !== -1 ? activePageIndex + 1 : null);
  const isFixedPageMode = pageSizeMode !== 'dynamic';
  const footerAlignmentInset = getStoryboardHeaderAlignmentInsetCss(gridCols);

  return (
    <div
      className={cn(
        'w-full shot-grid',
        className,
        isFixedPageMode && 'h-full flex flex-col'
      )}
    >
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
          width: `${RENDERED_PAGE_WIDTH_PX}px`,
          maxWidth: `${RENDERED_PAGE_WIDTH_PX}px`,
          minWidth: `${RENDERED_PAGE_WIDTH_PX}px`,
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
            onEditImage={onEditImage ? () => onEditImage(shot) : undefined}
            aspectRatio={aspectRatio}
            previewDimensions={previewDimensions}
            readOnly={readOnly}
          />
        ))}
        
        {/* Empty Slots */}
        {Array.from({ length: emptySlotsCount }).map((_, index) => (
          <div
            key={`empty-${index}`}
            className={cn(
              "rounded-lg flex items-center justify-center transition-colors group",
              !readOnly && "cursor-pointer",
              "border-0"
            )}
            style={{
              width: `${previewDimensions.width}px`,
              minHeight: `${previewDimensions.imageHeight + 80}px`,
              flex: 'none'
            }}
            onClick={() => {
              if (!readOnly) {
                handleAddShot();
              }
            }}
          >
            <div 
              className="text-center transition-all"
              style={{
                background: getColor('background', 'subtle') as string,
                color: getColor('text', 'muted') as string,
                padding: '12px 12px',
                borderRadius: '6px',
                display: 'inline-block'
              }}
            >
              <Plus size={20} className="mx-auto mb-0" style={{ color: 'inherit' }} />
              <span className={cn(
                "font-medium",
                "text-xs"
              )} style={{ color: 'inherit' }}>Add Shot</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer */}
      {templateSettings.showPageNumber && (
        <div 
          className="mt-2"
          style={{
            width: `${RENDERED_PAGE_WIDTH_PX}px`,
            maxWidth: `${RENDERED_PAGE_WIDTH_PX}px`,
            margin: isFixedPageMode ? 'auto auto 0' : '8px auto 0',
            flexShrink: 0
          }}
        >
          <div 
            className="px-6 py-3"
            style={{
              paddingLeft: footerAlignmentInset,
              paddingRight: footerAlignmentInset,
              paddingTop: '12px',
              paddingBottom: '12px'
            }}
          >
            <div 
              className="flex items-center justify-end text-xs"
              style={{
                fontSize: '10px',
                lineHeight: '1.2',
                color: storyboardTheme.header.text
              }}
            >
              {resolvedPageNumber !== null && (
                <div>
                  Page {resolvedPageNumber}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ExportShotGrid: React.FC<ShotGridProps> = ({
  className,
  previewDimensions,
  pageNumberOverride,
  hideEmptySlots = false,
  readOnly = false,
  layoutOverride,
  onAddShot,
  exportPayload,
  pageShotsOverride = [],
}) => {
  if (!exportPayload || !layoutOverride) {
    return null;
  }

  const templateSettings = exportPayload.template;
  const storyboardTheme = exportPayload.theme;
  const { gridRows, gridCols, aspectRatio } = layoutOverride;
  const totalSlots = gridRows * gridCols;
  const emptySlotsCount = hideEmptySlots ? 0 : Math.max(0, totalSlots - pageShotsOverride.length);
  const resolvedPageNumber = pageNumberOverride ?? exportPayload.page.pageNumber;
  const footerAlignmentInset = getStoryboardHeaderAlignmentInsetCss(gridCols);

  return (
    <div className={cn('w-full shot-grid', className)}>
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
          width: `${RENDERED_PAGE_WIDTH_PX}px`,
          maxWidth: `${RENDERED_PAGE_WIDTH_PX}px`,
          minWidth: `${RENDERED_PAGE_WIDTH_PX}px`,
          margin: '0 auto',
          flexShrink: 0
        }}
      >
        {pageShotsOverride.map((shot) => (
          <ShotCard
            key={shot.id}
            shot={shot}
            onUpdate={() => {}}
            onDelete={() => {}}
            onAddSubShot={() => {}}
            onInsertShot={() => {}}
            aspectRatio={aspectRatio}
            previewDimensions={previewDimensions}
            readOnly
            exportPayload={exportPayload}
          />
        ))}

        {Array.from({ length: emptySlotsCount }).map((_, index) => (
          <div
            key={`empty-${index}`}
            className={cn(
              "rounded-lg flex items-center justify-center transition-colors group",
              !readOnly && "cursor-pointer",
              "border-0"
            )}
            style={{
              width: `${previewDimensions.width}px`,
              minHeight: `${previewDimensions.imageHeight + 80}px`,
              flex: 'none'
            }}
            onClick={() => {
              if (!readOnly) {
                onAddShot(exportPayload.page.id);
              }
            }}
          >
            <div
              className="text-center transition-all"
              style={{
                background: getColor('background', 'subtle') as string,
                color: getColor('text', 'muted') as string,
                padding: '12px 12px',
                borderRadius: '6px',
                display: 'inline-block'
              }}
            >
              <Plus size={20} className="mx-auto mb-0" style={{ color: 'inherit' }} />
              <span className={cn(
                "font-medium",
                "text-xs"
              )} style={{ color: 'inherit' }}>Add Shot</span>
            </div>
          </div>
        ))}
      </div>

      {templateSettings.showPageNumber && (
        <div
          className="mt-2"
          style={{
            width: `${RENDERED_PAGE_WIDTH_PX}px`,
            maxWidth: `${RENDERED_PAGE_WIDTH_PX}px`,
            margin: '8px auto 0',
            flexShrink: 0
          }}
        >
          <div
            className="px-6 py-3"
            style={{
              paddingLeft: footerAlignmentInset,
              paddingRight: footerAlignmentInset,
              paddingTop: '12px',
              paddingBottom: '12px'
            }}
          >
            <div
              className="flex items-center justify-end text-xs"
              style={{
                fontSize: '10px',
                lineHeight: '1.2',
                color: storyboardTheme.header.text
              }}
            >
              {resolvedPageNumber !== null && (
                <div>
                  Page {resolvedPageNumber}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ShotGrid: React.FC<ShotGridProps> = (props) => {
  if (props.exportPayload) {
    return <ExportShotGrid {...props} />;
  }

  return <ConnectedShotGrid {...props} />;
};
