import { useCallback, useMemo, useState } from 'react';
import { useAppStore } from '@/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';
import { getLayoutToolbarContainerStyles, TOOLBAR_STYLES } from '@/styles/toolbar-styles';
import {
  PAGE_SIZE_MODE_OPTIONS,
  getMaxValidRowsForPageSize,
  getPageSizeSpec,
  isGridLayoutValidForPageSize,
  isPageSizeMode,
  type PageSizeMode,
} from '@/utils/pageSize';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

export const PageSizeModeSelector: React.FC = () => {
  const { pageSizeMode, setPageSizeMode, updateGridSize, pages, activePageId, templateSettings } = useAppStore();
  const activePage = pages.find((page) => page.id === activePageId) ?? null;
  const [pendingSwitch, setPendingSwitch] = useState<{
    mode: PageSizeMode;
    adjustedRows: number;
  } | null>(null);

  const getModeFitState = useCallback((mode: PageSizeMode): { valid: boolean; maxValidRows: number } => {
    if (!activePage) {
      return { valid: true, maxValidRows: 0 };
    }

    const valid = isGridLayoutValidForPageSize({
      pageSizeMode: mode,
      gridRows: activePage.gridRows,
      gridCols: activePage.gridCols,
      aspectRatio: activePage.aspectRatio,
      showPageNumber: templateSettings.showPageNumber,
    });

    const maxValidRows = getMaxValidRowsForPageSize({
      pageSizeMode: mode,
      gridCols: activePage.gridCols,
      aspectRatio: activePage.aspectRatio,
      showPageNumber: templateSettings.showPageNumber,
      maxRowsToEvaluate: Math.max(activePage.gridRows, 8),
    });

    return { valid, maxValidRows };
  }, [activePage, templateSettings.showPageNumber]);

  const modeFitStateByMode = useMemo(() => {
    return {
      dynamic: getModeFitState('dynamic'),
      'letter-portrait': getModeFitState('letter-portrait'),
      'letter-landscape': getModeFitState('letter-landscape'),
    } satisfies Record<PageSizeMode, { valid: boolean; maxValidRows: number }>;
  }, [getModeFitState]);

  const isModeDisabled = (mode: PageSizeMode): boolean => {
    if (mode === 'dynamic' || !activePage) {
      return false;
    }

    const fitState = modeFitStateByMode[mode];
    if (fitState.valid) {
      return false;
    }

    return fitState.maxValidRows <= 0;
  };

  const handleModeChange = (value: string) => {
    if (!isPageSizeMode(value) || isModeDisabled(value)) {
      return;
    }

    if (value === 'dynamic' || !activePage) {
      setPageSizeMode(value);
      return;
    }

    const fitState = modeFitStateByMode[value];
    if (fitState.valid) {
      setPageSizeMode(value);
      return;
    }

    setPendingSwitch({
      mode: value,
      adjustedRows: fitState.maxValidRows,
    });
  };

  const handleConfirmSwitch = () => {
    if (!pendingSwitch || !activePage) {
      setPendingSwitch(null);
      return;
    }

    setPageSizeMode(pendingSwitch.mode);
    updateGridSize(activePage.id, pendingSwitch.adjustedRows, activePage.gridCols);
    setPendingSwitch(null);
  };

  const pendingDialogText = useMemo(() => {
    if (!pendingSwitch || !activePage) {
      return '';
    }

    const pageSizeLabel = getPageSizeSpec(pendingSwitch.mode).label;
    return `${pageSizeLabel} can’t fit the current ${activePage.gridCols}×${activePage.gridRows} grid.
Switch to ${pageSizeLabel} and reduce the grid to ${activePage.gridCols}×${pendingSwitch.adjustedRows}?`;
  }, [pendingSwitch, activePage]);

  const handleCancelSwitch = () => {
    setPendingSwitch(null);
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(TOOLBAR_STYLES.containerClasses)}
            style={getLayoutToolbarContainerStyles()}
          >
            <Select value={pageSizeMode} onValueChange={handleModeChange}>
              <SelectTrigger
                className={cn(
                  "h-5 w-[90px] pl-2 pr-0 border-none shadow-none bg-transparent focus:ring-0 focus:outline-none toolbar-editable-hover hover:text-white text-white rounded-sm transition-colors"
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[130px]">
                {PAGE_SIZE_MODE_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={isModeDisabled(option.value)}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Page Size</p>
        </TooltipContent>
      </Tooltip>

      <Dialog open={Boolean(pendingSwitch)} onOpenChange={(open) => !open && handleCancelSwitch()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Grid for Page Size</DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              {pendingDialogText}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleCancelSwitch}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSwitch}>
              Switch and Adjust Grid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
