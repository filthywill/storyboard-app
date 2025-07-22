import { useAppStore } from '@/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Grid3X3 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { buttonVariants } from './ui/button';
import { cn } from '@/lib/utils';

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
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'flex items-center justify-between p-2 gap-2 h-10'
          )}
        >
          <Grid3X3 size={16} />
          <div className="flex items-center gap-1">
            <Select value={gridCols.toString()} onValueChange={handleColsChange}>
              <SelectTrigger className="h-7 w-[50px] border-none shadow-none bg-transparent focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 8 }, (_, i) => i + 1).map(num => (
                  <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            <span className="text-sm text-muted-foreground">×</span>
            <Select value={gridRows.toString()} onValueChange={handleRowsChange}>
              <SelectTrigger className="h-7 w-[50px] border-none shadow-none bg-transparent focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
