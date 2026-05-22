import * as React from 'react';
import type { Shot, StoryboardPage } from '@/store';
import { MasterHeader } from '@/components/MasterHeader';
import { ShotGrid } from '@/components/ShotGrid';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { calculatePreviewDimensions } from '@/utils/export/previewDimensions';
import type { StoryboardTheme } from '@/styles/storyboardTheme';
import type { ServerPDFExportPayload } from '@/utils/types/exportTypes';
import { getFixedPageFrameHeight, resolvePageSizeMode, type PageSizeMode } from '@/utils/pageSize';

interface ExportStoryboardPageContentProps {
  page: StoryboardPage | null;
  pageShots: Shot[];
  storyboardTheme: StoryboardTheme;
  pageId: string;
  pageNumber: number;
  pageElementId: string;
  hideEmptySlots?: boolean;
  exportPayload?: ServerPDFExportPayload;
  pageSizeMode?: PageSizeMode;
}

// IMPORTANT: This component intentionally mirrors the live StoryboardPage inner content subtree.
// Do not simplify wrappers/classes/styles here, because export parity depends on this structure.
export const ExportStoryboardPageContent: React.FC<ExportStoryboardPageContentProps> = ({
  page,
  pageShots,
  storyboardTheme,
  pageId,
  pageNumber,
  pageElementId,
  hideEmptySlots = false,
  exportPayload,
  pageSizeMode
}) => {
  const previewDimensions = React.useMemo(() => {
    return calculatePreviewDimensions(page);
  }, [page]);
  const normalizedPageSizeMode = resolvePageSizeMode(pageSizeMode ?? exportPayload?.pageSizeMode);
  const fixedPageFrameHeight = getFixedPageFrameHeight(normalizedPageSizeMode);
  const isFixedPageMode = normalizedPageSizeMode !== 'dynamic';

  if (!page) {
    return (
      <div className="flex items-center justify-center h-64">
        Page not found
      </div>
    );
  }

  const pageStyle = {
    height: fixedPageFrameHeight ? `${fixedPageFrameHeight}px` : 'min-content',
    display: isFixedPageMode ? 'flex' : undefined,
    flexDirection: isFixedPageMode ? 'column' : undefined,
    overflow: isFixedPageMode ? 'hidden' : 'visible',
    fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    '--inline-bg-color': storyboardTheme.contentBackground,
    '--inline-border-radius': '6px'
  } satisfies React.CSSProperties & Record<'--inline-bg-color' | '--inline-border-radius', string>;

  return (
    <div
      id={pageElementId}
      className="shadow-lg overflow-visible relative z-20 storyboard-themeable"
      style={pageStyle}
    >
      <MasterHeader readOnly exportPayload={exportPayload} />
      <div className={isFixedPageMode ? 'p-1 flex-1 min-h-0' : 'p-1'}>
        <SortableContext items={pageShots.map(s => s.id)} strategy={rectSortingStrategy}>
          <ShotGrid
            pageId={pageId}
            previewDimensions={previewDimensions}
            pageNumberOverride={pageNumber}
            hideEmptySlots={hideEmptySlots}
            readOnly
            exportPayload={exportPayload}
            pageShotsOverride={pageShots}
            layoutOverride={{
              gridRows: page.gridRows,
              gridCols: page.gridCols,
              aspectRatio: page.aspectRatio
            }}
            onShotUpdate={() => {}}
            onShotDelete={() => {}}
            onAddShot={() => {}}
            onAddSubShot={() => {}}
          />
        </SortableContext>
      </div>
    </div>
  );
};
