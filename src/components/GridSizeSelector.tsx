
import React from 'react';
import { useStoryboardStore } from '@/store/storyboardStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Grid3X3, RotateCcw } from 'lucide-react';

interface GridSizeSelectorProps {
  pageId: string;
}

export const GridSizeSelector: React.FC<GridSizeSelectorProps> = ({ pageId }) => {
  const { pages, updateGridSize } = useStoryboardStore();
  const page = pages.find(p => p.id === pageId);

  if (!page) return null;

  const { gridRows, gridCols } = page;

  const handleRowsChange = (value: string) => {
    updateGridSize(pageId, parseInt(value), gridCols);
  };

  const handleColsChange = (value: string) => {
    updateGridSize(pageId, gridRows, parseInt(value));
  };

  const resetToDefault = () => {
    updateGridSize(pageId, 3, 4);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Grid3X3 size={16} />
          Grid Size
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">Rows</label>
            <Select value={gridRows.toString()} onValueChange={handleRowsChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 8 }, (_, i) => i + 1).map(num => (
                  <SelectItem key={num} value={num.toString()}>
                    {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">Columns</label>
            <Select value={gridCols.toString()} onValueChange={handleColsChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 8 }, (_, i) => i + 1).map(num => (
                  <SelectItem key={num} value={num.toString()}>
                    {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-gray-500">
            {gridCols} × {gridRows} = {gridCols * gridRows} shots
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefault}
            className="text-xs"
          >
            <RotateCcw size={12} className="mr-1" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
