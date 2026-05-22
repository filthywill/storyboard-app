import { useAppStore } from '@/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayoutGrid } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { buttonVariants } from './ui/button';
import { cn } from '@/lib/utils';
import { getToolbarContainerStyles, TOOLBAR_STYLES } from '@/styles/toolbar-styles';
import { isGridLayoutValidForPageSize } from '@/utils/pageSize';

interface GridSizeSelectorProps {
  pageId: string;
}

export const GridSizeSelector: React.FC<GridSizeSelectorProps> = ({ pageId }) => {
  const { pages, updateGridSize, pageSizeMode, templateSettings } = useAppStore();
  const page = pages.find(p => p.id === pageId);

  if (!page) return null;

  const { gridRows, gridCols } = page;
  const isFixedPageMode = pageSizeMode !== 'dynamic';

  const isGridOptionValid = (rows: number, cols: number) =>
    isGridLayoutValidForPageSize({
      pageSizeMode,
      gridRows: rows,
      gridCols: cols,
      aspectRatio: page.aspectRatio,
      showPageNumber: templateSettings.showPageNumber,
    });

  const handleRowsChange = (value: string) => {
    const nextRows = parseInt(value, 10);
    if (!isGridOptionValid(nextRows, gridCols)) {
      return;
    }
    updateGridSize(pageId, nextRows, gridCols);
  };

  const handleColsChange = (value: string) => {
    const nextCols = parseInt(value, 10);
    if (!isGridOptionValid(gridRows, nextCols)) {
      return;
    }
    updateGridSize(pageId, gridRows, nextCols);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(TOOLBAR_STYLES.containerClasses)}
          style={getToolbarContainerStyles()}
        >
          <LayoutGrid size={16} className={TOOLBAR_STYLES.iconClasses} />
          <div className="flex items-center gap-1">
            <Select value={gridCols.toString()} onValueChange={handleColsChange}>
              <SelectTrigger className={TOOLBAR_STYLES.selectTriggerClasses}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={TOOLBAR_STYLES.selectContentClasses}>
                  {Array.from({ length: 8 }, (_, i) => i + 1).map(num => (
                  <SelectItem
                    key={num}
                    value={num.toString()}
                    disabled={isFixedPageMode && !isGridOptionValid(gridRows, num)}
                  >
                    {num}
                  </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            <span className={`text-sm ${TOOLBAR_STYLES.mutedTextClasses}`}>×</span>
            <Select value={gridRows.toString()} onValueChange={handleRowsChange}>
              <SelectTrigger className={TOOLBAR_STYLES.selectTriggerClasses}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={TOOLBAR_STYLES.selectContentClasses}>
                  {Array.from({ length: 8 }, (_, i) => i + 1).map(num => (
                  <SelectItem
                    key={num}
                    value={num.toString()}
                    disabled={isFixedPageMode && !isGridOptionValid(num, gridCols)}
                  >
                    {num}
                  </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Grid Layout</p>
      </TooltipContent>
    </Tooltip>
  );
};
