import { useAppStore } from '@/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Grid3X3 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { buttonVariants } from './ui/button';
import { cn } from '@/lib/utils';
import { getToolbarContainerStyles, TOOLBAR_STYLES } from '@/styles/toolbar-styles';

interface GridSizeSelectorProps {
  pageId: string;
}

export const GridSizeSelector: React.FC<GridSizeSelectorProps> = ({ pageId }) => {
  const { pages, updateGridSize } = useAppStore();
  const page = pages.find(p => p.id === pageId);

  if (!page) return null;

  const { gridRows, gridCols } = page;

  const handleRowsChange = (value: string) => {
    updateGridSize(pageId, parseInt(value), gridCols);
  };

  const handleColsChange = (value: string) => {
    updateGridSize(pageId, gridRows, parseInt(value));
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(TOOLBAR_STYLES.containerClasses)}
          style={getToolbarContainerStyles()}
        >
          <Grid3X3 size={16} className={TOOLBAR_STYLES.iconClasses} />
          <div className="flex items-center gap-1">
            <Select value={gridCols.toString()} onValueChange={handleColsChange}>
              <SelectTrigger className={TOOLBAR_STYLES.selectTriggerClasses}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={TOOLBAR_STYLES.selectContentClasses}>
                  {Array.from({ length: 8 }, (_, i) => i + 1).map(num => (
                  <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
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
                  <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Grid Layout (All Pages)</p>
      </TooltipContent>
    </Tooltip>
  );
};
